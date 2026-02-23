import { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from './ui/card';

interface ProductsViewProps {
  vipTier: string;
  balance: number;
  productsSubmitted: number;
  onSubmitProduct: (productId: string, commission: number) => void;
  onStartProduct: (product: ProductData) => void;
  todaysProfit: number;
  accountFrozen?: boolean;
}

export interface ProductData {
  name: string;
  image: string;
  totalAmount: number;
  profit: number;
  creationTime: string;
  ratingNo: string;
}

export function ProductsView({ vipTier, balance, productsSubmitted, onSubmitProduct, onStartProduct, todaysProfit, accountFrozen }: ProductsViewProps) {
  
  // VIP tier settings with correct commission rates and product limits
  const maxProducts = vipTier === 'Diamond' ? 55 : vipTier === 'Platinum' ? 50 : vipTier === 'Gold' ? 45 : vipTier === 'Silver' ? 40 : 35;
  const commissionRate = vipTier === 'Diamond' ? 0.015 : vipTier === 'Platinum' ? 0.0125 : vipTier === 'Gold' ? 0.01 : vipTier === 'Silver' ? 0.0075 : 0.005;
  
  // Minimum balance required to start tasks based on VIP tier price
  const getMinimumBalance = () => {
    switch(vipTier) {
      case 'Diamond':
        return 9999;
      case 'Platinum':
        return 1999;
      case 'Gold':
        return 599;
      case 'Silver':
        return 399;
      default:
        return 99; // Normal tier
    }
  };
  
  const minimumBalance = getMinimumBalance();
  const hasMinimumBalance = balance >= minimumBalance;
  
  // VIP tier product amount ranges based on tier pricing
  const getProductAmountRange = () => {
    switch(vipTier) {
      case 'Diamond':
        return { min: 9999, max: 19998 }; // Diamond tier: $9,999 - $19,998
      case 'Platinum':
        return { min: 1999, max: 9998 }; // Platinum tier: $1,999 - $9,998
      case 'Gold':
        return { min: 599, max: 1998 }; // Gold tier: $599 - $1,998
      case 'Silver':
        return { min: 399, max: 598 }; // Silver tier: $399 - $598
      default:
        return { min: 99, max: 398 }; // Normal tier: $99 - $398
    }
  };
  
  const productRange = getProductAmountRange();
  
  // Sample product names
  const productNames = [
    'stainless steel black sink waterfall faucet',
    'wireless bluetooth noise cancelling headphones',
    'smart home security camera system',
    'portable solar power bank charger',
    'ergonomic mesh office chair',
    'led desk lamp with wireless charging',
    'stainless steel cookware set',
    'digital air fryer with touch screen',
    'robot vacuum cleaner with mapping',
    'electric standing desk converter',
    'waterproof fitness tracker watch',
    'ceramic non-stick frying pan',
    'bamboo kitchen utensil set',
    'glass meal prep containers',
    'electric milk frother and steamer',
  ];

  // Product images from Unsplash
  const productImages = [
    'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    'https://images.unsplash.com/photo-1558002038-1055907df827?w=400',
    'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=400',
    'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
    'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    'https://images.unsplash.com/photo-1595418917831-ef942bd0f6ec?w=400',
    'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400',
    'https://images.unsplash.com/photo-1584990347449-39f4aa4d8cf2?w=400',
    'https://images.unsplash.com/photo-1617343267882-2c441b6c3cd2?w=400',
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
    'https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=400',
  ];

  // Generate random product
  const generateProduct = (): ProductData => {
    const randomIndex = Math.floor(Math.random() * productNames.length);
    const totalAmount = Math.floor(productRange.min + Math.random() * (productRange.max - productRange.min)); // Range based on VIP tier
    
    // ACCURATE PROFIT CALCULATION: Calculate exact commission with 2 decimal precision
    // Example: $342 × 0.005 (0.5%) = $1.71 (NOT $1.00)
    const profit = parseFloat((totalAmount * commissionRate).toFixed(2));
    
    // Generate random date within last 30 days
    const now = new Date();
    const randomDays = Math.floor(Math.random() * 30);
    const randomHours = Math.floor(Math.random() * 24);
    const randomMinutes = Math.floor(Math.random() * 60);
    const randomSeconds = Math.floor(Math.random() * 60);
    
    const creationDate = new Date(now);
    creationDate.setDate(creationDate.getDate() - randomDays);
    creationDate.setHours(randomHours, randomMinutes, randomSeconds);
    
    const year = creationDate.getFullYear();
    const month = String(creationDate.getMonth() + 1).padStart(2, '0');
    const day = String(creationDate.getDate()).padStart(2, '0');
    const hours = String(creationDate.getHours()).padStart(2, '0');
    const minutes = String(creationDate.getMinutes()).padStart(2, '0');
    const seconds = String(creationDate.getSeconds()).padStart(2, '0');
    
    const creationTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    
    // Generate random rating number
    const ratingNo = Math.random().toString(36).substring(2, 15);
    
    return {
      name: productNames[randomIndex],
      image: productImages[randomIndex],
      totalAmount,
      profit,
      creationTime,
      ratingNo,
    };
  };

  // Handle Start button click
  const handleStart = () => {
    if (productsSubmitted >= maxProducts) {
      alert(`You've reached your limit of ${maxProducts} products. Upgrade your VIP tier to submit more!`);
      return;
    }

    if (!hasMinimumBalance) {
      alert(`You need at least $${minimumBalance} in your balance to start a new product. Please top up your balance.`);
      return;
    }

    if (accountFrozen) {
      alert(`Your account is currently frozen. Please contact support for assistance.`);
      return;
    }

    // Generate a new product and pass it to parent
    const product = generateProduct();
    onStartProduct(product);
  };

  // Calculate progress percentage
  const progressPercentage = (productsSubmitted / maxProducts) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-teal-300 to-cyan-400 -mx-4 -mt-4 pb-24 pt-4">
      <div className="max-w-2xl mx-auto px-4 space-y-4">
        {/* TANK Logo with Animated Background */}
        <Card className="overflow-hidden shadow-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-green-400 relative">
          {/* Animated background gradient overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-teal-500 to-green-500 opacity-30"
            animate={{ 
              backgroundPosition: ['0% 0%', '100% 100%']
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          />
          
          {/* Decorative diagonal lines pattern */}
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.05) 35px, rgba(255,255,255,0.05) 70px)',
            }}
            animate={{ x: [0, 70] }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
          />

          {/* Logo Container */}
          <div className="relative z-10 px-6 py-12 flex flex-col items-center justify-center">
            {/* Main Logo Text */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center"
            >
              <motion.h1
                className="text-5xl md:text-6xl font-bold text-white drop-shadow-lg tracking-wider"
                animate={{ 
                  scale: [1, 1.02, 1],
                  textShadow: [
                    '0 0 20px rgba(255,255,255,0.3)',
                    '0 0 40px rgba(255,255,255,0.6)',
                    '0 0 20px rgba(255,255,255,0.3)'
                  ]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                TANK
              </motion.h1>
              
              {/* Subtitle */}
              <motion.p
                className="text-xl md:text-2xl font-bold text-white drop-shadow-md mt-2 tracking-widest"
                animate={{ 
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ 
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                NEW MEDIA
              </motion.p>
            </motion.div>

            {/* Decorative elements */}
            <motion.div
              className="mt-4 flex space-x-2"
              animate={{ y: [0, 5, 0] }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="w-2 h-2 bg-white rounded-full opacity-70"></div>
              <div className="w-2 h-2 bg-white rounded-full opacity-70"></div>
              <div className="w-2 h-2 bg-white rounded-full opacity-70"></div>
            </motion.div>
          </div>
        </Card>

        {/* Main Submission Card */}
        <Card className="shadow-xl">
          <CardContent className="pt-6">
            {/* User Info */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">user</h2>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold text-gray-900">{vipTier}</span>
                <span className="text-2xl">
                  {vipTier === 'Gold' ? '👑' : vipTier === 'Silver' ? '⭐' : '🏅'}
                </span>
              </div>
            </div>

            {/* Upload Progress */}
            <div className="mb-8">
              <div className="flex items-baseline mb-3">
                <span className="text-xl font-semibold text-gray-900">Upload</span>
                <span className="text-xl font-bold text-pink-600">({productsSubmitted}/{maxProducts})</span>
              </div>
              <div className="relative">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                {/* Slider thumb */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-400 rounded-full border-2 border-white shadow-md transition-all duration-500"
                  style={{ left: `calc(${progressPercentage}% - 10px)` }}
                ></div>
              </div>
            </div>

            {/* Minimum Balance Warning */}
            {!hasMinimumBalance && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">
                      Insufficient Balance: You need at least <span className="font-bold">${minimumBalance.toFixed(2)}</span> to start tasks for {vipTier} tier.
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Please deposit funds to continue. Current balance: ${balance.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Start Button */}
            <div className="flex justify-center mb-8">
              <button
                onClick={handleStart}
                disabled={productsSubmitted >= maxProducts || !hasMinimumBalance || accountFrozen}
                className={`
                  w-32 h-32 rounded-full shadow-2xl
                  flex items-center justify-center
                  text-white text-xl font-bold
                  transition-all duration-300
                  ${productsSubmitted >= maxProducts || !hasMinimumBalance || accountFrozen ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-500 hover:bg-teal-600 hover:scale-105 active:scale-95'}
                `}
              >
                {productsSubmitted >= maxProducts ? 'Complete' : 'Start'}
              </button>
            </div>

            {/* Balance Display */}
            <div className="grid grid-cols-2 border-t-4 border-black">
              {/* Asset Balance */}
              <div className="border-r-2 border-black py-6 px-4 text-center">
                <div className="flex justify-center mb-2">
                  <div className="w-12 h-12 bg-blue-900 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Asset Balance</h3>
                <p className="text-2xl font-bold text-gray-900 mb-2">${balance.toFixed(2)}</p>
                <p className="text-xs text-gray-600">Daily profit will be added to Asset</p>
              </div>

              {/* Today's Profit */}
              <div className="py-6 px-4 text-center">
                <div className="flex justify-center mb-2">
                  <div className="w-12 h-12 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Today's Profit</h3>
                <p className="text-2xl font-bold text-gray-900 mb-2">${todaysProfit.toFixed(2)}</p>
                <p className="text-xs text-gray-600">Today's Profit to be reset daily</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="shadow-lg bg-white">
          <CardContent className="pt-6">
            <h3 className="font-bold text-gray-900 mb-3">Important Notes</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Operating Hours: 08:00 - 20:00</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>For any inquiries please contact Customer Service</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-sm text-gray-800">2024 Tanknewmedia-data. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}