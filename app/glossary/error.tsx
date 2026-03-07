"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-12 text-center">
      <h2 className="text-lg font-bold text-slate-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-slate-500 mb-4">{error.message || "An unexpected error occurred."}</p>
      <div className="flex gap-2 justify-center">
        <button onClick={reset} className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800">Try Again</button>
        <a href="/" className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">Home</a>
      </div>
    </div>
  );
}
