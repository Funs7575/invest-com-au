"use client";

/**
 * Trust signals bar — displays honest credibility indicators
 * instead of fabricated visitor/comparison counts.
 */
export default function SocialProofBar() {
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6 py-3 text-xs text-slate-500 flex-wrap" role="status" aria-label="Trust signals">
      <span className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
        ASIC-regulated brokers only
      </span>
      <span className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
        Independent ratings
      </span>
      <span className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
        Fees verified daily
      </span>
    </div>
  );
}
