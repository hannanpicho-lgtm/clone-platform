import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, TrendingUp } from 'lucide-react';

interface EarningsByLevel {
  [key: string]: number;
}

interface MultiLevelEarningsProps {
  accessToken: string;
}

const BASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';

export function MultiLevelEarnings({ accessToken }: MultiLevelEarningsProps) {
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${BASE_URL}/make-server-44a642d3/earnings-multilevel`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (data.earnings) {
        setEarnings(data.earnings);
      }
    } catch (err) {
      console.error('Error fetching earnings:', err);
      setError('Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
    const interval = setInterval(fetchEarnings, 5000);
    return () => clearInterval(interval);
  }, [accessToken]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-300 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700">{error}</AlertDescription>
      </Alert>
    );
  }

  if (!earnings) {
    return <div className="text-center py-8 text-gray-500">No earnings data</div>;
  }

  // Extract levels from byLevel object
  const levels = Object.entries(earnings.byLevel || {}).map(([key, value]) => ({
    level: parseInt(key.replace('level_', '')),
    amount: value as number,
  })).sort((a, b) => a.level - b.level);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <p className="text-xs uppercase font-semibold text-gray-600">Total Balance</p>
          <p className="text-2xl font-bold text-blue-700 mt-2">${earnings.balance.toFixed(2)}</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <p className="text-xs uppercase font-semibold text-gray-600">Total Earned</p>
          <p className="text-2xl font-bold text-green-700 mt-2">${earnings.totalEarned.toFixed(2)}</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <p className="text-xs uppercase font-semibold text-gray-600">Direct Children</p>
          <p className="text-2xl font-bold text-purple-700 mt-2">${earnings.fromDirectChildren.toFixed(2)}</p>
          <p className="text-xs text-gray-600 mt-1">{earnings.childCount} referral{earnings.childCount !== 1 ? 's' : ''}</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <p className="text-xs uppercase font-semibold text-gray-600">Indirect Referrals</p>
          <p className="text-2xl font-bold text-orange-700 mt-2">${earnings.fromIndirectReferrals.toFixed(2)}</p>
        </Card>
      </div>

      {/* Multi-Level Breakdown */}
      <Card className="p-6 bg-white border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Multi-Level Commission Breakdown</h3>
        </div>

        {levels.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No multi-level commissions yet</p>
            <p className="text-gray-400 text-sm mt-2">Earnings from your referral network will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {levels.map((level) => {
              const percentage = (level.amount / earnings.totalEarned * 100).toFixed(1);
              return (
                <div key={level.level} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                        {level.level}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {level.level === 1 ? 'Direct Parent' : level.level === 2 ? 'Grandparent' : level.level === 3 ? 'Great-Grandparent' : `Level ${level.level}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">Commission from referral network</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">${level.amount.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{percentage}% of total</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        level.level === 1 ? 'bg-green-500' :
                        level.level === 2 ? 'bg-blue-500' :
                        level.level === 3 ? 'bg-purple-500' :
                        'bg-orange-500'
                      }`}
                      style={{
                        width: `${Math.min(percentage, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Commission Structure Info */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-gray-900 mb-3">How Multi-Level Commissions Work</h4>
        <div className="space-y-2 text-sm text-gray-700">
          <p>💵 <strong>You earn 80%</strong> on every product you submit</p>
          <p>👤 <strong>Level 1 (Direct Parent) gets 20%</strong> of the product value</p>
          <p>👥 <strong>Level 2 (Grandparent) gets 2%</strong> (10% of Level 1's commission)</p>
          <p>👨‍👩‍👧 <strong>Level 3+ follow the same pattern</strong>, cascading down by 10% each level</p>
          <p className="mt-3 pt-3 border-t border-blue-200 text-blue-900">
            📈 Build your network deeper to earn more from multiple levels!
          </p>
        </div>
      </Card>
    </div>
  );
}
