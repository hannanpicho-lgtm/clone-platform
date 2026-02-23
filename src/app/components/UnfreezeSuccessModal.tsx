import { useEffect, useState } from 'react';
import { Button } from './ui/button';

interface UnfreezeSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  newBalance: number;
}

export function UnfreezeSuccessModal({ isOpen, onClose, newBalance }: UnfreezeSuccessModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div 
        className={`bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all duration-500 ${
          show ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
      >
        {/* Success Header with Gradient */}
        <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-6 text-center relative overflow-hidden">
          {/* Animated Background Circles */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/20 rounded-full -translate-x-16 -translate-y-16 animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/20 rounded-full translate-x-12 translate-y-12 animate-pulse delay-150"></div>
          
          {/* Success Icon */}
          <div className="relative mb-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg animate-bounce">
              <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            ✅ ACCOUNT UNFROZEN
          </h2>
          <p className="text-white/90 text-sm">
            The user has topped up their account.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Success Message */}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-green-800 text-lg">Account is now active!</h3>
                <p className="text-sm text-green-700">Ready to continue submitting products</p>
              </div>
            </div>
          </div>

          {/* New Balance Display */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-purple-200 rounded-xl p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">New Balance</p>
              <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
                ${newBalance.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Info Message */}
          <div className="flex items-start space-x-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-blue-800">
              The user can now continue submitting products.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="px-6 pb-6">
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Continue
          </Button>
        </div>

        {/* Confetti Effect (Optional) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10%',
                background: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b'][Math.floor(Math.random() * 4)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear infinite;
        }
      `}</style>
    </div>
  );
}
