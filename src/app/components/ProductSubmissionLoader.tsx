import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface ProductSubmissionLoaderProps {
  productName: string;
  profit: number;
  rating: number;
  todaysTotal: number;
  onComplete: () => void;
}

export function ProductSubmissionLoader({ 
  productName, 
  profit, 
  rating, 
  todaysTotal,
  onComplete 
}: ProductSubmissionLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setStage('success');
          // Auto close after showing success
          setTimeout(() => {
            onComplete();
          }, 1500);
          return 100;
        }
        return prev + 5;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        {stage === 'loading' ? (
          <div className="p-8">
            {/* Loading Animation */}
            <div className="flex flex-col items-center mb-6">
              <motion.div
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="w-20 h-20 mb-4"
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="283"
                    initial={{ strokeDashoffset: 283 }}
                    animate={{ strokeDashoffset: 283 - (283 * progress) / 100 }}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>

              {/* Pulsing Product Icon */}
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="text-6xl mb-4"
              >
                📦
              </motion.div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Product</h2>
              <p className="text-gray-600 text-center text-sm mb-4">
                Processing your submission...
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-2">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-sm font-semibold text-gray-700">{progress}%</p>
            </div>

            {/* Product Info */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4">
              <p className="text-xs text-gray-600 mb-1">Product Name</p>
              <p className="text-sm font-semibold text-gray-900 mb-3 truncate">{productName}</p>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-600">Earning</p>
                  <p className="text-lg font-bold text-green-600">${profit.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Rating</p>
                  <div className="flex items-center">
                    <p className="text-lg font-bold text-yellow-500">{rating || 'N/A'}</p>
                    {rating > 0 && <span className="text-yellow-400 ml-1">⭐</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-8 bg-gradient-to-br from-green-50 to-emerald-50"
          >
            {/* Success Animation */}
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 200,
                  damping: 15
                }}
                className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-4"
              >
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="w-16 h-16 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </motion.svg>
              </motion.div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">Success! ✅</h2>
              <p className="text-gray-600 text-center mb-6">
                Product review submitted successfully
              </p>

              {/* Success Details */}
              <div className="w-full bg-white rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Earned</span>
                  <span className="text-xl font-bold text-green-600">${profit.toFixed(2)}</span>
                </div>
                <div className="h-px bg-gray-200"></div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Rating</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {rating > 0 ? `${rating} stars ⭐` : 'No rating'}
                  </span>
                </div>
                <div className="h-px bg-gray-200"></div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Today's Total</span>
                  <span className="text-xl font-bold text-purple-600">${todaysTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
