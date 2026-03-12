import { X } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, Gift } from 'lucide-react';
import { Button } from './ui/button';

interface CheckInMilestone { day: number; reward: number; }
interface CheckInStatus {
  streak: number;
  checkedInToday: boolean;
  claimedMilestones: number[];
  milestones: CheckInMilestone[];
  termsAndConditions: string[];
  earnedMilestone?: CheckInMilestone | null;
}
interface MembershipLevel {
  level: number; name: string; icon: string; gradient: string; headline: string; features: string[];
}
interface ActivityPageProps { onClose: () => void; accessToken: string; }

const BASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';
const FN_BASE = BASE_URL.endsWith('/functions/v1') ? BASE_URL : `${BASE_URL}/functions/v1`;
const API = `${FN_BASE}/make-server-44a642d3`;

const DEFAULT_MILESTONES: CheckInMilestone[] = [
  { day: 3, reward: 500 }, { day: 5, reward: 1000 }, { day: 15, reward: 1500 }, { day: 30, reward: 2000 },
];
const DEFAULT_TERMS = [
  'Every user is required to complete 5 sets a day to be entitled.',
  'Check-in incentives are reflected on your account successively at Day 3, 5, 15 & 30.',
];
const DEFAULT_LEVELS: MembershipLevel[] = [
  { level: 1, name: 'Level 1', icon: '🥈', gradient: 'from-gray-600 to-gray-700',
    headline: 'Level 1 Users Are Assigned General Usage Access To Data Collection',
    features: ['Applicable to most data collection situations of light to medium level of usage involving the products', 'Profits of 0.5% per set - 35 sets per day', 'Obtain profits of up to $300K per month', 'Up to 90 withdrawal timing a day', 'Allow access support for assistance'] },
  { level: 2, name: 'Level 2', icon: '🥈', gradient: 'from-gray-500 to-gray-600',
    headline: 'Level 2 Users Are Assigned General Usage Access To Data Collection',
    features: ['Applicable to most data collection situations of light to medium level of usage involving the products', 'Profits of 0.75% per set - 40 sets per day', 'Up to 120 commission timing a day', 'Unlock access support for assistance'] },
  { level: 3, name: 'Level 3', icon: '🥇', gradient: 'from-yellow-500 to-yellow-600',
    headline: 'Level 3 Users Are Assigned General Usage Access To Data Collection',
    features: ['Applicable to most data collection situations of light to medium level of usage involving the products', 'Profits of 1% per set - 45 sets per day', 'Up to 180 commission timing a day', 'Unlock access support for assistance'] },
];

