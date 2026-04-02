interface AdminEmptyStateProps {
  message?: string;
}

export function AdminEmptyState({ message = 'No records found.' }: AdminEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
