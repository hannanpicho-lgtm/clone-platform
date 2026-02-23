import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function BackendStatusIndicator() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    setStatus('checking');
    try {
      const { projectId } = await import('/utils/supabase/info');
      const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/health`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setStatus('online');
      } else {
        setStatus('offline');
      }
    } catch (error) {
      console.log('Backend health check failed:', error);
      setStatus('offline');
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Backend Online';
      case 'offline':
        return 'Backend Offline - Demo Mode';
      default:
        return 'Checking...';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4" />;
      case 'offline':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium transition-all hover:opacity-90 ${getStatusColor()}`}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </button>

      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">Backend Status</span>
              <button
                onClick={checkBackendHealth}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Refresh
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
                <span className="text-sm text-gray-700">{getStatusText()}</span>
              </div>

              {status === 'offline' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                  <p className="font-medium mb-1">⚠️ Backend Not Available</p>
                  <p className="text-xs text-amber-800">
                    The Edge Function needs to be deployed. You can still use Demo Mode to explore all features.
                  </p>
                </div>
              )}

              {status === 'online' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-900">
                  <p className="font-medium mb-1">✅ All Systems Operational</p>
                  <p className="text-xs text-green-800">
                    Backend server is responding normally.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                <span className="font-medium">Tip:</span> If offline, use Demo Mode to explore the platform with sample data.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
