import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface BackendErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onDemoMode: () => void;
}

export function BackendErrorModal({ isOpen, onClose, onRetry, onDemoMode }: BackendErrorModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">Backend Connection Issue</DialogTitle>
          <DialogDescription className="text-center">
            We're having trouble connecting to the backend server.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Try Demo Mode
            </h4>
            <p className="text-sm text-blue-800">
              Explore the full platform with sample data while we work on getting the backend online.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Possible Causes:</h4>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Edge Function not deployed to Supabase</li>
              <li>Backend server is starting up</li>
              <li>Temporary network issue</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">To Deploy Backend:</h4>
            <code className="text-xs bg-green-100 text-green-800 p-2 rounded block">
              supabase functions deploy server
            </code>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onRetry}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Connection
          </Button>
          <Button
            onClick={onDemoMode}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Use Demo Mode
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
