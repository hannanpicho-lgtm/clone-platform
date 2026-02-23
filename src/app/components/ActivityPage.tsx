import { X } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface ActivityPageProps {
  onClose: () => void;
}

export function ActivityPage({ onClose }: ActivityPageProps) {
  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-teal-600 text-white p-4 flex items-center justify-between shadow-lg z-10">
        <h1 className="text-xl font-bold">Activity</h1>
        <button
          onClick={onClose}
          className="bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-colors"
        >
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

            {/* Check-in Rewards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div>
                  <div className="text-4xl font-bold">03</div>
                  <div className="text-xs text-blue-200">Check-In Day 03</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-400">$500</div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div>
                  <div className="text-4xl font-bold">05</div>
                  <div className="text-xs text-blue-200">Check-In Day 5</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-400">$1000</div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div>
                  <div className="text-4xl font-bold">15</div>
                  <div className="text-xs text-blue-200">Check-In Day 15</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-400">$1,500</div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div>
                  <div className="text-4xl font-bold">30</div>
                  <div className="text-xs text-blue-200">Check-In Day 30</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-400">$2,000</div>
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="mt-6 pt-4 border-t border-white/20">
              <h4 className="font-bold text-sm mb-2 text-yellow-400">Terms & Conditions</h4>
              <ul className="space-y-1 text-xs text-blue-100">
                <li>• Every user are required to completed 5 sets a day to be entitled</li>
                <li>• Withdraw sets incentives are to be reflected on your account</li>
                <li className="text-yellow-300">  successively. 3, 5, 15 & 30 days.</li>
              </ul>
              <p className="text-xs mt-3 text-blue-100">
                Do not hesitate to contact our online support for information
              </p>
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

            {/* Level 1 */}
            <Card className="mb-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white border-0">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="text-3xl">🥈</div>
                  <h3 className="text-lg font-bold">Level 1</h3>
                </div>
                <h4 className="font-semibold text-sm mb-2 text-yellow-300">
                  Level 1 Users Are Assigned General Usage Access To Data Collection
                </h4>
                <ul className="space-y-1 text-xs">
                  <li>• Applicable to most data collection situations of light to medium level of usage involving the products</li>
                  <li>• Profits of 0.5% per set - 35 sets per day</li>
                  <li>• Obtain profits of up to $300K per month</li>
                  <li>• Up to 90 withdrawal timing a day</li>
                  <li>• Allow access support for assistance</li>
                </ul>
              </CardContent>
            </Card>

            {/* Level 2 */}
            <Card className="mb-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white border-0">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="text-3xl">🥈</div>
                  <h3 className="text-lg font-bold">Level 2</h3>
                </div>
                <h4 className="font-semibold text-sm mb-2 text-yellow-300">
                  Level 2 Users Are Assigned General Usage Access To Data Collection
                </h4>
                <ul className="space-y-1 text-xs">
                  <li>• Applicable to most data collection situations of light to medium level of usage involving the products</li>
                  <li>• Profits of 0.75% per set - 40 sets per day</li>
                  <li>• Up to 120 commission timing a day</li>
                  <li>• Unlock access support for assistance</li>
                </ul>
              </CardContent>
            </Card>

            {/* Level 3 */}
            <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="text-3xl">🥇</div>
                  <h3 className="text-lg font-bold">Level 3</h3>
                </div>
                <h4 className="font-semibold text-sm mb-2">
                  Level 3 Users Are Assigned General Usage Access To Data Collection
                </h4>
                <ul className="space-y-1 text-xs">
                  <li>• Applicable to most data collection situations of light to medium level of usage involving the products</li>
                  <li>• Profits of 1% per set - 45 sets per day</li>
                  <li>• Up to 180 commission timing a day</li>
                  <li>• Unlock access support for assistance</li>
                </ul>
              </CardContent>
            </Card>
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
