import { useEffect, useMemo, useState } from 'react';
import { Bell, DollarSign, LifeBuoy, Link2, TrendingUp, UserPlus, Users, Zap } from 'lucide-react';
import { fetchAdminAlerts, fetchAdminAuditLog, fetchAdminSupportTickets, fetchAdminUsers, fetchInvitationCodes } from '../api';
import { hasAdminPermission, isSuperAdmin } from '../permissions';
import type { AdminAlertItem, AdminAlertsSummary, AdminAuditLogItem, AdminMetrics, AdminSession, AdminSupportTicket, AdminUserRecord } from '../types';
import { AdminEmptyState } from '../components/AdminEmptyState';
import { AdminFeedback } from '../components/AdminFeedback';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { projectId } from '../../../../utils/supabase/info';

interface AdminDashboardPageProps {
  session: AdminSession;
}

interface AdminCryptoInvoice {
  invoiceId: string;
  paymentId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  network: string;
  expiresAt: string;
}

const EMPTY_METRICS: AdminMetrics = {
  totalUsers: 0,
  totalRevenue: 0,
  totalTransactions: 0,
  activeUsers: 0,
  frozenAccounts: 0,
  totalCommissionsPaid: 0,
};

function formatDate(value: string) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

function formatAuditAction(action: string) {
  return action.replace(/[._]/g, ' ');
}

