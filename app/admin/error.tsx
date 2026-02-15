"use client";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-white mb-2">Admin Error</h2>
        <p className="text-slate-400 mb-4 text-sm">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-amber-500 text-black font-medium rounded hover:bg-amber-400 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
