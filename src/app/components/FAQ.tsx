import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  views: number;
}

interface FAQProps {
  accessToken: string;
}

const BASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';

export function FAQ({ accessToken }: FAQProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/make-server-44a642d3/faq`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (data.faqs) {
        setFaqs(data.faqs);
        setFilteredFaqs(data.faqs);

        // Extract unique categories
        const cats = [...new Set(data.faqs.map((f: FAQ) => f.category))].sort();
        setCategories(cats);
      }
    } catch (err) {
      console.error('Error fetching FAQs:', err);
      setError('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFAQs();
  }, [accessToken]);

  useEffect(() => {
    let results = faqs;

    // Filter by search query
    if (searchQuery) {
      results = results.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory) {
      results = results.filter((faq) => faq.category === selectedCategory);
    }

    // Sort by views (most helpful first)
    results = results.sort((a, b) => (b.views || 0) - (a.views || 0));

    setFilteredFaqs(results);
  }, [searchQuery, selectedCategory, faqs]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-300 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700">{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h2>
        <p className="text-gray-600">Find answers to common questions about the platform</p>
      </div>

      {/* Search Bar */}
      <Card className="p-6 bg-white border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </Card>

      {/* Category Filter */}
      {categories.length > 0 && (
        <Card className="p-6 bg-white border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase">Filter by Category</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-full font-semibold transition-colors ${
                selectedCategory === ''
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full font-semibold transition-colors ${
                  selectedCategory === cat
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Results Count */}
      <p className="text-sm text-gray-600">
        Showing <span className="font-bold">{filteredFaqs.length}</span> FAQ{filteredFaqs.length !== 1 ? 's' : ''}
      </p>

      {/* FAQs by Category */}
      {filteredFaqs.length > 0 ? (
        <div className="space-y-4">
          {categories
            .filter((cat) => !selectedCategory || selectedCategory === cat)
            .map((category) => {
              const categoryFaqs = filteredFaqs.filter((faq) => faq.category === category);
              if (categoryFaqs.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                    {category}
                  </h3>
                  <div className="space-y-3">
                    {categoryFaqs.map((faq) => (
                      <Card
                        key={faq.id}
                        className="p-4 bg-white border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 text-lg flex items-start gap-2">
                              <span className="text-xl">❓</span>
                              {faq.question}
                            </h4>

                            {expandedId === faq.id && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                  {faq.answer}
                                </p>
                                <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                                  👀 <span>{faq.views || 0} people found this helpful</span>
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0 ml-4">
                            {expandedId === faq.id ? (
                              <ChevronUp className="w-6 h-6 text-purple-500" />
                            ) : (
                              <ChevronDown className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <Card className="p-8 text-center bg-gray-50">
          <p className="text-gray-600 mb-2">No FAQs found matching your search</p>
          <p className="text-sm text-gray-500">Try adjusting your filters or search terms</p>
        </Card>
      )}

      {/* Popular FAQs Card */}
      {filteredFaqs.length === faqs.length && (
        <Card className="p-6 bg-purple-50 border-purple-200">
          <h4 className="font-bold text-gray-900 mb-3">⭐ Most Helpful</h4>
          <div className="space-y-2">
            {faqs
              .sort((a, b) => (b.views || 0) - (a.views || 0))
              .slice(0, 3)
              .map((faq) => (
                <div
                  key={faq.id}
                  className="text-sm text-gray-700 flex items-center gap-2 cursor-pointer hover:text-purple-600 transition-colors"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                    setExpandedId(faq.id);
                  }}
                >
                  <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                  {faq.question} ({faq.views} views)
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Still Need Help */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h4 className="font-bold text-gray-900 mb-3">Didn't find what you're looking for?</h4>
        <p className="text-gray-700 mb-4">
          We're here to help! Create a support ticket or start a live chat with our support team
        </p>
        <div className="flex flex-wrap gap-3">
          <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors">
            Create Support Ticket
          </button>
          <button className="px-6 py-2 bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold rounded-lg transition-colors">
            Start Live Chat
          </button>
        </div>
      </Card>
    </div>
  );
}
