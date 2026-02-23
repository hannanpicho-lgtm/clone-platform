import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Gift, TrendingUp, Lock, CheckCircle2, Zap } from 'lucide-react';

interface Bonus {
  id: string;
  name: string;
  requirement: string;
  amount: number;
  category: string;
  claimed: boolean;
  eligible: boolean;
  status: 'claimed' | 'ready' | 'locked';
}

interface BonusStats {
  totalClaimable: number;
  totalClaimed: number;
  totalEarned: number;
  nextBonus: Bonus | null;
}

interface HistoryItem {
  bonusId: string;
  bonusName: string;
  amount: number;
  claimedAt: string;
  newBalance: number;
}

interface HistoryStats {
  totalBonusesEarned: number;
  totalBonusAmount: number;
  averageBonusAmount: number;
  lastClaimed: string | null;
}

interface BonusPayoutsProps {
  accessToken: string;
}

const BASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'tier': return 'from-purple-50 to-purple-100 border-purple-300';
    case 'network': return 'from-blue-50 to-blue-100 border-blue-300';
    case 'sales': return 'from-green-50 to-green-100 border-green-300';
    case 'volume': return 'from-yellow-50 to-yellow-100 border-yellow-300';
    case 'depth': return 'from-orange-50 to-orange-100 border-orange-300';
    default: return 'from-gray-50 to-gray-100 border-gray-300';
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'tier': return '👑';
    case 'network': return '👥';
    case 'sales': return '📦';
    case 'volume': return '💰';
    case 'depth': return '🌳';
    default: return '🎁';
  }
};

