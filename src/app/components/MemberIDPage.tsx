import { X, Copy, Check } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { useState } from 'react';

interface MemberIDPageProps {
  memberId: string;
  userName: string;
  invitationCode?: string;
  onClose: () => void;
}

export function MemberIDPage({ memberId, userName, invitationCode, onClose }: MemberIDPageProps) {
  const [copied, setCopied] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(memberId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyInviteCode = () => {
    if (!invitationCode) return;
    navigator.clipboard.writeText(invitationCode);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-teal-600 text-white p-4 flex items-center justify-between shadow-lg z-10">
        <h1 className="text-xl font-bold">Member ID</h1>
        <button
          onClick={onClose}
          className="bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 pb-8">
        {/* User Info Card */}
        <Card className="shadow-lg border-2 border-indigo-500">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-sm font-semibold text-gray-600">Username</h2>
              <p className="text-2xl font-bold text-gray-900 break-words mt-1">{userName}</p>
            </div>
          </CardContent>
        </Card>

        {/* Member ID Card */}
        <Card className="shadow-lg border-2 border-teal-500">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h2 className="text-lg font-semibold text-gray-700">Your User Ref ID:</h2>
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4">
                <p className="text-3xl font-bold text-purple-600">{memberId}</p>
              </div>
              
              {/* Copy Code Button */}
              <button
                onClick={handleCopyCode}
                className={`flex items-center justify-center space-x-2 mx-auto px-6 py-3 rounded-lg font-semibold transition-all ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-gradient-to-r from-teal-500 to-blue-500 text-white hover:from-teal-600 hover:to-blue-600'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="h-5 w-5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Invitation Code Card */}
        <Card className="shadow-lg border-2 border-purple-500">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h2 className="text-lg font-semibold text-gray-700">Your Invitation Code:</h2>
              <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg p-4">
                <p className="text-3xl font-bold text-purple-700 tracking-wide">{invitationCode || 'Not assigned'}</p>
              </div>

              <button
                onClick={handleCopyInviteCode}
                disabled={!invitationCode}
                className={`flex items-center justify-center space-x-2 mx-auto px-6 py-3 rounded-lg font-semibold transition-all ${
                  copiedInvite
                    ? 'bg-green-500 text-white'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {copiedInvite ? (
                  <>
                    <Check className="h-5 w-5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    <span>Copy Invitation Code</span>
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Referral Information */}
        <Card className="bg-blue-50 border-2 border-blue-300">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">Referral Program</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <p className="flex items-start">
                <span className="mr-2 text-blue-600">•</span>
                <span>Share your Member ID with friends to invite them to join Tanknewmedia</span>
              </p>
              <p className="flex items-start">
                <span className="mr-2 text-blue-600">•</span>
                <span>Earn <strong className="text-blue-600">20% commission</strong> on your direct referrals' profits</span>
              </p>
              <p className="flex items-start">
                <span className="mr-2 text-blue-600">•</span>
                <span>New users can only invite others after <strong>14 days</strong> of registration or after upgrading to Diamond Membership</span>
              </p>
              <p className="flex items-start">
                <span className="mr-2 text-blue-600">•</span>
                <span>The referrer will receive a 70% referral member reward</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* How to Use */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">How to Use Your Member ID</h3>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="mr-3 font-bold text-teal-600">1.</span>
                <span>Click the "Copy Code" button above to copy your unique Member ID</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 font-bold text-teal-600">2.</span>
                <span>Share your Member ID with friends via social media, email, or messaging apps</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 font-bold text-teal-600">3.</span>
                <span>When they sign up using your ID, you'll automatically receive referral commissions</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 font-bold text-teal-600">4.</span>
                <span>Track your referral earnings in the Reports section</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
          <h4 className="font-bold text-gray-900 mb-2">Important Notes:</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="mr-2 text-yellow-600">⚠️</span>
              <span>Once the invitation code has been used, it takes 14 days to renew the Member ID</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-yellow-600">⚠️</span>
              <span>If your account does not complete all products, you will not be able to invite other users</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
