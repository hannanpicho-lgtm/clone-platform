import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Trophy, Users, Award } from 'lucide-react';

interface LeaderboardUser {
  userId: string;
  name: string;
  totalProfitFromChildren: number;
  childCount: number;
  vipTier: string;
}

interface ReferrersLeaderboardProps {
  accessToken: string;
}

const BASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';

export function ReferrersLeaderboard({ accessToken }: ReferrersLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${BASE_URL}/make-server-44a642d3/analytics/leaderboard`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
        setUserRank(data.userRank);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 15000);
    return () => clearInterval(interval);
  }, [accessToken]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
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

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'VIP': return 'bg-yellow-100 text-yellow-800';
      case 'Premium': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* User's Position */}
      {userRank && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold">YOUR POSITION</p>
              <p className="text-3xl font-bold text-blue-700 mt-1">Rank #{userRank}</p>
            </div>
            <Award className="w-16 h-16 text-blue-300 opacity-50" />
          </div>
          {userRank <= 10 && (
            <p className="text-sm text-blue-600 mt-4 font-medium">🎉 You're in the top 10! Keep building your network!</p>
          )}
        </Card>
      )}

      {/* Top 10 Highlight */}
      <Card className="p-6 bg-white border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Top Referrers
        </h3>

        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No leaderboard data yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((user, idx) => (
              <div
                key={user.userId}
                className={`flex items-center gap-4 p-4 rounded-lg ${
                  idx === 0
                    ? 'bg-yellow-50 border-2 border-yellow-300'
                    : idx === 1
                    ? 'bg-gray-50 border-2 border-gray-300'
                    : idx === 2
                    ? 'bg-orange-50 border-2 border-orange-300'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex-shrink-0 text-2xl font-bold w-12 text-center">
                  {getMedalEmoji(idx + 1) || (
                    <span className="text-gray-600">#{idx + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="w-3 h-3 text-gray-500" />
                    <p className="text-xs text-gray-600">{user.childCount} referral{user.childCount !== 1 ? 's' : ''}</p>
                    {user.vipTier !== 'Normal' && (
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${getTierColor(user.vipTier)}`}>
                        {user.vipTier}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-gray-900">
                    ${user.totalProfitFromChildren.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">earned</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Full Leaderboard */}
      {leaderboard.length > 10 && (
        <Card className="p-6 bg-white border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Full Leaderboard</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Referrals</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Commission</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((user, idx) => (
                  <tr
                    key={user.userId}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-700">#{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        {user.vipTier !== 'Normal' && (
                          <p className="text-xs text-purple-600">{user.vipTier} Member</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                        <Users className="w-3 h-3" />
                        {user.childCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      ${user.totalProfitFromChildren.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Stats Card */}
      <Card className="p-6 bg-purple-50 border-purple-200">
        <h4 className="font-semibold text-gray-900 mb-4">📊 Leaderboard Stats</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-700">{leaderboard.length}</p>
            <p className="text-xs text-gray-600 mt-1">players</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-700">
              ${leaderboard.reduce((sum, u) => sum + u.totalProfitFromChildren, 0).toFixed(0)}
            </p>
            <p className="text-xs text-gray-600 mt-1">total paid out</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-700">
              {leaderboard.reduce((sum, u) => sum + u.childCount, 0)}
            </p>
            <p className="text-xs text-gray-600 mt-1">total referrals</p>
          </div>
        </div>
      </Card>

      {/* Tips Card */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-gray-900 mb-3">💡 How to Climb the Leaderboard</h4>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>✓ Share your referral code with as many people as possible</li>
          <li>✓ Encourage your referrals to submit products and invite others</li>
          <li>✓ Build a deep network - you earn from multiple levels</li>
          <li>✓ Focus on quality referrals who will be active members</li>
        </ul>
      </Card>
    </div>
  );
}
