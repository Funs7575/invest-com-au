"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-16">
      <div className="container-custom max-w-lg text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500 mb-4">An error occurred loading this page. Please try again.</p>
        <button onClick={reset} className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors">
          Try Again
        </button>
      </div>
    </div>
  );
}
