import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, TrendingUp, Users, Award, BarChart3 } from 'lucide-react';

interface AnalyticsData {
  balance: number;
  totalEarned: number;
  fromDirectChildren: number;
  fromIndirectReferrals: number;
  averageMonthlyEarnings: number;
  trend: Array<{ month: string; earned: number }>;
  levelBreakdown: { [key: string]: number };
}

interface AnalyticsDashboardProps {
  accessToken: string;
}

const BASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';

export function AnalyticsDashboard({ accessToken }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'trends' | 'levels'>('overview');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${BASE_URL}/make-server-44a642d3/analytics/earnings`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (data.analytics) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 10000);
    return () => clearInterval(interval);
  }, [accessToken]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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

  if (!analytics) {
    return <div className="text-center py-8 text-gray-500">No analytics data</div>;
  }

  // Calculate growth percentage
  const growth = analytics.trend.length > 1 
    ? ((analytics.trend[analytics.trend.length - 1].earned - analytics.trend[0].earned) / analytics.trend[0].earned * 100).toFixed(1)
    : '0';

  // Calculate highest earning month
  const highestMonth = analytics.trend.reduce((max, curr) => 
    curr.earned > max.earned ? curr : max, { month: 'N/A', earned: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <p className="text-xs uppercase font-semibold text-gray-600">Current Balance</p>
          <p className="text-2xl font-bold text-blue-700 mt-2">${analytics.balance.toFixed(2)}</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <p className="text-xs uppercase font-semibold text-gray-600">Total Earned</p>
          <p className="text-2xl font-bold text-green-700 mt-2">${analytics.totalEarned.toFixed(2)}</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <p className="text-xs uppercase font-semibold text-gray-600">Avg Monthly</p>
          <p className="text-2xl font-bold text-purple-700 mt-2">${analytics.averageMonthlyEarnings.toFixed(2)}</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <p className="text-xs uppercase font-semibold text-gray-600">Growth</p>
          <p className="text-2xl font-bold text-orange-700 mt-2">{growth}%</p>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setSelectedTab('overview')}
          className={`px-4 py-3 font-medium transition-colors ${
            selectedTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Overview
        </button>
        <button
          onClick={() => setSelectedTab('trends')}
          className={`px-4 py-3 font-medium transition-colors ${
            selectedTab === 'trends'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          Trends
        </button>
        <button
          onClick={() => setSelectedTab('levels')}
          className={`px-4 py-3 font-medium transition-colors ${
            selectedTab === 'levels'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Award className="w-4 h-4 inline mr-2" />
          Commission Levels
        </button>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <Card className="p-6 bg-white border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Earnings Breakdown</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">Direct Children Commission</p>
                <p className="text-sm text-gray-600">Your direct referrals earning</p>
              </div>
              <p className="text-2xl font-bold text-green-600">${analytics.fromDirectChildren.toFixed(2)}</p>
            </div>

            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">Indirect Referrals Commission</p>
                <p className="text-sm text-gray-600">Your network beyond direct children</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">${analytics.fromIndirectReferrals.toFixed(2)}</p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div>
                <p className="font-bold text-gray-900 text-lg">Total Commission</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                ${(analytics.fromDirectChildren + analytics.fromIndirectReferrals).toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Trends Tab */}
      {selectedTab === 'trends' && (
        <Card className="p-6 bg-white border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Earnings Trend</h3>
          
          {analytics.trend.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No earnings data yet</p>
              <p className="text-sm mt-2">Start submitting products to see trends</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.trend.map((item) => (
                <div key={item.month} className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">{item.month}</span>
                  <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min((item.earned / (highestMonth.earned || 1)) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                  <span className="font-bold text-gray-900 text-right w-24">${item.earned.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Highest Month</p>
              <p className="text-lg font-bold text-gray-900">${highestMonth.earned.toFixed(2)}</p>
              <p className="text-xs text-gray-500">{highestMonth.month}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Months Active</p>
              <p className="text-lg font-bold text-gray-900">{analytics.trend.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Growth</p>
              <p className="text-lg font-bold text-green-600">{growth}%</p>
            </div>
          </div>
        </Card>
      )}

      {/* Commission Levels Tab */}
      {selectedTab === 'levels' && (
        <Card className="p-6 bg-white border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Commission by Level</h3>
          
          {Object.keys(analytics.levelBreakdown).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No multi-level commissions yet</p>
              <p className="text-sm mt-2">Build your network to earn from multiple levels</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(analytics.levelBreakdown)
                .sort(([keyA], [keyB]) => {
                  const numA = parseInt(keyA.replace('level_', ''));
                  const numB = parseInt(keyB.replace('level_', ''));
                  return numA - numB;
                })
                .map(([level, amount]) => {
                  const levelNum = parseInt(level.replace('level_', ''));
                  const levelNames: { [key: number]: string } = {
                    1: 'Direct Parent',
                    2: 'Grandparent',
                    3: 'Great-Grandparent',
                  };
                  const levelName = levelNames[levelNum] || `Level ${levelNum}`;

                  return (
                    <div key={level} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                          {levelNum}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{levelName}</p>
                          <p className="text-xs text-gray-600">{(amount as any).toFixed ? `Commission from level ${levelNum}` : 'Calculating...'}</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-gray-900">${(amount as any).toFixed ? (amount as any).toFixed(2) : '0.00'}</p>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      )}

      {/* Summary Card */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-gray-900 mb-3">💡 Quick Tips</h4>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>✓ Keep submitting products to increase your direct earnings (80% per product)</li>
          <li>✓ Build your referral network to earn commissions from multiple levels</li>
          <li>✓ Your top referrers contribute significantly to your passive income</li>
          <li>✓ Monitor monthly trends to identify growth patterns in your business</li>
        </ul>
      </Card>
    </div>
  );
}
