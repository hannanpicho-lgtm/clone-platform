import { useEffect, useState } from 'react';
import { Button } from './ui/button';

interface AccountFreezeModalProps {
  isOpen: boolean;
  onClose: () => void;
  premiumAmount: number;
  currentBalance: number;
}

export function AccountFreezeModal({ isOpen, onClose, premiumAmount, currentBalance }: AccountFreezeModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const deficit = Math.abs(currentBalance);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 px-4">
      <div 
        className={`bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all duration-500 ${
          show ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
      >
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 p-8 text-center relative overflow-hidden">
          {/* Animated Background Patterns */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-32 -translate-y-32 animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/10 rounded-full translate-x-24 translate-y-24 animate-pulse delay-300"></div>
          
          {/* Lock Icon */}
          <div className="relative mb-4">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-2xl animate-bounce">
              <svg className="w-14 h-14 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">
            🔒 ACCOUNT FROZEN
          </h2>
          <p className="text-white/90 text-base">
            Premium Product Assigned
          </p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Congratulations Message */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-5">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🎉</span>
              </div>
              <div>
                <h3 className="font-bold text-purple-900 text-lg">Congratulations!</h3>
                <p className="text-sm text-purple-700">You've encountered a Premium Product</p>
              </div>
            </div>
            <p className="text-sm text-purple-800 leading-relaxed">
              A premium product worth <span className="font-bold text-pink-600">${premiumAmount.toFixed(2)}</span> has been assigned to your account with a <span className="font-bold">10x commission boost</span>!
            </p>
          </div>

          {/* Account Status */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">Premium Product Value:</span>
              <span className="text-2xl font-bold text-purple-600">${premiumAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">Your Current Balance:</span>
              <span className="text-2xl font-bold text-red-600">-${deficit.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-gray-300 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-base text-gray-800 font-semibold">Top-Up Required:</span>
                <span className="text-3xl font-bold text-green-600">${premiumAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-400 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h4 className="font-bold text-orange-800 mb-1">What happens next?</h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Your account is temporarily frozen</li>
                  <li>• Top up <span className="font-bold">${premiumAmount.toFixed(2)}</span> to continue</li>
                  <li>• Contact Customer Service for assistance</li>
                  <li>• Once topped up, earn 10x commission on this product!</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 hover:from-purple-700 hover:via-pink-600 hover:to-red-600 text-white text-lg py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Contact Customer Service
          </Button>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-300/20 to-pink-300/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-pink-300/20 to-red-300/20 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
