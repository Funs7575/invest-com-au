"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-brand mb-2">Something went wrong</h2>
        <p className="text-slate-600 mb-6">
          We hit an unexpected error. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-amber text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