export function ActivityPage({ onClose, accessToken }: ActivityPageProps) {
  const [checkIn, setCheckIn] = useState<CheckInStatus | null>(null);
  const [levels, setLevels] = useState<MembershipLevel[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, configRes] = await Promise.all([
        fetch(`${API}/check-in/status`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch(`${API}/admin/rewards/config`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);
      if (statusRes.ok) { const d = await statusRes.json(); if (d?.checkIn) setCheckIn(d.checkIn); }
      if (configRes.ok) { const d = await configRes.json(); if (Array.isArray(d?.config?.membership?.levels) && d.config.membership.levels.length > 0) setLevels(d.config.membership.levels); }
    } catch (_) { /* use defaults */ }
    finally { setLoadingStatus(false); }
  }, [accessToken]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleCheckIn = async () => {
    setCheckingIn(true); setNotice(null);
    try {
      const res = await fetch(`${API}/check-in`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (res.ok && data?.checkIn) {
        setCheckIn(data.checkIn);
        setNotice(data.checkIn.earnedMilestone
          ? { type: 'success', text: `Day ${data.checkIn.earnedMilestone.day} milestone reached! +$${data.checkIn.earnedMilestone.reward.toLocaleString()} credited to your balance.` }
          : { type: 'success', text: `Day ${data.checkIn.streak} check-in complete. Keep the streak going!` });
      } else if (res.status === 409) {
        setNotice({ type: 'error', text: 'You have already checked in today.' }); await fetchStatus();
      } else {
        setNotice({ type: 'error', text: data?.error || 'Check-in failed. Please try again.' });
      }
    } catch (_) { setNotice({ type: 'error', text: 'Network error. Please try again.' }); }
    finally { setCheckingIn(false); }
  };

  const milestones = checkIn?.milestones ?? DEFAULT_MILESTONES;
  const terms = checkIn?.termsAndConditions ?? DEFAULT_TERMS;
  const claimed = checkIn?.claimedMilestones ?? [];
  const streak = checkIn?.streak ?? 0;
  const checkedInToday = checkIn?.checkedInToday ?? false;
  const displayLevels = levels.length > 0 ? levels : DEFAULT_LEVELS;

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="sticky top-0 bg-teal-600 text-white p-4 flex items-center justify-between shadow-lg z-10">
        <h1 className="text-xl font-bold">Activity</h1>
        <button onClick={onClose} className="bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 pb-8">
        {/* Check In Program */}
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 rounded-lg p-6 text-white relative overflow-hidden">
          {/* Stars background effect */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 left-4 w-1 h-1 bg-white rounded-full animate-pulse"></div>
            <div className="absolute top-12 right-8 w-1 h-1 bg-white rounded-full animate-pulse delay-100"></div>
            <div className="absolute bottom-16 left-12 w-1 h-1 bg-white rounded-full animate-pulse delay-200"></div>
            <div className="absolute top-24 left-24 w-1 h-1 bg-white rounded-full animate-pulse delay-300"></div>
            <div className="absolute bottom-24 right-16 w-1 h-1 bg-white rounded-full animate-pulse delay-500"></div>
          </div>

          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-yellow-400 mb-1">TNK</h2>
              <h3 className="text-sm font-semibold">TANKNEWMEDIA-DATA</h3>
            </div>

            <h2 className="text-2xl font-bold text-center mb-6">Check In Program</h2>

            {/* Streak */}
            {!loadingStatus && (
              <div className="flex items-center justify-between bg-white/15 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-yellow-400" /><span className="text-sm font-semibold">Current Streak</span></div>
                <span className="text-xl font-bold text-yellow-400">{streak} day{streak !== 1 ? 's' : ''}</span>
              </div>
            )}
            {notice && (
              <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${notice.type === 'success' ? 'bg-green-500/20 text-green-200 border border-green-400/40' : 'bg-red-500/20 text-red-200 border border-red-400/40'}`}>{notice.text}</div>
            )}
            {/* Milestone rows */}
            <div className="space-y-4">
              {milestones.map((m) => {
                const isClaimed = claimed.includes(m.day);
                const isReached = streak >= m.day;
                return (
                  <div key={m.day} className={`flex items-center justify-between backdrop-blur-sm rounded-lg p-4 ${isClaimed ? 'bg-green-600/30 border border-green-400/40' : isReached ? 'bg-yellow-500/20 border border-yellow-400/40' : 'bg-white/10'}`}>
                    <div className="flex items-center gap-3">
                      {isClaimed ? <CheckCircle className="w-6 h-6 text-green-400" /> : isReached ? <Gift className="w-6 h-6 text-yellow-400" /> : <Clock className="w-6 h-6 text-blue-300 opacity-60" />}
                      <div>
                        <div className="text-4xl font-bold">{String(m.day).padStart(2, '0')}</div>
                        <div className="text-xs text-blue-200">{isClaimed ? 'Claimed' : isReached ? 'Ready to claim' : `Check-In Day ${m.day}`}</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">${m.reward.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
            {/* Check In Button */}
            <div className="mt-6">
              <Button onClick={handleCheckIn} disabled={checkedInToday || checkingIn}
                className={`w-full font-bold py-3 text-base transition-all ${checkedInToday ? 'bg-green-600 cursor-not-allowed opacity-80 text-white' : 'bg-yellow-500 hover:bg-yellow-400 text-blue-900'}`}>
                {checkingIn ? 'Checking In...' : checkedInToday ? '✓ Checked In Today' : 'Check In Today'}
              </Button>
            </div>
            {/* Terms */}
            <div className="mt-6 pt-4 border-t border-white/20">
              <h4 className="font-bold text-sm mb-2 text-yellow-400">Terms & Conditions</h4>
              <ul className="space-y-1 text-xs text-blue-100">{terms.map((t, i) => <li key={i}>• {t}</li>)}</ul>
              <p className="text-xs mt-3 text-blue-100">Do not hesitate to contact our online support for information</p>
            </div>
          </div>
        </div>

        {/* Membership Upgrade */}
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 rounded-lg p-6 text-white relative overflow-hidden">
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-yellow-400 mb-1">TNK</h2>
              <h3 className="text-sm font-semibold">TANKNEWMEDIA-DATA</h3>
            </div>

            <h2 className="text-2xl font-bold text-center mb-6">Membership Upgrade</h2>

            {displayLevels.map((lvl, idx) => (
              <Card key={lvl.level} className={`${idx < displayLevels.length - 1 ? 'mb-4' : ''} bg-gradient-to-r ${lvl.gradient} text-white border-0`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="text-3xl">{lvl.icon}</div>
                    <h3 className="text-lg font-bold">{lvl.name}</h3>
                  </div>
                  <h4 className="font-semibold text-sm mb-2 text-yellow-300">{lvl.headline}</h4>
                  <ul className="space-y-1 text-xs">{lvl.features.map((f, i) => <li key={i}>• {f}</li>)}</ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
          Contact Customer Service
        </button>
      </div>
    </div>
  );
}
