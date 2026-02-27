import { useEffect, useState } from 'react';
import { Button } from './ui/button';

interface AccountFreezeModalProps {
  isOpen: boolean;
  onClose: () => void;
  premiumAmount: number;
  currentBalance: number;
  potentialProfit: number;
}

export function AccountFreezeModal({ isOpen, onClose, premiumAmount, currentBalance, potentialProfit }: AccountFreezeModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const deficit = Math.abs(currentBalance);
  const topUpRequired = Math.max(0, premiumAmount);
  const effectiveVipRate = premiumAmount > 0 ? potentialProfit / premiumAmount : 0;
  const vipRatePercent = Math.max(0, Math.round(effectiveVipRate * 100));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 px-4">
      <div 
        className={`bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all duration-300 ${
          show ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
      >
        <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 px-5 py-4 text-white">
          <h2 className="text-xl font-bold">🔒 Account Frozen</h2>
          <p className="text-sm text-white/90">Premium product encountered</p>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
            <p className="text-sm text-purple-900">
              Premium value <span className="font-bold">${premiumAmount.toFixed(2)}</span> assigned. Complete top-up to continue.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Premium Product Value</span>
              <span className="text-lg font-bold text-purple-600">${premiumAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Current Balance</span>
              <span className="text-lg font-bold text-red-600">-${deficit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-300 pt-2 mt-2">
              <span className="text-sm font-semibold text-gray-800">Top-Up Required</span>
              <span className="text-xl font-bold text-green-600">${topUpRequired.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-800">Potential Premium Earning</span>
              <span className="text-lg font-bold text-purple-600">${potentialProfit.toFixed(2)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs text-blue-800 font-semibold mb-1">How it is calculated</p>
            <p className="text-xs text-blue-700">
              Potential Earning = Premium Value × VIP Rate
            </p>
            <p className="text-xs text-blue-700 mt-1">
              ${premiumAmount.toFixed(2)} × {vipRatePercent}% = ${potentialProfit.toFixed(2)}
            </p>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
            <p className="text-sm text-orange-800">
              To continue: top up <span className="font-bold">${topUpRequired.toFixed(2)}</span> and contact customer service.
            </p>
          </div>

          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 hover:from-purple-700 hover:via-pink-600 hover:to-red-600 text-white"
          >
            Contact Customer Service
          </Button>
        </div>
      </div>
    </div>
  );
}
