import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Sparkles, TrendingUp, Zap, AlertCircle } from 'lucide-react';

interface PremiumMergedProductProps {
  vipTier: string;
  balance: number;
  onSubmit: (mergedValue: number, profit: number) => void;
}

export function PremiumMergedProduct({ vipTier, balance, onSubmit }: PremiumMergedProductProps) {
  const [product1Price, setProduct1Price] = useState('');
  const [product2Price, setProduct2Price] = useState('');
  const [showResult, setShowResult] = useState(false);

  // VIP Rate mapping
  const vipRates: { [key: string]: number } = {
    'Normal': 0.5,
    'Silver': 0.75,
    'Gold': 1.0,
    'Platinum': 1.25,
    'Diamond': 1.5,
  };

  const baseRate = vipRates[vipTier] || 0.5;
  const mergedRate = baseRate * 10; // 10x boost!

  const handleCalculate = () => {
    setShowResult(true);
  };

  const handleSubmit = () => {
    const p1 = parseFloat(product1Price) || 0;
    const p2 = parseFloat(product2Price) || 0;
    const mergedValue = p1 + p2;
    const profit = parseFloat((mergedValue * (mergedRate / 100)).toFixed(2));

    if (balance < mergedValue) {
      alert(`Insufficient balance! You need $${mergedValue.toFixed(2)} but only have $${balance.toFixed(2)}`);
      return;
    }

    if (mergedValue <= 0) {
      alert('Please enter valid product prices!');
      return;
    }

    onSubmit(mergedValue, profit);
    
    // Reset form
    setProduct1Price('');
    setProduct2Price('');
    setShowResult(false);
  };

  const p1 = parseFloat(product1Price) || 0;
  const p2 = parseFloat(product2Price) || 0;
  const mergedValue = p1 + p2;
  const profit = parseFloat((mergedValue * (mergedRate / 100)).toFixed(2));
  const newBalance = balance - mergedValue;
  const hasInsufficientBalance = newBalance < 0;

  return (
    <div className="px-4 pb-20">
      <Card className="shadow-xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
        <CardContent className="pt-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-full">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Premium Merged Product
            </h2>
            <p className="text-sm text-gray-600">Merge 2 products for 10x commission boost!</p>
          </div>

          {/* VIP Rate Display */}
          <div className="bg-white rounded-lg p-4 mb-6 border-2 border-purple-300 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Your VIP Tier</p>
                <p className="text-xl font-bold text-purple-600">{vipTier}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Base Rate</p>
                <p className="text-xl font-bold text-gray-900">{baseRate}%</p>
              </div>
              <Zap className="h-6 w-6 text-yellow-500" />
              <div className="text-right">
                <p className="text-sm text-gray-600">Merged Rate</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {mergedRate}%
                </p>
              </div>
            </div>
          </div>

          {/* Current Balance */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className="text-2xl font-bold text-blue-600">${balance.toFixed(2)}</p>
            </div>
          </div>

          {/* Input Fields */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product 1 Price
              </label>
              <input
                type="number"
                value={product1Price}
                onChange={(e) => setProduct1Price(e.target.value)}
                placeholder="Enter price"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:outline-none text-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product 2 Price
              </label>
              <input
                type="number"
                value={product2Price}
                onChange={(e) => setProduct2Price(e.target.value)}
                placeholder="Enter price"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:outline-none text-lg"
              />
            </div>
          </div>

          {/* Calculate Button */}
          <Button
            onClick={handleCalculate}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 mb-4"
            disabled={!product1Price || !product2Price}
          >
            <TrendingUp className="h-5 w-5 mr-2" />
            Calculate Premium Profit
          </Button>

          {/* Result Display */}
          {showResult && mergedValue > 0 && (
            <div className="bg-white rounded-lg p-5 border-2 border-purple-300 shadow-lg space-y-4 mb-4">
              <h3 className="font-bold text-lg text-gray-900 border-b pb-2">
                Premium Calculation Results
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Merged Product Value:</span>
                  <span className="text-xl font-bold text-gray-900">${mergedValue.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center bg-purple-50 p-3 rounded-lg">
                  <span className="text-gray-700">Merged Profit Rate:</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {mergedRate}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg border border-green-200">
                  <span className="text-gray-700">Profit Earned:</span>
                  <span className="text-2xl font-bold text-green-600">${profit.toFixed(2)}</span>
                </div>
                
                <div className="h-px bg-gray-200"></div>
                
                <div className={`flex justify-between items-center p-3 rounded-lg ${
                  hasInsufficientBalance ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
                }`}>
                  <span className="text-gray-700">Balance After Submission:</span>
                  <span className={`text-2xl font-bold ${
                    hasInsufficientBalance ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    ${newBalance.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Warning if insufficient balance */}
              {hasInsufficientBalance && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Insufficient Balance!</p>
                      <p className="text-xs text-red-700 mt-1">
                        You need ${mergedValue.toFixed(2)} but only have ${balance.toFixed(2)}. 
                        Please deposit funds to continue.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={hasInsufficientBalance}
                className={`w-full font-bold py-4 text-lg ${
                  hasInsufficientBalance
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                } text-white`}
              >
                <Sparkles className="h-5 w-5 mr-2" />
                {hasInsufficientBalance ? 'Insufficient Balance' : 'Submit Premium Product'}
              </Button>
            </div>
          )}

          {/* Info Card */}
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 border border-purple-200">
            <h4 className="font-bold text-purple-900 mb-2 flex items-center">
              <Sparkles className="h-4 w-4 mr-2" />
              How It Works
            </h4>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• Combine 2 products into 1 premium submission</li>
              <li>• Get <strong>10x</strong> your normal commission rate!</li>
              <li>• Pay the merged product value upfront</li>
              <li>• Earn massive profits with premium rates</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
