import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, CheckCircle, Clock, X } from 'lucide-react';

interface WithdrawalFormProps {
  accessToken: string;
  currentBalance?: number;
  onSuccess?: () => void;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
  approvedAt?: string;
  deniedAt?: string;
  denialReason?: string;
}

const BASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';

export function WithdrawalForm({ accessToken, currentBalance = 0, onSuccess }: WithdrawalFormProps) {
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch withdrawal history
  const fetchWithdrawalHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await fetch(`${BASE_URL}/make-server-44a642d3/withdrawal-history`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (data.withdrawals) {
        setWithdrawalHistory(data.withdrawals.sort((a: any, b: any) => 
          new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
        ));
      }
    } catch (err) {
      console.error('Error fetching withdrawal history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load history on mount
  useEffect(() => {
    fetchWithdrawalHistory();
    const interval = setInterval(fetchWithdrawalHistory, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    const withdrawAmount = parseFloat(amount);
    if (!amount || withdrawAmount <= 0) {
      setError('Please enter a valid amount greater than $0');
      return;
    }

    if (withdrawAmount > currentBalance) {
      setError(`Insufficient balance. Available: $${currentBalance.toFixed(2)}`);
      return;
    }

    if (!password) {
      setError('Please enter your withdrawal password');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/make-server-44a642d3/request-withdrawal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          amount: withdrawAmount,
          withdrawalPassword: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to submit withdrawal request');
        return;
      }

      setSuccess(`Withdrawal of $${withdrawAmount.toFixed(2)} requested successfully! Admin approval required.`);
      setAmount('');
      setPassword('');
      
      // Refresh history after successful request
      await fetchWithdrawalHistory();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError('Failed to submit withdrawal request. Please try again.');
      console.error('Withdrawal error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 border-green-300';
      case 'pending':
        return 'bg-yellow-50 border-yellow-300';
      case 'denied':
        return 'bg-red-50 border-red-300';
      default:
        return 'bg-gray-50';
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium';
    switch (status) {
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-700`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-700`;
      case 'denied':
        return `${baseClasses} bg-red-100 text-red-700`;
      default:
        return baseClasses;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  const pendingCount = withdrawalHistory.filter(w => w.status === 'pending').length;
  const approvedAmount = withdrawalHistory
    .filter(w => w.status === 'approved')
    .reduce((sum, w) => sum + w.amount, 0);

  return (
    <div className="space-y-6">
      {/* Withdrawal Form */}
      <Card className="p-6 bg-white border-orange-200">
        <h3 className="text-lg font-semibold mb-4 text-orange-600">Request Withdrawal</h3>

        {error && (
          <Alert className="mb-4 border-red-300 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-300 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount" className="text-gray-700 font-medium">
              Withdrawal Amount ($)
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">Balance: ${currentBalance.toFixed(2)}</span>
            </div>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              max={currentBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount to withdraw"
              className="mt-2 border-orange-200 focus:border-orange-400"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-gray-700 font-medium">
              Withdrawal Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your withdrawal password"
              className="mt-2 border-orange-200 focus:border-orange-400"
            />
            <p className="text-xs text-gray-500 mt-1">You set this when you signed up</p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium"
          >
            {loading ? 'Processing...' : 'Request Withdrawal'}
          </Button>
        </form>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <p className="text-xs text-gray-600 uppercase font-semibold">Pending Requests</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{pendingCount}</p>
          <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
        </Card>
        <Card className="p-4 border-green-200 bg-green-50">
          <p className="text-xs text-gray-600 uppercase font-semibold">Approved Amount</p>
          <p className="text-2xl font-bold text-green-700 mt-1">${approvedAmount.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Total approved</p>
        </Card>
      </div>

      {/* Withdrawal History */}
      <Card className="p-6 bg-white border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Withdrawal History</h3>

        {historyLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : withdrawalHistory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No withdrawal history yet</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {withdrawalHistory.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className={`p-4 border rounded-lg ${getStatusColor(withdrawal.status)}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-700">${withdrawal.amount.toFixed(2)}</p>
                      <span className={getStatusBadge(withdrawal.status)}>
                        {withdrawal.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                        {withdrawal.status === 'pending' && <Clock className="w-3 h-3" />}
                        {withdrawal.status === 'denied' && <X className="w-3 h-3" />}
                        {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Requested: {formatDate(withdrawal.requestedAt)}
                    </p>
                    {withdrawal.approvedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Approved: {formatDate(withdrawal.approvedAt)}
                      </p>
                    )}
                    {withdrawal.denialReason && (
                      <p className="text-xs text-red-600 mt-1">
                        Reason: {withdrawal.denialReason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