export function BonusPayouts({ accessToken }: BonusPayoutsProps) {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [stats, setStats] = useState<BonusStats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyStats, setHistoryStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');

  const fetchBonuses = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${BASE_URL}/make-server-44a642d3/bonus-payouts`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (data.bonuses) {
        setBonuses(data.bonuses);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching bonuses:', err);
      setError('Failed to load bonuses');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${BASE_URL}/make-server-44a642d3/bonus-payouts/history`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (data.history) {
        setHistory(data.history);
        setHistoryStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  useEffect(() => {
    fetchBonuses();
    fetchHistory();
    const interval = setInterval(() => {
      fetchBonuses();
      fetchHistory();
    }, 15000);
    return () => clearInterval(interval);
  }, [accessToken]);

  const handleClaimBonus = async (bonusId: string) => {
    try {
      setClaimingId(bonusId);
      const response = await fetch(`${BASE_URL}/make-server-44a642d3/bonus-payouts/claim`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bonusId }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage(data.message);
        fetchBonuses();
        fetchHistory();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.error || 'Failed to claim bonus');
      }
    } catch (err) {
      console.error('Error claiming bonus:', err);
      setError('Failed to claim bonus');
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error && bonuses.length === 0) {
    return (
      <Alert className="border-red-300 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700">{error}</AlertDescription>
      </Alert>
    );
  }

  const readyBonuses = bonuses.filter(b => b.status === 'ready');
  const claimedBonuses = bonuses.filter(b => b.status === 'claimed');
  const lockedBonuses = bonuses.filter(b => b.status === 'locked');

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <Alert className="border-green-300 bg-green-50 animate-pulse">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 font-semibold">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-300">
          <div>
            <p className="text-sm text-gray-600 font-semibold">READY TO CLAIM</p>
            <p className="text-4xl font-bold text-green-700 mt-2">{stats?.totalClaimable || 0}</p>
            <p className="text-xs text-gray-600 mt-2">bonus rewards waiting</p>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300">
          <div>
            <p className="text-sm text-gray-600 font-semibold">CLAIMED</p>
            <p className="text-4xl font-bold text-blue-700 mt-2">{stats?.totalClaimed || 0}</p>
            <p className="text-xs text-gray-600 mt-2">bonuses earned</p>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300">
          <div>
            <p className="text-sm text-gray-600 font-semibold">TOTAL EARNED</p>
            <p className="text-4xl font-bold text-purple-700 mt-2">${stats?.totalEarned || 0}</p>
            <p className="text-xs text-gray-600 mt-2">from bonuses</p>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300">
          <div>
            <p className="text-sm text-gray-600 font-semibold">NEXT MILESTONE</p>
            <p className="text-lg font-bold text-orange-700 mt-2">
              {stats?.nextBonus ? stats.nextBonus.name : 'All bonuses claimed!'}
            </p>
            {stats?.nextBonus && (
              <p className="text-xs text-gray-600 mt-2">{stats.nextBonus.requirement}</p>
            )}
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'available'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Available Bonuses ({bonuses.filter(b => b.status !== 'claimed').length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'history'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Claim History ({history.length})
        </button>
      </div>

      {/* Available Bonuses Tab */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          {readyBonuses.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Ready to Claim
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {readyBonuses.map((bonus) => (
                  <Card
                    key={bonus.id}
                    className={`p-6 border-2 bg-gradient-to-br ${getCategoryColor(bonus.category)} hover:shadow-lg transition-all`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl">{getCategoryIcon(bonus.category)}</span>
                      <span className="text-2xl font-bold text-green-600">${bonus.amount}</span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">{bonus.name}</h4>
                    <p className="text-sm text-gray-700 mt-2">{bonus.requirement}</p>
                    <button
                      onClick={() => handleClaimBonus(bonus.id)}
                      disabled={claimingId === bonus.id}
                      className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {claimingId === bonus.id ? 'Claiming...' : 'Claim Bonus'}
                    </button>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {claimedBonuses.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Already Claimed
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {claimedBonuses.map((bonus) => (
                  <Card key={bonus.id} className="p-6 bg-gray-50 border-gray-300">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl opacity-50">{getCategoryIcon(bonus.category)}</span>
                      <span className="text-2xl font-bold text-gray-400">${bonus.amount}</span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-700">{bonus.name}</h4>
                    <div className="flex items-center gap-2 mt-3 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <p className="text-sm font-semibold">Claimed</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {lockedBonuses.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-gray-500" />
                Locked Bonuses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lockedBonuses.slice(0, 3).map((bonus) => (
                  <Card key={bonus.id} className="p-6 bg-gray-100 border-gray-300 opacity-60">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl">{getCategoryIcon(bonus.category)}</span>
                      <span className="text-2xl font-bold text-gray-500">${bonus.amount}</span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-700">{bonus.name}</h4>
                    <p className="text-sm text-gray-600 mt-2">{bonus.requirement}</p>
                    <div className="flex items-center gap-2 mt-3 text-gray-500">
                      <Lock className="w-4 h-4" />
                      <p className="text-sm font-semibold">Locked</p>
                    </div>
                  </Card>
                ))}
              </div>
              {lockedBonuses.length > 3 && (
                <p className="text-center text-gray-600 mt-4 italic">
                  ...and {lockedBonuses.length - 3} more bonus(es) to unlock
                </p>
              )}
            </div>
          )}

          {bonuses.length === 0 && (
            <Card className="p-8 text-center bg-gray-50">
              <Gift className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No bonuses available yet</p>
            </Card>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {historyStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 bg-blue-50 border-blue-200">
                <p className="text-sm text-gray-600 font-semibold">TOTAL BONUSES EARNED</p>
                <p className="text-3xl font-bold text-blue-700 mt-2">{historyStats.totalBonusesEarned}</p>
              </Card>
              <Card className="p-6 bg-green-50 border-green-200">
                <p className="text-sm text-gray-600 font-semibold">TOTAL BONUS AMOUNT</p>
                <p className="text-3xl font-bold text-green-700 mt-2">${historyStats.totalBonusAmount}</p>
              </Card>
              <Card className="p-6 bg-purple-50 border-purple-200">
                <p className="text-sm text-gray-600 font-semibold">AVERAGE BONUS</p>
                <p className="text-3xl font-bold text-purple-700 mt-2">${historyStats.averageBonusAmount}</p>
              </Card>
            </div>
          )}

          {history.length > 0 ? (
            <Card className="p-6 bg-white border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Claims</h3>
              <div className="space-y-3">
                {history.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                      idx % 2 === 0 ? 'bg-gray-50 border-l-blue-500' : 'bg-white border-l-green-500'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{item.bonusName}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(item.claimedAt).toLocaleDateString()} at{' '}
                        {new Date(item.claimedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">+${item.amount}</p>
                      <p className="text-xs text-gray-600 mt-1">Balance: ${item.newBalance}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center bg-gray-50">
              <Gift className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No bonuses claimed yet. Claim your first bonus to see it here!</p>
            </Card>
          )}
        </div>
      )}

      {/* Tips Card */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          💡 Tips to Earn More Bonuses
        </h4>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>✓ Climb VIP tiers by increasing your total earnings</li>
          <li>✓ Invite more people to build your network</li>
          <li>✓ Submit more products to reach sales milestones</li>
          <li>✓ Build a deep referral tree for multi-level bonuses</li>
          <li>✓ Check back regularly as new bonuses unlock</li>
        </ul>
      </Card>
    </div>
  );
}
