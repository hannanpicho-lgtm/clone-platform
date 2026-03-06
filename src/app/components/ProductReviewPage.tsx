import { useState } from 'react';
import { Button } from './ui/button';
import { Menu, Bell, Star } from 'lucide-react';
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

  // Original layout and logic restored
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
  // Find index by product name
  const productIndex = productNames.findIndex(n => n === product.name);
  let uniqueImage = productIndex !== -1 ? productImages[productIndex] : product.image;
  // Fallback to category image if mismatch
  const categoryImages: Record<string, string> = {
    electronics: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
    furniture: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=400',
    kitchen: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    default: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=400',
  };
  // Simple category detection
  function getCategory(name: string) {
    if (/desk|lamp|charger|headphones|camera|tracker|vacuum|air fryer|security/i.test(name)) return 'electronics';
    if (/chair|office|sofa|table/i.test(name)) return 'furniture';
    if (/cookware|pan|utensil|kitchen|container|milk frother/i.test(name)) return 'kitchen';
    return 'default';
  }
  let imageMismatch = false;
  if (productIndex !== -1 && product.image !== productImages[productIndex]) {
    imageMismatch = true;
    uniqueImage = categoryImages[getCategory(product.name)];
  }

  // Manual image upload state
  const [manualImage, setManualImage] = useState<string | null>(null);
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setManualImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    onSubmit(rating, reviewText, reviewType);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen">
      <div className="relative w-full flex flex-col items-center">
        {/* Product image and name centered */}
        <div className="flex flex-col items-center mt-8">
          <img src={product.image} alt="Product" className="w-32 h-32 rounded-lg object-cover mb-2" />
          <div className="font-bold text-2xl text-gray-900 mb-2 text-center" style={{margin: 0}}>
            {product.name}
          </div>
        </div>
        {/* Product details centered */}
        <div className="flex flex-row justify-center items-center gap-8 mb-4">
          <div className="text-lg text-gray-700 text-center">
            <div>Total amount</div>
            <div className="text-red-600 text-2xl font-bold">${product.totalAmount}</div>
          </div>
          <div className="text-lg text-gray-700 text-center">
            <div>Profit</div>
            <div className="text-red-600 text-2xl font-bold">${product.profit}</div>
          </div>
        </div>
        <div className="text-center text-gray-700 mb-2">Creation Time<br />{product.creationTime}</div>
        <div className="text-center text-gray-700 mb-6">Rating No.<br />{product.ratingNo}</div>
      </div>
    </div>
  );
}