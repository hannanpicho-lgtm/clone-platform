import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, CheckCircle, Clock, DollarSign, Users } from 'lucide-react';

interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
}

interface AdminWithdrawalDashboardProps {
  adminKey: string;
}

const BASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';

export function AdminWithdrawalDashboard({ adminKey }: AdminWithdrawalDashboardProps) {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [approveModal, setApproveModal] = useState<{ id: string; userName: string; amount: number } | null>(null);
  const [denyModal, setDenyModal] = useState<{ id: string; userName: string; amount: number } | null>(null);
  const [denyReason, setDenyReason] = useState('');
  
  // Processing states
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch pending withdrawals
  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${BASE_URL}/make-server-44a642d3/admin/withdrawals`, {
        headers: { 'x-admin-key': adminKey },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to fetch withdrawals');
        return;
      }
      
      setWithdrawals(data.withdrawals || []);
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
      setError('Failed to fetch withdrawals');
    } finally {
      setLoading(false);
    }
  };

  // Load withdrawals on mount and set up auto-refresh
  useEffect(() => {
    fetchWithdrawals();
    const interval = setInterval(fetchWithdrawals, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [adminKey]);

  // Handle approve
  const handleApprove = async (withdrawalId: string) => {
    if (!approveModal) return;
    
    try {
      setProcessingId(withdrawalId);
      const response = await fetch(`${BASE_URL}/make-server-44a642d3/admin/approve-withdrawal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ withdrawalId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to approve withdrawal');
        return;
      }

      setSuccess(`✅ Approved $${approveModal.amount.toFixed(2)} for ${approveModal.userName}`);
      setApproveModal(null);
      
      // Refresh list
      await fetchWithdrawals();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to approve withdrawal');
      console.error('Approval error:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle deny
  const handleDeny = async (withdrawalId: string) => {
    if (!denyModal) return;
    
    if (!denyReason.trim()) {
      setError('Please provide a reason for denial');
      return;
    }

    try {
      setProcessingId(withdrawalId);
      const response = await fetch(`${BASE_URL}/make-server-44a642d3/admin/deny-withdrawal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ 
          withdrawalId,
          denialReason: denyReason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to deny withdrawal');
        return;
      }

      setSuccess(`❌ Denied $${denyModal.amount.toFixed(2)} for ${denyModal.userName}`);
      setDenyModal(null);
      setDenyReason('');
      
      // Refresh list
      await fetchWithdrawals();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to deny withdrawal');
      console.error('Denial error:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const totalAmount = withdrawals.reduce((sum, w) => sum + w.amount, 0);
  const totalRequests = withdrawals.length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold">PENDING REQUESTS</p>
              <p className="text-3xl font-bold text-blue-700 mt-2">{totalRequests}</p>
            </div>
            <Clock className="w-12 h-12 text-blue-400 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold">TOTAL AMOUNT</p>
              <p className="text-3xl font-bold text-green-700 mt-2">${totalAmount.toFixed(2)}</p>
            </div>
            <DollarSign className="w-12 h-12 text-green-400 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold">AVG AMOUNT</p>
              <p className="text-3xl font-bold text-purple-700 mt-2">
                ${totalRequests > 0 ? (totalAmount / totalRequests).toFixed(2) : '0.00'}
              </p>
            </div>
            <Users className="w-12 h-12 text-purple-400 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Messages */}
      {error && (
        <Alert className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-300 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* Withdrawals Table */}
      <Card className="overflow-hidden border-gray-200">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700">Pending Withdrawal Requests</h3>
          <p className="text-sm text-gray-500 mt-1">
            {totalRequests === 0 ? 'No pending requests' : `${totalRequests} request${totalRequests !== 1 ? 's' : ''} awaiting approval`}
          </p>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : totalRequests === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No pending withdrawal requests</p>
            <p className="text-gray-400 text-sm mt-1">All withdrawal requests have been processed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-white">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">USER</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">EMAIL</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">AMOUNT</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">REQUESTED</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((withdrawal, idx) => (
                  <tr 
                    key={withdrawal.id}
                    className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{withdrawal.userName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-600 text-sm">{withdrawal.userEmail}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-semibold text-gray-900">${withdrawal.amount.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-600 text-sm">
                        {new Date(withdrawal.requestedAt).toLocaleDateString()} {new Date(withdrawal.requestedAt).toLocaleTimeString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-center">
                        <Button
                          onClick={() => setApproveModal({ 
                            id: withdrawal.id, 
                            userName: withdrawal.userName,
                            amount: withdrawal.amount 
                          })}
                          disabled={processingId === withdrawal.id}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded"
                        >
                          {processingId === withdrawal.id ? '...' : 'Approve'}
                        </Button>
                        <Button
                          onClick={() => setDenyModal({ 
                            id: withdrawal.id, 
                            userName: withdrawal.userName,
                            amount: withdrawal.amount 
                          })}
                          disabled={processingId === withdrawal.id}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded"
                        >
                          {processingId === withdrawal.id ? '...' : 'Deny'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Approve Confirmation Modal */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-white">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Approve Withdrawal?</h3>
              <div className="space-y-3 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">User: <span className="font-semibold text-gray-900">{approveModal.userName}</span></p>
                  <p className="text-sm text-gray-600 mt-1">Amount: <span className="font-semibold text-green-700">${approveModal.amount.toFixed(2)}</span></p>
                </div>
                <p className="text-sm text-gray-600">
                  This will deduct ${approveModal.amount.toFixed(2)} from the user's balance and mark the request as approved.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setApproveModal(null)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleApprove(approveModal.id)}
                  disabled={processingId !== null}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  {processingId ? 'Processing...' : 'Approve'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Deny Confirmation Modal */}
      {denyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-white">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Deny Withdrawal?</h3>
              <div className="space-y-4 mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">User: <span className="font-semibold text-gray-900">{denyModal.userName}</span></p>
                  <p className="text-sm text-gray-600 mt-1">Amount: <span className="font-semibold text-red-700">${denyModal.amount.toFixed(2)}</span></p>
                </div>
                <div>
                  <Label htmlFor="reason" className="text-gray-700 font-medium mb-2 block">Reason for Denial *</Label>
                  <Input
                    id="reason"
                    type="text"
                    value={denyReason}
                    onChange={(e) => setDenyReason(e.target.value)}
                    placeholder="e.g., Insufficient documentation"
                    className="border-red-200 focus:border-red-400"
                  />
                </div>
                <p className="text-sm text-gray-600">
                  The user's balance will remain unchanged, but they'll be notified of the denial.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setDenyModal(null);
                    setDenyReason('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleDeny(denyModal.id)}
                  disabled={!denyReason.trim() || processingId !== null}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId ? 'Processing...' : 'Deny'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-center text-xs text-gray-500">
        Auto-refreshing every 5 seconds
      </div>
    </div>
  );
}
