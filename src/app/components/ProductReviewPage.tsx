import { useState } from 'react';
import { Menu, Bell, ShoppingCart, Star } from 'lucide-react';

interface ProductReviewPageProps {
  onSubmit: (rating: number, review: string, reviewType: string) => void;
  onCancel: () => void;
  product: {
    name: string;
    image: string;
    totalAmount: number;
    profit: number;
    creationTime: string;
    ratingNo: string;
  };
}

export function ProductReviewPage({ onSubmit, onCancel, product }: ProductReviewPageProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewType, setReviewType] = useState('');
  const [reviewText, setReviewText] = useState('');

  const handleSubmit = () => {
    onSubmit(rating, reviewText, reviewType);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 overflow-y-auto">
      <header className="bg-[#1a1d2e] text-white sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold tracking-wider">TANK</h1>
          <div className="flex items-center space-x-3">
            <button className="p-2 relative hover:bg-white/10 rounded-lg transition-colors">
              <Bell className="h-6 w-6" />
              <span className="absolute top-1 right-1 bg-white text-[#1a1d2e] text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                0
              </span>
            </button>
            <button className="p-2 relative hover:bg-white/10 rounded-lg transition-colors">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute top-1 right-1 bg-white text-[#1a1d2e] text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                0
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="mb-5 flex justify-center">
            <div className="w-44 h-44 sm:w-52 sm:h-52 bg-gray-100 rounded-xl shadow-lg overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 px-2">
            {product.name}
          </h2>

          <div className="grid grid-cols-2 gap-4 sm:gap-8 mb-4 max-w-xl mx-auto">
            <div>
              <p className="text-sm text-gray-700 mb-1">Total amount</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600">
                ${product.totalAmount.toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-700 mb-1">Profit</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600">
                ${product.profit.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mb-2">
            <p className="text-sm text-gray-700">Creation Time</p>
            <p className="text-gray-900 font-semibold">{product.creationTime}</p>
          </div>

          <div>
            <p className="text-sm text-gray-700">Rating No.</p>
            <p className="text-gray-900 font-semibold">{product.ratingNo}</p>
          </div>
        </div>

        <div className="bg-cyan-400 rounded-lg p-4 sm:p-5 shadow-xl border-4 border-cyan-300 max-w-2xl mx-auto">
          <h3 className="text-center text-lg sm:text-xl font-bold text-gray-900 mb-3">
            Rate Us Now
          </h3>

          <div className="flex justify-center gap-2 sm:gap-3 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`h-8 w-8 sm:h-9 sm:w-9 ${
                    star <= (hoveredRating || rating)
                      ? 'fill-gray-900 text-gray-900'
                      : 'fill-gray-100 text-gray-900'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="mb-4">
            <p className="text-center font-semibold text-gray-900 mb-3 text-sm sm:text-base">
              Describe your Review (optional)
            </p>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="reviewType"
                  value="excellent"
                  checked={reviewType === 'excellent'}
                  onChange={(e) => setReviewType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-white text-xs sm:text-sm">
                  Excellent! I personally used it too, very Applicable
                </span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="reviewType"
                  value="normal"
                  checked={reviewType === 'normal'}
                  onChange={(e) => setReviewType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-white text-xs sm:text-sm">
                  Normal! Not used often but know the Product
                </span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="reviewType"
                  value="opps"
                  checked={reviewType === 'opps'}
                  onChange={(e) => setReviewType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-white text-xs sm:text-sm">
                  Opps! Not used or heard it before
                </span>
              </label>
            </div>
          </div>

          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="type here"
            className="w-full h-20 sm:h-24 px-4 py-3 rounded-lg border-2 border-gray-300 bg-gray-100 focus:border-blue-500 focus:outline-none resize-none mb-3"
          />

          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors active:scale-95"
          >
            Submit
          </button>
          <button
            onClick={onCancel}
            className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-2.5 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
