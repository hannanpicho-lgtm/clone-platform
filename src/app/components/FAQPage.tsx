import { X } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface FAQPageProps {
  onClose: () => void;
}

export function FAQPage({ onClose }: FAQPageProps) {
  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-teal-600 text-white p-4 flex items-center justify-between shadow-lg z-10">
        <h1 className="text-xl font-bold">FAQ</h1>
        <button
          onClick={onClose}
          className="bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 pb-8">
        {/* What is FAQ */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">What is FAQ?</h2>
            <p className="text-gray-700">FAQ means frequent asked questions</p>
          </CardContent>
        </Card>

        {/* 1. To deposit funds */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-bold text-teal-600 mb-3">1. To deposit funds</h2>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="mr-2 mt-1 text-teal-600">•</span>
                <span>With the massive amount of information on the platform, users should contact customer service to confirm and double-check the client's cryptocurrency address before each deposit.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1 text-teal-600">•</span>
                <span>After a successful deposit, users are requested to provide successful transfer receipts for online customer service to update the platform account.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1 text-teal-600">•</span>
                <span>The cryptocurrency address of the recipient and the amount transferred must be the same as the cryptocurrency address details provided for the payment to be effective immediately.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1 text-teal-600">•</span>
                <span>If the user encounters any problem during the deposit process, please contact our online customer service for more information!</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 2. About Products */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-bold text-teal-600 mb-3">2. About Products</h2>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="mr-2 mt-1 text-teal-600">•</span>
                <span>The value of the Product is adjusted according to the market value.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1 text-teal-600">•</span>
                <span>The Product is randomly assigned according to the total balance on the user's account.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1 text-teal-600">•</span>
                <span>The higher the balance on the user's account, the higher the amount of the Product, and therefore the higher the profit.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1 text-teal-600">•</span>
                <span className="font-semibold">Every user has the obligation to pay a one time taxes fee once their withdrawal amount has exceeded $25000</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1 text-teal-600">•</span>
                <span>If the user is concerned that the amount of the Product is too high to afford, please do not deposit too much money to start drive traffic.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 3. Withdrawal */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-bold text-teal-600 mb-3">3. Withdrawal</h2>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="mr-2 mt-1 text-teal-600">•</span>
                <span className="font-semibold">Withdrawal time is from 10:00 to 22:59 daily</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 4. Platform User Mode */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-bold text-teal-600 mb-3">4. Platform User Mode</h2>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="mr-2 mt-1 text-teal-600">•</span>
                <span>Users may invite new users to become platform users and will receive additional referral commissions. The referral incentive is an additional 20%</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1 text-teal-600">•</span>
                <span>Platform users can invite others to become platform agents through agent codes and become your downline. As the upline, you can extract a certain percentage of your downline's profit, and the profit obtained by the upline will be directly returned to the upline's platform account or the team report.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1 text-teal-600">•</span>
                <span>You can get 20% of your Tier 1 agent's profit</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-1 text-teal-600">•</span>
                <span>All users of the platform will receive a certain percentage of the platform's profits and rewards accordingly, developing a team does not affect the profits and rewards of any users</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 5. Operating hours */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-bold text-teal-600 mb-3">5. Operating hours</h2>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="mr-2 mt-1 text-teal-600">•</span>
                <span className="font-semibold">Users may optimize the Product during the daily operation hours from 10:00 to 22:59</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Notice */}
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
          <p className="text-sm text-gray-900">
            <span className="font-bold">Notice:</span> For further explanation, please click "Support" on the platform to contact our online customer service
          </p>
        </div>

        {/* Contact Support Button */}
        <button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
          Contact Customer Service
        </button>
      </div>
    </div>
  );
}
