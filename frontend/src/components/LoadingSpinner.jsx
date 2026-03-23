export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex items-center gap-3 text-slate-600">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      <span>{label}</span>
    </div>
  );
}
