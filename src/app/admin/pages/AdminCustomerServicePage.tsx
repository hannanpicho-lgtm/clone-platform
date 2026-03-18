import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, MessageSquare } from 'lucide-react';
import { fetchAdminSupportTickets, markSupportTicketRead, replySupportTicket, updateSupportTicketStatus } from '../api';
import { hasAdminPermission } from '../permissions';
import type { AdminSession, AdminSupportMessage, AdminSupportTicket } from '../types';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';

interface AdminCustomerServicePageProps {
  session: AdminSession;
}

export function AdminCustomerServicePage({ session }: AdminCustomerServicePageProps) {
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const canManageSupport = hasAdminPermission(session, 'support.manage');

  const load = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError('');
    try {
      const nextTickets = await fetchAdminSupportTickets(session);
      setTickets(nextTickets);
      if (!selectedTicketId && nextTickets.length > 0) {
        setSelectedTicketId(nextTickets[0].id);
      }
      if (selectedTicketId && !nextTickets.find((item) => item.id === selectedTicketId) && nextTickets.length > 0) {
        setSelectedTicketId(nextTickets[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support tickets');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    load();
  }, [session]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      load(true);
    }, 8000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [session, selectedTicketId]);

  const filtered = useMemo(() => {
    if (filter === 'all') return tickets;
    return tickets.filter((ticket) => ticket.status === filter);
  }, [filter, tickets]);

  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) return filtered[0] || null;
    return filtered.find((ticket) => ticket.id === selectedTicketId) || null;
  }, [filtered, selectedTicketId]);

  const selectedThread = useMemo(() => {
    if (!selectedTicket) return [] as AdminSupportMessage[];
    const baseMessage: AdminSupportMessage | null = selectedTicket.message
      ? {
          id: `${selectedTicket.id}_initial`,
          userId: selectedTicket.userId || undefined,
          userName: selectedTicket.userName,
          message: selectedTicket.message,
          createdAt: selectedTicket.createdAt || selectedTicket.updatedAt,
          role: 'user',
        }
      : null;

    const replies = Array.isArray(selectedTicket.replies) ? selectedTicket.replies : [];
    const thread = baseMessage ? [baseMessage, ...replies] : [...replies];
    const deduped = new Map<string, AdminSupportMessage>();
    for (const item of thread) {
      if (!item?.id) continue;
      if (!deduped.has(item.id)) {
        deduped.set(item.id, item);
      }
    }
    return Array.from(deduped.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [selectedTicket]);

  const unreadTotal = useMemo(() => {
    return tickets.reduce((sum, ticket) => sum + Number(ticket.unreadCount || 0), 0);
  }, [tickets]);

  const markRead = async (ticketId: string) => {
    try {
      await markSupportTicketRead(session, ticketId);
      setTickets((prev) => prev.map((ticket) => (
        ticket.id === ticketId
          ? { ...ticket, unreadByAdmin: false, unreadCount: 0 }
          : ticket
      )));
    } catch {
      // Avoid interrupting inbox flow if read-mark call fails.
    }
  };

  useEffect(() => {
    if (selectedTicket && Number(selectedTicket.unreadCount || 0) > 0) {
      markRead(selectedTicket.id);
    }
  }, [selectedTicket?.id]);

  const handleStatus = async (ticketId: string, status: 'in_progress' | 'resolved') => {
    try {
      setSavingId(ticketId);
      setError('');
      setMessage('');
      await updateSupportTicketStatus(session, ticketId, status);
      setMessage('Ticket status updated.');
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket status');
    } finally {
      setSavingId(null);
    }
  };

  const handleReply = async (ticketId: string) => {
    const messageDraft = String(drafts[ticketId] || '').trim();
    if (!messageDraft) {
      setError('Reply message is required.');
      return;
    }

    try {
      setSavingId(ticketId);
      setError('');
      setMessage('');
      await replySupportTicket(session, ticketId, messageDraft);
      setDrafts((prev) => ({ ...prev, [ticketId]: '' }));
      setMessage('Reply sent successfully.');
      await markRead(ticketId);
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Customer Service</h1>
        <p className="text-sm text-slate-500">Inbox workflow with unread tracking, live polling, and threaded replies.</p>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Support Cases</CardTitle>
              <CardDescription>Unread alerts sync every 8 seconds. Total unread messages: {unreadTotal}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All ({tickets.length})</Button>
              <Button type="button" size="sm" variant={filter === 'open' ? 'default' : 'outline'} onClick={() => setFilter('open')}>Open ({tickets.filter((t) => t.status === 'open').length})</Button>
              <Button type="button" size="sm" variant={filter === 'in_progress' ? 'default' : 'outline'} onClick={() => setFilter('in_progress')}>In Progress ({tickets.filter((t) => t.status === 'in_progress').length})</Button>
              <Button type="button" size="sm" variant={filter === 'resolved' ? 'default' : 'outline'} onClick={() => setFilter('resolved')}>Resolved ({tickets.filter((t) => t.status === 'resolved').length})</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => load()}>Refresh</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!canManageSupport && <div className="text-sm text-amber-700">Permission required: support.manage</div>}
          {message && <div className="text-sm text-green-600">{message}</div>}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No tickets in this filter.</div>
          )}

          {filtered.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
                {filtered.map((ticket) => {
                  const active = (selectedTicket?.id || selectedTicketId) === ticket.id;
                  const unread = Number(ticket.unreadCount || 0);
                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      className={`w-full rounded-md border p-3 text-left transition ${active ? 'border-slate-900 bg-slate-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{ticket.userName}</div>
                          <div className="text-xs text-slate-600">{ticket.subject}</div>
                        </div>
                        {unread > 0 ? (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>{new Date(ticket.updatedAt).toLocaleString()}</span>
                        <span>{ticket.status.replace('_', ' ')}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                {!selectedTicket ? (
                  <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-sm text-slate-500">
                    <MessageSquare className="h-5 w-5" />
                    Select a ticket to view the conversation thread.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{selectedTicket.id} | {selectedTicket.userName}</div>
                        <div className="text-sm text-slate-600">{selectedTicket.subject}</div>
                        <div className="text-xs text-slate-500">Priority: {selectedTicket.priority} | Replies: {selectedTicket.repliesCount}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white" disabled={!canManageSupport || savingId === selectedTicket.id} onClick={() => handleStatus(selectedTicket.id, 'in_progress')}>
                          In Progress
                        </Button>
                        <Button type="button" size="sm" className="bg-green-600 hover:bg-green-700 text-white" disabled={!canManageSupport || savingId === selectedTicket.id} onClick={() => handleStatus(selectedTicket.id, 'resolved')}>
                          Resolve
                        </Button>
                        <Badge variant={selectedTicket.status === 'resolved' ? 'secondary' : 'default'}>{selectedTicket.status.replace('_', ' ')}</Badge>
                      </div>
                    </div>

                    <div className="max-h-[380px] space-y-2 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3">
                      {selectedThread.map((entry) => {
                        const isAdmin = entry.role === 'admin';
                        return (
                          <div key={entry.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${isAdmin ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 border border-slate-200'}`}>
                              <div className={`mb-1 text-xs ${isAdmin ? 'text-slate-300' : 'text-slate-500'}`}>
                                {entry.userName} • {new Date(entry.createdAt).toLocaleString()}
                              </div>
                              <div className="whitespace-pre-wrap break-words">{entry.message}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      <Textarea
                        value={drafts[selectedTicket.id] || ''}
                        onChange={(event) => setDrafts((prev) => ({ ...prev, [selectedTicket.id]: event.target.value }))}
                        placeholder="Type reply to user..."
                        rows={3}
                        disabled={!canManageSupport}
                      />
                      <div className="flex justify-end">
                        <Button type="button" disabled={!canManageSupport || savingId === selectedTicket.id} onClick={() => handleReply(selectedTicket.id)}>
                          Send Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
