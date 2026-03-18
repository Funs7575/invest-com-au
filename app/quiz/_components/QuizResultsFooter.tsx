"use client";

import Link from "next/link";
import type { Broker } from "@/lib/types";
import { trackEvent } from "@/lib/tracking";
import Icon from "@/components/Icon";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";

interface ScoredResult {
  slug: string;
  total: number;
  broker?: Broker;
}

interface Props {
  results: ScoredResult[];
  answers: string[];
  emailGate: boolean;
  gateEmail: string;
  gateStatus: "idle" | "loading" | "error";
  copied: boolean;
  topMatch: ScoredResult | undefined;
  onGateEmailChange: (email: string) => void;
  onGateSubmit: () => void;
  onEmailGateSent: () => void;
  onGateConsentSet: () => void;
  onShareResult: () => void;
  onRestart: () => void;
}

export default function QuizResultsFooter({
  results,
  answers,
  emailGate,
  gateEmail,
  gateStatus,
  copied,
  topMatch,
  onGateEmailChange,
  onGateSubmit,
  onEmailGateSent,
  onGateConsentSet,
  onShareResult,
  onRestart,
}: Props) {
  return (
    <>
      {/* Email capture — non-blocking, below results */}
      {!emailGate && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 md:p-5 mb-3 md:mb-6 result-card-in result-card-in-delay-5">
          <div className="flex items-start gap-2.5 md:gap-4">
            <Icon name="mail" size={20} className="text-slate-700 shrink-0 md:hidden" />
            <Icon name="mail" size={28} className="text-slate-700 shrink-0 hidden md:block" />
            <div className="flex-1">
              <h3 className="font-bold text-xs md:text-sm mb-0.5 md:mb-1">Get your results emailed</h3>
              <p className="text-[0.62rem] md:text-xs text-slate-500 mb-2 md:mb-3">We&apos;ll send your shortlist + our free fee comparison PDF.</p>
              <div className="flex flex-col sm:flex-row gap-1.5 md:gap-2">
                <input
                  type="email"
                  placeholder="you@email.com"
                  autoComplete="email"
                  aria-label="Email address for quiz results"
                  value={gateEmail}
                  onChange={(e) => onGateEmailChange(e.target.value)}
                  className="flex-1 px-2.5 py-2 md:px-3 rounded-lg border border-slate-200 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-700/30 focus:border-blue-700"
                />
                <button
                  onClick={async () => {
                    if (!gateEmail || !gateEmail.includes("@")) return;
                    onGateConsentSet();
                    await onGateSubmit();
                    onEmailGateSent();
                  }}
                  disabled={gateStatus === "loading" || !gateEmail.includes("@")}
                  className="px-3 py-2 md:px-4 bg-slate-900 text-white text-xs md:text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60 shrink-0"
                >
                  {gateStatus === "loading" ? "Sending..." : "Email Me"}
                </button>
              </div>
              {gateStatus === "error" && (
                <p className="text-[0.62rem] md:text-xs text-red-500 mt-1">Something went wrong. Please try again.</p>
              )}
              <p className="text-[0.56rem] md:text-xs text-slate-400 mt-1.5 md:mt-2">
                By submitting, you consent to receiving emails from Invest.com.au. No spam. Unsubscribe anytime.{" "}
                <Link href="/privacy" className="underline hover:text-slate-900">Privacy Policy</Link> &middot;{" "}
                <Link href="/terms" className="underline hover:text-slate-900">Terms</Link>
              </p>
            </div>
          </div>
        </div>
      )}
      {emailGate && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4 mb-3 md:mb-6 text-center">
          <span className="text-xs md:text-sm text-slate-700 font-medium">✓ Results sent to {gateEmail}</span>
        </div>
      )}

      {/* Pro upsell hidden for launch */}

      <div className="my-3 md:my-6">
        <CompactDisclaimerLine />
      </div>

      {/* Bottom CTA card */}
      <div className="bg-amber-400 text-slate-900 rounded-xl p-4 md:p-6 mt-1 md:mt-2 mb-4 md:mb-8 text-center result-card-in result-card-in-delay-5">
        <h3 className="text-sm md:text-lg font-bold mb-0.5 md:mb-1">Still not sure?</h3>
        <p className="text-[0.69rem] md:text-sm text-slate-700 mb-3 md:mb-4">Compare all platforms or read detailed reviews.</p>
        <div className="flex flex-row gap-2 md:gap-3 justify-center flex-wrap">
          <a
            href="/compare"
            onClick={() => trackEvent('quiz_internal_cta', { target: 'compare' }, '/quiz')}
            className="px-3 py-2 md:px-5 md:py-2.5 bg-slate-900 text-white text-[0.69rem] md:text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Compare All →
          </a>
          {topMatch?.broker && (
            <a
              href={`/broker/${topMatch.broker.slug}`}
              onClick={() => trackEvent('quiz_internal_cta', { target: 'review', broker: topMatch.broker!.slug }, '/quiz')}
              className="px-3 py-2 md:px-5 md:py-2.5 border border-slate-700 text-slate-900 text-[0.69rem] md:text-sm font-semibold rounded-lg hover:bg-amber-300 transition-colors"
            >
              {topMatch.broker.name} Review →
            </a>
          )}
          <a
            href="/find-advisor"
            onClick={() => trackEvent('quiz_internal_cta', { target: 'find-advisor' }, '/quiz')}
            className="px-3 py-2 md:px-5 md:py-2.5 border border-slate-700 text-slate-900 text-[0.69rem] md:text-sm font-semibold rounded-lg hover:bg-amber-300 transition-colors"
          >
            Find Advisor →
          </a>
        </div>
      </div>

      {/* Share & Restart */}
      <div className="mt-4 md:mt-6">
        <p className="text-[0.62rem] md:text-xs text-slate-400 text-center mb-2 font-medium">Share your result</p>
        <div className="flex items-center justify-center gap-2 md:gap-3">
          {/* Twitter/X */}
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just found ${results[0]?.broker?.name || "my top platform"} as my best investing platform match on @InvestComAu! Take the quiz:`)}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin + "/quiz" : "https://invest.com.au/quiz")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-lg bg-slate-900 hover:bg-slate-700 flex items-center justify-center transition-colors"
            aria-label="Share on X"
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          {/* WhatsApp */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`I just matched with ${results[0]?.broker?.name || "a top platform"} on Invest.com.au! Try the quiz: ${typeof window !== "undefined" ? window.location.origin + "/quiz" : "https://invest.com.au/quiz"}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-lg bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-colors"
            aria-label="Share on WhatsApp"
          >
            <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </a>
          {/* Copy link */}
          <button
            onClick={onShareResult}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              copied ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
            aria-label="Copy link"
          >
            {copied ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            )}
          </button>
          {/* Native share (mobile) */}
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              onClick={onShareResult}
              className="w-10 h-10 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-600 flex items-center justify-center transition-colors"
              aria-label="Share"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </button>
          )}
        </div>
        <div className="text-center mt-3">
          <button
            onClick={onRestart}
            className="text-[0.69rem] md:text-sm text-slate-500 hover:text-slate-700 font-semibold transition-colors"
          >
            Restart Quiz →
          </button>
        </div>
      </div>
    </>
  );
}