export function AdminDashboardPage({ session }: AdminDashboardPageProps) {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics>(EMPTY_METRICS);
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [auditLog, setAuditLog] = useState<AdminAuditLogItem[]>([]);
  const [alerts, setAlerts] = useState<AdminAlertItem[]>([]);
  const [alertsSummary, setAlertsSummary] = useState<AdminAlertsSummary>({
    total: 0,
    actionRequired: 0,
    pendingWithdrawals: 0,
    openSupportTickets: 0,
    frozenAccounts: 0,
    critical: 0,
    high: 0,
  });
  const [activeInvitationCount, setActiveInvitationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [cryptoAsset, setCryptoAsset] = useState('BTC');
  const [cryptoNetwork, setCryptoNetwork] = useState('Bitcoin');
  const [cryptoInvoice, setCryptoInvoice] = useState<AdminCryptoInvoice | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [invoiceCountdown, setInvoiceCountdown] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [
          { users: nextUsers, metrics: nextMetrics },
          nextTickets,
          nextAudit,
          invitationCodes,
          alertPayload,
        ] = await Promise.all([
          fetchAdminUsers(session),
          fetchAdminSupportTickets(session),
          fetchAdminAuditLog(session, 12),
          fetchInvitationCodes(session).catch(() => []),
          fetchAdminAlerts(session).catch(() => ({
            alerts: [],
            summary: {
              total: 0,
              actionRequired: 0,
              pendingWithdrawals: 0,
              openSupportTickets: 0,
              frozenAccounts: 0,
              critical: 0,
              high: 0,
            },
          })),
        ]);

        if (cancelled) return;
        setUsers(nextUsers);
        setMetrics(nextMetrics);
        setTickets(nextTickets);
        setAuditLog(nextAudit);
        setActiveInvitationCount(invitationCodes.filter((item) => item.status === 'active').length);
        setAlerts(alertPayload.alerts);
        setAlertsSummary(alertPayload.summary);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load admin dashboard');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const activeSubscriptions = useMemo(
    () => users.filter((user) => user.vipTier !== 'Normal' && !user.accountDisabled).length,
    [users],
  );
  const newUsers = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return users.filter((user) => new Date(user.createdAt).getTime() >= cutoff).length;
  }, [users]);
  const openTickets = useMemo(() => tickets.filter((ticket) => ticket.status !== 'resolved').length, [tickets]);
  const canManageInvitations = hasAdminPermission(session, 'invitations.manage');
  const canManageSupport = hasAdminPermission(session, 'support.manage');
  const canManageWithdrawals = hasAdminPermission(session, 'withdrawals.manage');

  useEffect(() => {
    if (!cryptoInvoice?.expiresAt) {
      setInvoiceCountdown(0);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.floor((new Date(cryptoInvoice.expiresAt).getTime() - Date.now()) / 1000));
      setInvoiceCountdown(remaining);
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [cryptoInvoice?.expiresAt]);

  const countdownMinutes = Math.floor(invoiceCountdown / 60);
  const countdownSeconds = invoiceCountdown % 60;
  const countdownLabel = `${String(countdownMinutes).padStart(2, '0')}:${String(countdownSeconds).padStart(2, '0')}`;
  const invoiceQrData = cryptoInvoice
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${cryptoInvoice.payAddress}?amount=${cryptoInvoice.payAmount}`)}`
    : '';

  const createCryptoInvoice = async () => {
    const amount = Number(cryptoAmount || 0);
    if (!targetUserId.trim()) {
      setError('Target user ID is required for admin crypto invoice generation.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount to create a crypto invoice.');
      return;
    }

    try {
      setError('');
      setIsCreatingInvoice(true);
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/api/crypto/create-invoice`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: targetUserId.trim(),
          amount,
          asset: cryptoAsset,
          network: cryptoNetwork,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error || 'Failed to create crypto invoice');
        return;
      }

      setCryptoInvoice(payload?.invoice || null);
    } catch {
      setError('Unable to create crypto invoice right now');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const stats = [
    {
      key: 'active-subs',
      title: 'Active Subs',
      value: activeSubscriptions,
      icon: TrendingUp,
      description: 'Users currently on paid tiers',
    },
    {
      key: 'new-users',
      title: 'New Users (7d)',
      value: newUsers,
      icon: UserPlus,
      description: 'New signups over the last week',
    },
    {
      key: 'support',
      title: 'Open Support',
      value: openTickets,
      icon: LifeBuoy,
      description: 'Tickets needing admin attention',
    },
    {
      key: 'invites',
      title: 'Active Invite Codes',
      value: activeInvitationCount,
      icon: Link2,
      description: 'Invitation system status',
    },
    {
      key: 'commissions',
      title: 'Commissions Paid',
      value: `$${metrics.totalCommissionsPaid.toFixed(2)}`,
      icon: Zap,
      description: 'Lifetime total',
    },
    ...(isSuperAdmin(session)
      ? [{
          key: 'revenue',
          title: 'Revenue Snapshot',
          value: `$${metrics.totalRevenue.toFixed(2)}`,
          icon: DollarSign,
          description: 'Visible only to super-admin',
        }]
      : [{
          key: 'active-users',
          title: 'Active Users',
          value: metrics.activeUsers,
          icon: Users,
          description: 'Enabled and unfrozen accounts',
        }]),
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Admin Dashboard" description="Protected with admin route middleware and backend RBAC checks." />

      {error && <AdminFeedback error={error} />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key} className="border-slate-200 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{loading ? '...' : stat.value}</div>
                <p className="mt-1 text-xs text-slate-500">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Legacy operational shortcuts mapped to routed admin pages.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => { window.location.href = '/admin/users'; }}>Manage Users</Button>
          <Button type="button" variant="outline" onClick={() => { window.location.href = '/admin/premium'; }}>Assign Premium</Button>
          {canManageInvitations && <Button type="button" variant="outline" onClick={() => { window.location.href = '/admin/invitations'; }}>Invitation Codes</Button>}
          {canManageWithdrawals && <Button type="button" variant="outline" onClick={() => { window.location.href = '/admin/withdrawals'; }}>Review Withdrawals</Button>}
          {canManageSupport && <Button type="button" variant="outline" onClick={() => { window.location.href = '/admin/customer-service'; }}>Customer Service</Button>}
          <Button type="button" variant="outline" onClick={() => { window.location.reload(); }}>Refresh Data</Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Critical Alerts</CardTitle>
          <CardDescription>Action required: {alertsSummary.actionRequired}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <AdminEmptyState message="Loading alerts…" />
          ) : alerts.length === 0 ? (
            <AdminEmptyState message="No active alerts." />
          ) : (
            alerts.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{item.title}</div>
                  <Badge variant={item.severity === 'critical' || item.severity === 'high' ? 'destructive' : 'outline'}>
                    {item.severity}
                  </Badge>
                </div>
                <div className="mt-1 text-sm text-slate-600">{item.message}</div>
                <div className="mt-1 text-xs text-slate-500">{formatDate(item.createdAt)}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Support Queue</CardTitle>
            <CardDescription>Sub-admins can access this view; billing actions remain hidden.</CardDescription>
          </CardHeader>
          <CardContent>
          {/* Mobile card list: shown on < md */}
          <div className="space-y-2 md:hidden">
            {tickets.slice(0, 6).map((ticket) => (
              <div key={ticket.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{ticket.userName}</div>
                  <Badge variant={ticket.status === 'resolved' ? 'secondary' : 'default'}>
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="mt-0.5 text-sm text-slate-600 line-clamp-1">{ticket.subject}</div>
                <div className="mt-0.5 text-xs text-slate-500">{formatDate(ticket.updatedAt)}</div>
              </div>
            ))}
            {!loading && tickets.length === 0 && <AdminEmptyState message="No support tickets available." />}
          </div>

          {/* Desktop table: hidden on < md */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.slice(0, 6).map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.userName}</TableCell>
                    <TableCell>{ticket.subject}</TableCell>
                    <TableCell>
                      <Badge variant={ticket.status === 'resolved' ? 'secondary' : 'default'}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">{formatDate(ticket.updatedAt)}</TableCell>
                  </TableRow>
                ))}
                {!loading && tickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-500">
                      No support tickets available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Recent Audit Activity</CardTitle>
            <CardDescription>Who changed what, when, and against which target record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditLog.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium capitalize">{formatAuditAction(item.action)}</div>
                  <Badge variant="outline">{item.actorType === 'super_admin' ? 'Super-admin' : 'Sub-admin'}</Badge>
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Target: {item.targetIdentifier || item.targetUserId || 'N/A'}
                </div>
                <div className="text-xs text-slate-500">{formatDate(item.createdAt)}</div>
              </div>
            ))}
            {!loading && auditLog.length === 0 && <AdminEmptyState message="No audit entries yet." />}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Pay with Crypto</CardTitle>
          <CardDescription>Create BTC, ETH, or USDT invoice and share the temporary wallet address.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Input value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} placeholder="Target user ID" />
            <Input type="number" min="1" step="0.01" value={cryptoAmount} onChange={(event) => setCryptoAmount(event.target.value)} placeholder="Amount (USD)" />
            <select
              value={cryptoAsset}
              onChange={(event) => setCryptoAsset(event.target.value)}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm"
            >
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="USDT">USDT</option>
            </select>
            <Input value={cryptoNetwork} onChange={(event) => setCryptoNetwork(event.target.value)} placeholder="Network (e.g. TRC20)" />
          </div>

          <Button type="button" onClick={createCryptoInvoice} disabled={isCreatingInvoice}>
            {isCreatingInvoice ? 'Creating...' : 'Generate Crypto Invoice'}
          </Button>

          {cryptoInvoice && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="grid gap-4 md:grid-cols-[220px,1fr]">
                <img src={invoiceQrData} alt="Crypto invoice QR code" className="h-[220px] w-[220px] rounded border border-emerald-200 bg-white p-2" />
                <div className="space-y-2 text-sm">
                  <p><strong>Address:</strong></p>
                  <p className="break-all rounded border border-emerald-200 bg-white px-3 py-2 text-xs">{cryptoInvoice.payAddress}</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(cryptoInvoice.payAddress);
                      } catch {
                        setError('Unable to copy invoice address');
                      }
                    }}
                  >
                    Copy Address
                  </Button>
                  <p><strong>Amount:</strong> {Number(cryptoInvoice.payAmount || 0).toFixed(8)} {cryptoInvoice.payCurrency.toUpperCase()}</p>
                  <p><strong>Expires In:</strong> {countdownLabel}</p>
                  <p className="font-medium text-emerald-800">Send exactly this amount from your wallet.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}