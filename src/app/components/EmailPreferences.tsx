import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, CheckCircle, Bell } from 'lucide-react';

interface NotificationPreferences {
  emailNotifications: boolean;
  withdrawalNotifications: boolean;
  referralNotifications: boolean;
  commissionNotifications: boolean;
  weeklyDigest: boolean;
}

interface EmailPreferencesProps {
  profile: any;
  onUpdate?: (preferences: NotificationPreferences) => void;
}

const BASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';

export function EmailPreferences({ profile, onUpdate }: EmailPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: profile?.emailNotifications !== false,
    withdrawalNotifications: profile?.withdrawalNotifications !== false,
    referralNotifications: profile?.referralNotifications !== false,
    commissionNotifications: profile?.commissionNotifications !== false,
    weeklyDigest: profile?.weeklyDigest === true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
      // If master switch is off, disable all others
      ...(key === 'emailNotifications' && !value ? {
        withdrawalNotifications: false,
        referralNotifications: false,
        commissionNotifications: false,
        weeklyDigest: false,
      } : {}),
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Store preferences in localStorage as a simple solution
      // In production, this would update the user profile via an API
      localStorage.setItem('emailPreferences', JSON.stringify(preferences));
      
      setSuccess('✓ Email preferences saved');
      
      if (onUpdate) {
        onUpdate(preferences);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save preferences');
      console.error('Error saving preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Email Notification Preferences</h2>
        </div>
        <p className="text-gray-600 text-sm">Manage how and when you receive email notifications</p>
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

      {/* Master Switch */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Email Notifications Master Switch</h3>
            <p className="text-sm text-gray-600 mt-1">Turn this off to disable all email notifications</p>
          </div>
          <Switch
            checked={preferences.emailNotifications}
            onChange={(value) => handleChange('emailNotifications', value)}
            disabled={loading}
          />
        </div>
      </Card>

      {/* Individual Preferences */}
      {preferences.emailNotifications && (
        <Card className="p-6 border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Types</h3>
          <div className="space-y-4">
            {/* Withdrawal Notifications */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <Label className="text-gray-900 font-medium">Withdrawal Notifications</Label>
                <p className="text-sm text-gray-600 mt-1">
                  Get notified when your withdrawal is requested, approved, or denied
                </p>
              </div>
              <Switch
                checked={preferences.withdrawalNotifications}
                onChange={(value) => handleChange('withdrawalNotifications', value)}
                disabled={loading || !preferences.emailNotifications}
              />
            </div>

            {/* Referral Notifications */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <Label className="text-gray-900 font-medium">Referral Notifications</Label>
                <p className="text-sm text-gray-600 mt-1">
                  Get notified when someone signs up using your referral code
                </p>
              </div>
              <Switch
                checked={preferences.referralNotifications}
                onChange={(value) => handleChange('referralNotifications', value)}
                disabled={loading || !preferences.emailNotifications}
              />
            </div>

            {/* Commission Notifications */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <Label className="text-gray-900 font-medium">Commission Notifications</Label>
                <p className="text-sm text-gray-600 mt-1">
                  Get notified when you earn commissions from your network
                </p>
              </div>
              <Switch
                checked={preferences.commissionNotifications}
                onChange={(value) => handleChange('commissionNotifications', value)}
                disabled={loading || !preferences.emailNotifications}
              />
            </div>

            {/* Weekly Digest */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <Label className="text-gray-900 font-medium">Weekly Earnings Digest</Label>
                <p className="text-sm text-gray-600 mt-1">
                  Receive a weekly summary of your earnings and network activity
                </p>
              </div>
              <Switch
                checked={preferences.weeklyDigest}
                onChange={(value) => handleChange('weeklyDigest', value)}
                disabled={loading || !preferences.emailNotifications}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Info Card */}
      <Card className="p-6 bg-amber-50 border-amber-200">
        <h4 className="font-semibold text-gray-900 mb-2">💡 How We Use Your Email</h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✓ We never share your email with third parties</li>
          <li>✓ You can unsubscribe from any email in one click</li>
          <li>✓ Emails are sent from <code className="bg-white px-2 py-1 rounded text-xs">notifications@platform.com</code></li>
          <li>✓ Critical account notifications (approvals/denials) may still be sent even if disabled</li>
        </ul>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Preferences'}
      </Button>
    </div>
  );
}
