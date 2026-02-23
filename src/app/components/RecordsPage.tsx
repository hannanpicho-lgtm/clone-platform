import { useState } from 'react';
import { X } from 'lucide-react';
import { Card, CardContent } from './ui/card';

export interface RecordItem {
  id: string;
  timestamp: string;
  productName: string;
  productImage: string;
  totalAmount: number;
  profit: number;
  status: 'approved' | 'pending' | 'frozen';
}

interface RecordsPageProps {
  records: RecordItem[];
  onClose: () => void;
}

export function RecordsPage({ records, onClose }: RecordsPageProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'frozen' | 'approved'>('all');

  // Filter records based on active tab
  const filteredRecords = records.filter(record => {
    if (activeTab === 'all') return true;
    return record.status === activeTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'frozen':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-blue-700 text-white p-4 flex items-center justify-between shadow-lg z-10">
        <h1 className="text-xl font-bold">Records</h1>
        <button
          onClick={onClose}
          className="bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-blue-600 px-4 pt-4 pb-2 sticky top-[60px] z-10">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'all'
                ? 'bg-white text-blue-600'
                : 'bg-blue-500 text-white hover:bg-blue-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'pending'
                ? 'bg-white text-blue-600'
                : 'bg-blue-500 text-white hover:bg-blue-400'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('frozen')}
            className={`px-6 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'frozen'
                ? 'bg-white text-blue-600'
                : 'bg-blue-500 text-white hover:bg-blue-400'
            }`}
          >
            Frozen
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-6 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'approved'
                ? 'bg-white text-blue-600'
                : 'bg-blue-500 text-white hover:bg-blue-400'
            }`}
          >
            Approved
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 pb-8">
        {filteredRecords.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="pt-6 pb-6">
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-gray-600 font-medium">
                  {activeTab === 'all' && 'No records yet'}
                  {activeTab === 'pending' && 'No pending items'}
                  {activeTab === 'frozen' && 'No frozen items'}
                  {activeTab === 'approved' && 'No approved items'}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Start submitting products to see records here
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredRecords.map((record) => (
            <div key={record.id} className="space-y-2">
              {/* Timestamp and Status */}
              <div className="flex items-center justify-between">
                <p className="text-white text-sm font-medium">{record.timestamp}</p>
                <span className={`${getStatusColor(record.status)} text-white px-4 py-1 rounded-full text-xs font-semibold`}>
                  {record.status}
                </span>
              </div>

              {/* Record Card */}
              <Card className="shadow-lg border-2 border-blue-300 overflow-hidden">
                <CardContent className="p-4">
                  {/* Product Info */}
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={record.productImage}
                        alt={record.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 leading-tight">
                        {record.productName}
                      </h3>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 mb-3"></div>

                  {/* Amount and Profit */}
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="text-xs text-gray-600 mb-1">Total Amount</p>
                      <p className="text-lg font-bold text-gray-900">$ {(record.totalAmount || 0).toFixed(0)}</p>
                    </div>
                    <div className="w-px h-12 bg-gray-200"></div>
                    <div className="text-center flex-1">
                      <p className="text-xs text-gray-600 mb-1">Profit</p>
                      <p className="text-lg font-bold text-green-600">$ {(record.profit || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  );
}