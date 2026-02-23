import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, Copy, Loader2, TrendingUp, Users, Wallet } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface EarningsData {
  balance: number;
  totalEarned: number;
  fromDirectChildren: number;
  fromIndirectReferrals: number;
  childCount: number;
  totalFromChildren: number;
  parentUserId: string | null;
}

interface ProfileData {
  invitationCode: string;
  name: string;
  email: string;
}

export function EarningsDashboard({
  accessToken,
  profile,
}: {
  accessToken: string;
  profile: ProfileData & { id: string };
}) {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const BASE_URL = 'https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3';

  useEffect(() => {
    fetchEarnings();
    const interval = setInterval(fetchEarnings, 5000); // Auto-refresh every 5 seconds
    return () => clearInterval(interval);
  }, [accessToken]);

  const fetchEarnings = async () => {
    try {
      const response = await fetch(`${BASE_URL}/earnings`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) throw new Error('Failed to fetch earnings');

      const data = await response.json();
      setEarnings(data.earnings);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(profile.invitationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  if (!earnings) return null;

  return (
    <div className="space-y-6">
      {/* Invitation Code Card */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
        <CardHeader>
          <CardTitle className="text-blue-900">Your Invitation Code</CardTitle>
          <CardDescription className="text-blue-700">
            Share this code with others to earn 20% commission
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-2 bg-white border-2 border-blue-300 rounded font-mono text-lg font-bold text-blue-600">
              {profile.invitationCode}
            </code>
            <Button
              onClick={copyInviteCode}
              variant="outline"
              className="border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              <Copy className="w-4 h-4 mr-2" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance Card */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">${earnings.balance.toFixed(2)}</div>
            <p className="text-xs text-green-600 mt-1">Available to withdraw</p>
          </CardContent>
        </Card>

        {/* Commission Card */}
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Commission (20%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">
              ${earnings.fromDirectChildren.toFixed(2)}
            </div>
            <p className="text-xs text-orange-600 mt-1">From direct referrals</p>
          </CardContent>
        </Card>

        {/* Referrals Card */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              <Users className="w-4 h-4 inline mr-1" />
              Active Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">{earnings.childCount}</div>
            <p className="text-xs text-purple-600 mt-1">People you've referred</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Earnings Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings Breakdown</CardTitle>
          <CardDescription>Detailed view of your income</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <p className="text-sm text-gray-600">Total Earned</p>
              <p className="text-2xl font-bold text-blue-600">${earnings.totalEarned.toFixed(2)}</p>
            </div>

            <div className="border-l-4 border-green-500 pl-4 py-2">
              <p className="text-sm text-gray-600">Commission from Children</p>
              <p className="text-2xl font-bold text-green-600">
                ${earnings.totalFromChildren.toFixed(2)}
              </p>
            </div>

            {earnings.parentUserId && (
              <div className="border-l-4 border-gray-500 pl-4 py-2">
                <p className="text-sm text-gray-600">Your Parent</p>
                <p className="text-sm text-gray-600">Earning them 20% of your profits</p>
              </div>
            )}

            <div className="border-l-4 border-gray-300 pl-4 py-2">
              <p className="text-sm text-gray-600">Indirect Referrals</p>
              <p className="text-2xl font-bold text-gray-600">
                ${earnings.fromIndirectReferrals.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          💡 When you refer someone and they submit a product worth $1000, you earn $200 (20% commission).
          Your referrals show below.
        </AlertDescription>
      </Alert>
    </div>
  );
}
