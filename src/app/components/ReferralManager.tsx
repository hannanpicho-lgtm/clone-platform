import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, Loader2, Users, DollarSign, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface Referral {
  childId: string;
  childName: string;
  childEmail: string;
  totalSharedProfit: number;
  lastProductAt: string | null;
  createdAt: string;
}

interface ReferralResponse {
  referrals: Referral[];
  totalChildren: number;
}

export function ReferralManager({ accessToken }: { accessToken: string }) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const BASE_URL = 'https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3';

  useEffect(() => {
    fetchReferrals();
    const interval = setInterval(fetchReferrals, 5000);
    return () => clearInterval(interval);
  }, [accessToken]);

  const fetchReferrals = async () => {
    try {
      const response = await fetch(`${BASE_URL}/referrals`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) throw new Error('Failed to fetch referrals');

      const data = await response.json() as ReferralResponse;
      setReferrals(data.referrals);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Statistics */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
        <CardHeader>
          <CardTitle className="text-purple-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Your Referral Network
          </CardTitle>
          <CardDescription className="text-purple-700">
            People who signed up with your invitation code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-purple-600">Total Referrals</p>
              <p className="text-4xl font-bold text-purple-900">{referrals.length}</p>
            </div>
            <div>
              <p className="text-sm text-purple-600">Total Commission Earned</p>
              <p className="text-4xl font-bold text-purple-900">
                ${referrals.reduce((sum, r) => sum + r.totalSharedProfit, 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-purple-600">Average Commission per Referral</p>
              <p className="text-4xl font-bold text-purple-900">
                $
                {referrals.length > 0
                  ? (referrals.reduce((sum, r) => sum + r.totalSharedProfit, 0) / referrals.length).toFixed(2)
                  : '0.00'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referrals List */}
      {referrals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No referrals yet</p>
            <p className="text-sm text-gray-400">
              Share your invitation code to start earning 20% commission from your referrals
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Referral List</CardTitle>
            <CardDescription>All users who signed up with your code</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.childId}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{referral.childName}</h4>
                      <p className="text-sm text-gray-600">{referral.childEmail}</p>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Commission Earned
                          </p>
                          <p className="text-lg font-bold text-green-600">
                            ${referral.totalSharedProfit.toFixed(2)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Joined
                          </p>
                          <p className="text-sm text-gray-700">{formatDate(referral.createdAt)}</p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Last Active
                          </p>
                          <p className="text-sm font-medium text-orange-600">
                            {formatTime(referral.lastProductAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Alert className="border-orange-200 bg-orange-50">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          📊 You earn 20% of what each referral makes. When they submit a product worth $1000, you
          get $200 and they get $800.
        </AlertDescription>
      </Alert>
    </div>
  );
}
