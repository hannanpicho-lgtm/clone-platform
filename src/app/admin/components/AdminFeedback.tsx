import { AlertCircle } from 'lucide-react';

interface AdminFeedbackProps {
  success?: string;
  error?: string;
}

export function AdminFeedback({ success, error }: AdminFeedbackProps) {
  if (!success && !error) return null;
  return (
    <>
      {success && <div className="text-sm text-green-600">{success}</div>}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </>
  );
}
