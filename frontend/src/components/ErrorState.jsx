export default function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
      <p>{message || 'Something went wrong. Please try again.'}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-3 rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
