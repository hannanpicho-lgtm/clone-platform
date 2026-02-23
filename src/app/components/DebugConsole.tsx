import { useState } from 'react';
import { Terminal, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  timestamp: string;
}

export function DebugConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      type: 'info',
      message: 'Debug console initialized',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs((prev) => [
      {
        type,
        message,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  };

  const testBackend = async () => {
    addLog('info', 'Testing backend connection...');
    
    try {
      const { projectId } = await import('/utils/supabase/info');
      addLog('success', `Project ID: ${projectId}`);
      
      const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/health`;
      addLog('info', `Health URL: ${healthUrl}`);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        addLog('success', `Backend is online! Response: ${JSON.stringify(data)}`);
      } else {
        addLog('error', `Backend returned status: ${response.status}`);
      }
    } catch (error: any) {
      addLog('error', `Backend connection failed: ${error.message}`);
      addLog('warning', 'Using demo mode - this is expected if backend is not deployed');
    }
  };

  const testSupabaseClient = async () => {
    addLog('info', 'Testing Supabase client...');
    
    try {
      const { getSupabaseClient } = await import('/utils/supabase/client');
      const supabase = getSupabaseClient();
      
      if (supabase) {
        addLog('success', 'Supabase client initialized successfully');
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          addLog('warning', `Session check: ${error.message}`);
        } else if (data.session) {
          addLog('success', `Active session found for user: ${data.session.user.email}`);
        } else {
          addLog('info', 'No active session (user not logged in)');
        }
      } else {
        addLog('error', 'Supabase client failed to initialize');
      }
    } catch (error: any) {
      addLog('error', `Supabase client error: ${error.message}`);
    }
  };

  const clearLogs = () => {
    setLogs([
      {
        type: 'info',
        message: 'Logs cleared',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Terminal className="w-4 h-4 text-blue-600" />;
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-900 text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-colors z-50"
        title="Open Debug Console"
      >
        <Terminal className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-900 text-white p-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          <span className="font-semibold">Debug Console</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-gray-800 p-1 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Actions */}
      <div className="p-3 border-b border-gray-200 space-y-2">
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={testBackend}
            className="flex-1 text-xs"
          >
            Test Backend
          </Button>
          <Button
            size="sm"
            onClick={testSupabaseClient}
            variant="outline"
            className="flex-1 text-xs"
          >
            Test Client
          </Button>
        </div>
        <Button
          size="sm"
          onClick={clearLogs}
          variant="outline"
          className="w-full text-xs"
        >
          Clear Logs
        </Button>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {logs.map((log, index) => (
          <div
            key={index}
            className={`text-xs p-2 rounded border ${getLogColor(log.type)}`}
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5">{getLogIcon(log.type)}</div>
              <div className="flex-1">
                <div className="font-mono text-xs text-gray-500 mb-1">
                  {log.timestamp}
                </div>
                <div className="break-words">{log.message}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-200 bg-gray-50 rounded-b-lg text-xs text-gray-600 text-center">
        {logs.length} log{logs.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
