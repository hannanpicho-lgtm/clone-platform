import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface PremiumAssignment {
  userId: string;
  userEmail: string;
  userName: string;
  assignment: {
    amount: number;
    position: number;
    assignedAt: string;
  };
  currentBalance: number;
  accountFrozen: boolean;
  freezeAmount: number;
}

interface PremiumAnalytics {
  totalAssignments: number;
  totalPremiumValue: number;
  averageValue: number;
  frozenAccounts: number;
  unfrozenAccounts: number;
  assignments: Array<{
    userId: string;
    amount: number;
    position: number;
    assignedAt: string;
    isFrozen: boolean;
  }>;
}

interface GlobalPremiumConfig {
  enabled: boolean;
  position: number;
  amount: number;
  updatedAt?: string | null;
}

const ADMIN_API_KEY = localStorage.getItem('adminApiKey') || '';
const FUNCTION_BASE = `${(import.meta.env.VITE_SUPABASE_URL || 'https://tpxgfjevorhdtwkesvcb.supabase.co').replace(/\/$/, '')}/functions/v1/make-server-44a642d3`;

export function PremiumManagementPanel() {
  const [assignments, setAssignments] = useState<PremiumAssignment[]>([]);
  const [analytics, setAnalytics] = useState<PremiumAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [globalConfig, setGlobalConfig] = useState<GlobalPremiumConfig>({
    enabled: true,
    position: 27,
    amount: 10000,
    updatedAt: null,
  });

  // Form states for assigning new premium
  const [formUserId, setFormUserId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPosition, setFormPosition] = useState('');

  // Load premium assignments
  const loadAssignments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${FUNCTION_BASE}/admin/premium/list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ADMIN_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (data.success) {
        setAssignments(data.assignments);
      } else {
        setError(data.error || 'Failed to load assignments');
      }
    } catch (err) {
      setError(`Error loading assignments: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Load analytics
  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${FUNCTION_BASE}/admin/premium/analytics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ADMIN_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        setError(data.error || 'Failed to load analytics');
      }
    } catch (err) {
      setError(`Error loading analytics: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Assign premium product
  const handleAssignPremium = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${FUNCTION_BASE}/admin/premium`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ADMIN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: formUserId,
          amount: parseFloat(formAmount),
          position: parseInt(formPosition),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage(`✓ Premium product assigned to ${data.user.name}`);
        setFormUserId('');
        setFormAmount('');
        setFormPosition('');
        await loadAssignments();
      } else {
        setError(data.error || 'Failed to assign premium');
      }
    } catch (err) {
      setError(`Error assigning premium: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Revoke premium assignment
  const handleRevoke = async (userId: string) => {
    if (!confirm(`Revoke premium assignment for user ${userId}?`)) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${FUNCTION_BASE}/admin/premium/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ADMIN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage(`✓ Premium assignment revoked`);
        await loadAssignments();
      } else {
        setError(data.error || 'Failed to revoke premium');
      }
    } catch (err) {
      setError(`Error revoking premium: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
    loadAnalytics();
    loadGlobalConfig();
  }, []);

  const loadGlobalConfig = async () => {
    try {
      const res = await fetch(`${FUNCTION_BASE}/premium/global-config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (data.success && data.config) {
        setGlobalConfig({
          enabled: Boolean(data.config.enabled),
          position: Number(data.config.position) || 27,
          amount: Number(data.config.amount) || 10000,
          updatedAt: data.config.updatedAt || null,
        });
      }
    } catch {
      // Keep default config if fetch fails
    }
  };

  const handleSaveGlobalConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        enabled: Boolean(globalConfig.enabled),
        position: Number(globalConfig.position),
        amount: Number(globalConfig.amount),
      };

      const res = await fetch(`${FUNCTION_BASE}/admin/premium/global-config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${ADMIN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setGlobalConfig({
          enabled: Boolean(data.config.enabled),
          position: Number(data.config.position),
          amount: Number(data.config.amount),
          updatedAt: data.config.updatedAt || null,
        });
        setMessage('✓ Global premium trigger updated');
      } else {
        setError(data.error || 'Failed to update global premium trigger');
      }
    } catch (err) {
      setError(`Error updating global premium trigger: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalAssignments || 0}</div>
            <p className="text-xs text-gray-500">active premium products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics?.totalPremiumValue?.toFixed(2) || '0'}</div>
            <p className="text-xs text-gray-500">in premium assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Frozen Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics?.frozenAccounts || 0}</div>
            <p className="text-xs text-gray-500">awaiting top-up</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Average Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics?.averageValue?.toFixed(2) || '0'}</div>
            <p className="text-xs text-gray-500">per assignment</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Premium Trigger</CardTitle>
          <CardDescription>
            Set one premium encounter rule that applies to every user account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveGlobalConfig} className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                id="globalPremiumEnabled"
                type="checkbox"
                checked={globalConfig.enabled}
                onChange={(e) => setGlobalConfig({ ...globalConfig, enabled: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="globalPremiumEnabled" className="text-sm font-medium">
                Enable premium encounter trigger
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Encounter Position</label>
                <Input
                  type="number"
                  min="1"
                  value={String(globalConfig.position)}
                  onChange={(e) => setGlobalConfig({ ...globalConfig, position: Number(e.target.value || 0) })}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Example: 10 means premium on the 10th submission.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Premium Amount ($)</label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={String(globalConfig.amount)}
                  onChange={(e) => setGlobalConfig({ ...globalConfig, amount: Number(e.target.value || 0) })}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              {loading ? 'Saving...' : 'Save Global Trigger'}
            </Button>

            {globalConfig.updatedAt && (
              <p className="text-xs text-gray-500">Last updated: {new Date(globalConfig.updatedAt).toLocaleString()}</p>
            )}
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="assign" className="w-full">
        <TabsList>
          <TabsTrigger value="assign">Assign Premium</TabsTrigger>
          <TabsTrigger value="active">Active Assignments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Assign Premium Tab */}
        <TabsContent value="assign" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assign New Premium Product</CardTitle>
              <CardDescription>Assign a premium product to a user</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssignPremium} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">User ID</label>
                  <Input
                    value={formUserId}
                    onChange={(e) => setFormUserId(e.target.value)}
                    placeholder="Enter user ID"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="e.g., 10000"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Position (Rank)</label>
                    <Input
                      type="number"
                      value={formPosition}
                      onChange={(e) => setFormPosition(e.target.value)}
                      placeholder="e.g., 1"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Assigning...' : 'Assign Premium Product'}
                </Button>
              </form>

              {message && (
                <Alert className="mt-4 border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">{message}</AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert className="mt-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Assignments Tab */}
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Premium Assignments</CardTitle>
              <CardDescription>{assignments.length} users with premium products</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading assignments...</div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No premium assignments yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assign) => (
                        <TableRow key={assign.userId}>
                          <TableCell className="font-medium">{assign.userName}</TableCell>
                          <TableCell className="text-sm">{assign.userEmail}</TableCell>
                          <TableCell className="font-bold">${assign.assignment.amount.toFixed(2)}</TableCell>
                          <TableCell>#{assign.assignment.position}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                assign.accountFrozen
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {assign.accountFrozen ? 'Frozen' : 'Active'}
                            </span>
                          </TableCell>
                          <TableCell>${assign.currentBalance.toFixed(2)}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(assign.assignment.assignedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRevoke(assign.userId)}
                              disabled={loading}
                            >
                              Revoke
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {message && (
                <Alert className="mt-4 border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">{message}</AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert className="mt-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Premium Product Analytics</CardTitle>
              <CardDescription>Historical premium assignments</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading analytics...</div>
              ) : analytics ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Assignments</p>
                      <p className="text-3xl font-bold">{analytics.totalAssignments}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Value</p>
                      <p className="text-3xl font-bold">${analytics.totalPremiumValue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Average Value</p>
                      <p className="text-3xl font-bold">${analytics.averageValue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Frozen / Active</p>
                      <p className="text-3xl font-bold">
                        {analytics.frozenAccounts} / {analytics.unfrozenAccounts}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Recent Assignments</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User ID</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Assigned Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.assignments.slice(0, 10).map((assign) => (
                            <TableRow key={assign.userId}>
                              <TableCell className="font-medium">{assign.userId.slice(0, 8)}...</TableCell>
                              <TableCell className="font-bold">${assign.amount.toFixed(2)}</TableCell>
                              <TableCell>#{assign.position}</TableCell>
                              <TableCell>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    assign.isFrozen
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {assign.isFrozen ? 'Frozen' : 'Active'}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">
                                {new Date(assign.assignedAt).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : null}

              {error && (
                <Alert className="mt-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
