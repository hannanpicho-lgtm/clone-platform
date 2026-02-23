import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Plus, MessageSquare, CheckCircle2, Clock, AlertTriangle, Send } from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  category: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved';
  createdAt: string;
  updatedAt: string;
  replies: Reply[];
}

interface Reply {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
}

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
}

interface SupportTicketsProps {
  accessToken: string;
}

const BASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'in-progress': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'resolved': return 'bg-green-100 text-green-800 border-green-300';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'text-red-600 font-bold';
    case 'high': return 'text-orange-600 font-semibold';
    case 'normal': return 'text-blue-600';
    case 'low': return 'text-gray-600';
    default: return 'text-gray-600';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'open': return <Clock className="w-4 h-4" />;
    case 'in-progress': return <AlertTriangle className="w-4 h-4" />;
    case 'resolved': return <CheckCircle2 className="w-4 h-4" />;
    default: return null;
  }
};

export function SupportTickets({ accessToken }: SupportTicketsProps) {
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newMessage, setNewMessage] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);

  // Reply state
  const [replyMessage, setReplyMessage] = useState('');
  const [replying, setReplying] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${BASE_URL}/make-server-44a642d3/support-tickets`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (data.tickets) {
        setTickets(data.tickets);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 10000);
    return () => clearInterval(interval);
  }, [accessToken]);

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      setError('Subject and message are required');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${BASE_URL}/make-server-44a642d3/support-tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: newSubject,
          category: newCategory,
          message: newMessage,
          priority: newPriority,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Support ticket created successfully!');
        setNewSubject('');
        setNewCategory('general');
        setNewMessage('');
        setNewPriority('normal');
        setView('list');
        fetchTickets();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.error || 'Failed to create ticket');
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
      setError('Failed to create support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    try {
      setReplying(true);
      const response = await fetch(`${BASE_URL}/make-server-44a642d3/support-tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: replyMessage }),
      });
      const data = await response.json();
      if (data.success) {
        setReplyMessage('');
        setSelectedTicket(data.ticket);
        fetchTickets();
      } else {
        setError(data.error || 'Failed to add reply');
      }
    } catch (err) {
      console.error('Error adding reply:', err);
      setError('Failed to add reply');
    } finally {
      setReplying(false);
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // CREATE TICKET VIEW
  if (view === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create New Support Ticket</h2>
          <button
            onClick={() => setView('list')}
            className="text-gray-600 hover:text-gray-900 font-semibold"
          >
            ✕ Back
          </button>
        </div>

        {error && (
          <Alert className="border-red-300 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        <Card className="p-8 bg-white border-gray-200">
          <div className="space-y-6">
            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Subject</label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Brief description of your issue"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General Question</option>
                  <option value="billing">Billing & Payments</option>
                  <option value="withdrawal">Withdrawal Issue</option>
                  <option value="product">Product Question</option>
                  <option value="referral">Referral Issue</option>
                  <option value="technical">Technical Problem</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Message</label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Describe your issue in detail"
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleCreateTicket}
                disabled={submitting}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Ticket'}
              </button>
              <button
                onClick={() => setView('list')}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // DETAIL VIEW
  if (view === 'detail' && selectedTicket) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{selectedTicket.subject}</h2>
            <p className="text-sm text-gray-600 mt-1">Ticket ID: {selectedTicket.id}</p>
          </div>
          <button
            onClick={() => {
              setView('list');
              setSelectedTicket(null);
            }}
            className="text-gray-600 hover:text-gray-900 font-semibold"
          >
            ✕ Back
          </button>
        </div>

        {error && (
          <Alert className="border-red-300 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Ticket Header Information */}
        <Card className="p-6 bg-gray-50 border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">Status</p>
              <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full border ${getStatusColor(selectedTicket.status)}`}>
                {getStatusIcon(selectedTicket.status)}
                <span className="font-semibold capitalize">{selectedTicket.status}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">Priority</p>
              <p className={`text-lg font-bold mt-2 capitalize ${getPriorityColor(selectedTicket.priority)}`}>
                {selectedTicket.priority}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">Category</p>
              <p className="text-lg font-semibold text-gray-900 mt-2 capitalize">{selectedTicket.category}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">Created</p>
              <p className="text-sm text-gray-900 mt-2">
                {new Date(selectedTicket.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>

        {/* Original Message */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <p className="text-sm text-gray-600 font-semibold mb-3">ORIGINAL MESSAGE</p>
          <p className="text-gray-900 whitespace-pre-wrap">{selectedTicket.message}</p>
        </Card>

        {/* Replies */}
        {selectedTicket.replies.length > 0 && (
          <Card className="p-6 bg-white border-gray-200">
            <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Conversation ({selectedTicket.replies.length})
            </h4>
            <div className="space-y-4">
              {selectedTicket.replies.map((reply) => (
                <div
                  key={reply.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-gray-900">{reply.userName}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(reply.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap">{reply.message}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Reply Box */}
        {selectedTicket.status !== 'resolved' && (
          <Card className="p-6 bg-white border-gray-200">
            <h4 className="text-lg font-bold text-gray-900 mb-4">Add Reply</h4>
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <button
              onClick={handleAddReply}
              disabled={replying || !replyMessage.trim()}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {replying ? 'Sending...' : 'Send Reply'}
            </button>
          </Card>
        )}
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
        <button
          onClick={() => setView('create')}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Ticket
        </button>
      </div>

      {successMessage && (
        <Alert className="border-green-300 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 font-semibold">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-blue-50 border-blue-300">
            <p className="text-sm text-gray-600 font-semibold">TOTAL</p>
            <p className="text-3xl font-bold text-blue-700 mt-2">{stats.total}</p>
          </Card>
          <Card className="p-4 bg-yellow-50 border-yellow-300">
            <p className="text-sm text-gray-600 font-semibold">OPEN</p>
            <p className="text-3xl font-bold text-yellow-700 mt-2">{stats.open}</p>
          </Card>
          <Card className="p-4 bg-orange-50 border-orange-300">
            <p className="text-sm text-gray-600 font-semibold">IN PROGRESS</p>
            <p className="text-3xl font-bold text-orange-700 mt-2">{stats.inProgress}</p>
          </Card>
          <Card className="p-4 bg-green-50 border-green-300">
            <p className="text-sm text-gray-600 font-semibold">RESOLVED</p>
            <p className="text-3xl font-bold text-green-700 mt-2">{stats.resolved}</p>
          </Card>
        </div>
      )}

      {/* Tickets List */}
      {tickets.length > 0 ? (
        <Card className="p-6 bg-white border-gray-200">
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => {
                  setSelectedTicket(ticket);
                  setView('detail');
                }}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900">{ticket.subject}</p>
                    <p className="text-sm text-gray-600 mt-1">Category: {ticket.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border font-semibold text-sm ${getStatusColor(
                        ticket.status
                      )}`}
                    >
                      {getStatusIcon(ticket.status)}
                      {ticket.status}
                    </span>
                    <span className={`font-bold capitalize ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  Created: {new Date(ticket.createdAt).toLocaleDateString()} | Replies: {ticket.replies.length}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center bg-gray-50">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No support tickets yet. Create one to get help!</p>
        </Card>
      )}
    </div>
  );
}
