import { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function SystemHealthCheck() {
  const [results, setResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runHealthCheck = async () => {
    setIsRunning(true);
    const testResults: any = {
      timestamp: new Date().toISOString(),
      tests: [],
    };

    try {
      // Test 1: Supabase Config
      console.log('🔍 Test 1: Checking Supabase configuration...');
      try {
        const { projectId, publicAnonKey } = await import('/utils/supabase/info');
        testResults.tests.push({
          name: 'Supabase Configuration',
          status: projectId && publicAnonKey ? 'pass' : 'fail',
          details: {
            projectId: projectId ? `${projectId.substring(0, 8)}...` : 'Missing',
            anonKey: publicAnonKey ? 'Present' : 'Missing',
          },
        });
      } catch (error: any) {
        testResults.tests.push({
          name: 'Supabase Configuration',
          status: 'fail',
          error: error.message,
        });
      }

      // Test 2: Backend Health Endpoint
      console.log('🔍 Test 2: Testing backend health endpoint...');
      try {
        const { projectId } = await import('/utils/supabase/info');
        const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/health`;
        
        const healthResponse = await fetch(healthUrl, {
          method: 'GET',
        });

        const healthData = await healthResponse.json();
        
        testResults.tests.push({
          name: 'Backend Health Check',
          status: healthResponse.ok ? 'pass' : 'fail',
          details: {
            url: healthUrl,
            statusCode: healthResponse.status,
            response: healthData,
          },
        });
      } catch (error: any) {
        testResults.tests.push({
          name: 'Backend Health Check',
          status: 'fail',
          error: error.message,
          details: {
            message: 'Backend not responding. The Edge Function may not be deployed.',
          },
        });
      }

      // Test 3: Authentication Setup
      console.log('🔍 Test 3: Testing Supabase client...');
      try {
        const { getSupabaseClient } = await import('/utils/supabase/client');
        const supabase = getSupabaseClient();
        
        testResults.tests.push({
          name: 'Supabase Client',
          status: supabase ? 'pass' : 'fail',
          details: {
            initialized: !!supabase,
          },
        });
      } catch (error: any) {
        testResults.tests.push({
          name: 'Supabase Client',
          status: 'fail',
          error: error.message,
        });
      }

      // Test 4: Component Imports
      console.log('🔍 Test 4: Verifying component structure...');
      try {
        await import('./Dashboard');
        await import('./AuthPage');
        await import('./ProductsView');
        
        testResults.tests.push({
          name: 'Core Components',
          status: 'pass',
          details: {
            dashboard: 'Loaded',
            authPage: 'Loaded',
            productsView: 'Loaded',
          },
        });
      } catch (error: any) {
        testResults.tests.push({
          name: 'Core Components',
          status: 'fail',
          error: error.message,
        });
      }

      setResults(testResults);
    } catch (error: any) {
      console.error('Health check error:', error);
      setResults({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🏥 System Health Check</span>
          <Button 
            onClick={runHealthCheck} 
            disabled={isRunning}
            size="sm"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              'Run Diagnostics'
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!results && !isRunning && (
          <div className="text-center py-8 text-gray-600">
            Click "Run Diagnostics" to test the app configuration
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">Test Time</span>
              <span className="text-xs text-gray-600">
                {new Date(results.timestamp).toLocaleString()}
              </span>
            </div>

            {results.tests && results.tests.map((test: any, index: number) => (
              <div
                key={index}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(test.status)}
                    <span className="font-medium">{test.name}</span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      test.status === 'pass'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {test.status.toUpperCase()}
                  </span>
                </div>

                {test.details && (
                  <div className="ml-7 text-sm">
                    <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  </div>
                )}

                {test.error && (
                  <div className="ml-7 text-sm text-red-600 bg-red-50 p-2 rounded">
                    ❌ {test.error}
                  </div>
                )}
              </div>
            ))}

            {/* Summary */}
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">
                    {results.tests.filter((t: any) => t.status === 'pass').length}
                  </div>
                  <div className="text-xs text-green-700">Passed</div>
                </div>
                <div className="p-3 bg-red-50 rounded">
                  <div className="text-2xl font-bold text-red-600">
                    {results.tests.filter((t: any) => t.status === 'fail').length}
                  </div>
                  <div className="text-xs text-red-700">Failed</div>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-2xl font-bold text-gray-600">
                    {results.tests.length}
                  </div>
                  <div className="text-xs text-gray-700">Total</div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {results.tests.some((t: any) => t.status === 'fail') && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Action Required</h4>
                <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                  {results.tests.find((t: any) => t.name === 'Backend Health Check' && t.status === 'fail') && (
                    <li>Deploy the Edge Function to Supabase</li>
                  )}
                  {results.tests.find((t: any) => t.name === 'Supabase Configuration' && t.status === 'fail') && (
                    <li>Configure Supabase credentials</li>
                  )}
                  <li>Check the console for detailed error messages</li>
                </ul>
              </div>
            )}

            {results.tests.every((t: any) => t.status === 'pass') && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <h4 className="font-semibold text-green-900 mb-1">✅ All Systems Operational</h4>
                <p className="text-sm text-green-700">
                  Your app is properly configured and ready to use!
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
