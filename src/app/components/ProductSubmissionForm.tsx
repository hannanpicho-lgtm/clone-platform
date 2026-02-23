import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { AlertCircle, Loader2, Package, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface SubmissionResponse {
  success: boolean;
  product: {
    name: string;
    value: number;
    userEarned: number;
    parentShare: number;
  };
  newBalance: number;
}

export function ProductSubmissionForm({
  accessToken,
  onSuccess,
}: {
  accessToken: string;
  onSuccess: () => void;
}) {
  const [productName, setProductName] = useState('');
  const [productValue, setProductValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [result, setResult] = useState<SubmissionResponse['product'] | null>(null);

  const BASE_URL = 'https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setResult(null);

    if (!productName.trim()) {
      setError('Product name is required');
      return;
    }

    const value = parseFloat(productValue);
    if (isNaN(value) || value <= 0) {
      setError('Product value must be a positive number');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/submit-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          productName: productName.trim(),
          productValue: value,
        }),
      });

      const data = await response.json() as SubmissionResponse;

      if (!response.ok) {
        throw new Error(data as any || 'Failed to submit product');
      }

      setResult(data.product);
      setSuccess(`✅ Product submitted! You earned $${data.product.userEarned.toFixed(2)}`);
      setProductName('');
      setProductValue('');

      // Refresh parent data
      setTimeout(onSuccess, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <Package className="w-5 h-5" />
            Submit Your Product
          </CardTitle>
          <CardDescription>
            Submit a product and earn 80% of its value instantly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name / Title
              </label>
              <Input
                type="text"
                placeholder="e.g., Premium Service, Custom Design, etc."
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                disabled={loading}
                className="border-orange-200 focus:border-orange-400"
              />
            </div>

            {/* Product Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Value ($)
              </label>
              <Input
                type="number"
                placeholder="e.g., 1000"
                value={productValue}
                onChange={(e) => setProductValue(e.target.value)}
                disabled={loading}
                min="0.01"
                step="0.01"
                className="border-orange-200 focus:border-orange-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                You'll earn 80% (${((parseFloat(productValue) || 0) * 0.8).toFixed(2)}) from this sale
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            {/* Earnings Preview */}
            {productValue && !error && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Earnings Preview:</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-green-600 font-medium">You Earn (80%)</p>
                    <p className="text-2xl font-bold text-green-700">
                      ${((parseFloat(productValue) || 0) * 0.8).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Parent Gets (20%)</p>
                    <p className="text-2xl font-bold text-blue-700">
                      ${((parseFloat(productValue) || 0) * 0.2).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Submit Product & Earn
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Success Result Card */}
      {result && (
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader>
            <CardTitle className="text-green-900">🎉 Product Submitted Successfully!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-green-200">
                <span className="text-gray-700">Product</span>
                <span className="font-semibold text-gray-900">{result.name}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-green-200">
                <span className="text-gray-700">Sale Value</span>
                <span className="font-semibold text-gray-900">${result.value.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-green-200">
                <span className="text-gray-700">Your Earnings (80%)</span>
                <span className="font-bold text-green-600">${result.userEarned.toFixed(2)}</span>
              </div>

              {result.parentShare > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-green-200">
                  <span className="text-gray-700">Parent Commission (20%)</span>
                  <span className="font-semibold text-blue-600">${result.parentShare.toFixed(2)}</span>
                </div>
              )}

              <div className="pt-2 mt-2 border-t-2 border-green-300">
                <p className="text-xs text-green-700 mb-1">Updated Balance</p>
                <p className="text-3xl font-bold text-green-900">${result.userEarned.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          💡 <strong>How it works:</strong> Submit a product, earn 80% of its value. If you were
          referred by someone, they earn 20%. This builds passive income from your referral network!
        </AlertDescription>
      </Alert>

      {/* Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Example Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Product worth $500...</span>
              <span className="font-semibold text-green-600">You earn $400</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Product worth $1000...</span>
              <span className="font-semibold text-green-600">You earn $800</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Product worth $5000...</span>
              <span className="font-semibold text-green-600">You earn $4000</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
