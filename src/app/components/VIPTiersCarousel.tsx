import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface VIPTier {
  name: string;
  icon: string;
  price: number;
  commission: string;
  products: number;
  color: string;
  isCurrentTier?: boolean;
}

interface VIPTiersCarouselProps {
  currentTier: string;
  onClose: () => void;
}

export function VIPTiersCarousel({ currentTier, onClose }: VIPTiersCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const tiers: VIPTier[] = [
    {
      name: 'Normal',
      icon: '👑',
      price: 99,
      commission: '0.5%',
      products: 35,
      color: 'from-blue-500 to-blue-700',
      isCurrentTier: currentTier === 'Normal',
    },
    {
      name: 'Silver',
      icon: '💎',
      price: 399,
      commission: '0.75%',
      products: 40,
      color: 'from-gray-400 to-gray-600',
      isCurrentTier: currentTier === 'Silver',
    },
    {
      name: 'Gold',
      icon: '⭐',
      price: 599,
      commission: '1%',
      products: 45,
      color: 'from-yellow-400 to-yellow-600',
      isCurrentTier: currentTier === 'Gold',
    },
    {
      name: 'Platinum',
      icon: '🔷',
      price: 1999,
      commission: '1.25%',
      products: 50,
      color: 'from-cyan-400 to-cyan-600',
      isCurrentTier: currentTier === 'Platinum',
    },
    {
      name: 'Diamond',
      icon: '💎',
      price: 9999,
      commission: '1.5%',
      products: 55,
      color: 'from-purple-400 to-purple-600',
      isCurrentTier: currentTier === 'Diamond',
    },
  ];

  // Duplicate tiers for infinite scroll effect
  const extendedTiers = [...tiers, ...tiers, ...tiers];

  // Start from the middle set
  useEffect(() => {
    const currentTierIndex = tiers.findIndex(t => t.isCurrentTier);
    if (currentTierIndex >= 0) {
      setCurrentIndex(tiers.length + currentTierIndex);
    } else {
      setCurrentIndex(tiers.length);
    }
  }, []);

  const handleNext = () => {
    setCurrentIndex((prev) => {
      const next = prev + 1;
      // Reset to middle when reaching end
      if (next >= tiers.length * 2) {
        setTimeout(() => setCurrentIndex(tiers.length), 300);
        return next;
      }
      return next;
    });
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => {
      const next = prev - 1;
      // Reset to middle when reaching start
      if (next < tiers.length) {
        setTimeout(() => setCurrentIndex(tiers.length * 2 - 1), 300);
        return next;
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
        >
          <X className="h-8 w-8" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">Membership Plans</h2>
          <p className="text-white/90 text-sm">
            Hello "user" contact support to upgrade or downgrade your membership plan
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative overflow-hidden">
          {/* Navigation Buttons */}
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 shadow-xl transition-all"
          >
            <ChevronLeft className="h-6 w-6 text-gray-900" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 shadow-xl transition-all"
          >
            <ChevronRight className="h-6 w-6 text-gray-900" />
          </button>

          {/* Carousel Track */}
          <div
            ref={carouselRef}
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {extendedTiers.map((tier, index) => (
              <div key={index} className="w-full flex-shrink-0 px-12">
                <Card className={`bg-gradient-to-br ${tier.color} text-white shadow-2xl ${tier.isCurrentTier ? 'ring-4 ring-yellow-400' : ''}`}>
                  <CardContent className="pt-6 pb-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-white/30">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-3xl font-bold">{tier.name}</h3>
                        <span className="text-3xl">{tier.icon}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-4xl font-bold">${tier.price}</span>
                        {tier.isCurrentTier && (
                          <div className="bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-xs font-bold mt-1">
                            Current Tier
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-4 text-base">
                      <li className="flex items-start">
                        <span className="mr-3 mt-1">•</span>
                        <span>
                          <span className="font-semibold">{tier.name}</span> users are assigned general usage access to data collection
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 mt-1">•</span>
                        <span>
                          Applicable to most data collection situations of light to medium level of usage involving the products
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 mt-1">•</span>
                        <span>
                          <span className="font-bold text-yellow-300">Profits of {tier.commission} per product</span> - {tier.products} products per set.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 mt-1">•</span>
                        <span>Access to other premium features</span>
                      </li>
                    </ul>

                    {/* Upgrade Button */}
                    {!tier.isCurrentTier && (
                      <button className="w-full mt-6 bg-white text-gray-900 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors shadow-lg">
                        Upgrade to {tier.name}
                      </button>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center mt-6 space-x-2">
          {tiers.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(tiers.length + index)}
              className={`w-3 h-3 rounded-full transition-all ${
                (currentIndex % tiers.length) === index
                  ? 'bg-white w-8'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}