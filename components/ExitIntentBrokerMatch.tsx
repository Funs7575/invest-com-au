"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import BrokerLogo from "@/components/BrokerLogo";
import { getAffiliateLink, trackClick, trackEvent, AFFILIATE_REL } from "@/lib/tracking";

interface MatchedBroker {
  slug: string;
  name: string;
  color: string;
  icon?: string;
  logo_url?: string;
  rating: number;
  asx_fee: string;
  pros: string[];
  deal_text?: string;
  affiliate_url?: string;
}

interface ExitMatchResponse {
  broker: MatchedBroker;
  reason: string;
}

/**
 * Exit-intent modal that shows a personalized broker recommendation.
 * Triggers on mouse leaving viewport (desktop) or back button tap (mobile).
 * Suppressed if ExitIntentCapture already fired this session.
 */
export default function ExitIntentBrokerMatch() {
  const [show, setShow] = useState(false);
  const [match, setMatch] = useState<ExitMatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const trigger = useCallback(async () => {
    if (typeof window === "undefined") return;
    // Don't show if exit email popup already shown, or this popup already shown
    if (sessionStorage.getItem("exit_popup_shown")) return;
    if (sessionStorage.getItem("exit_broker_match_shown")) return;
    if (sessionStorage.getItem("email_captured")) return;
    // Don't show on admin/advisor pages
    if (window.location.pathname.startsWith("/admin") || window.location.pathname.startsWith("/advisor")) return;

    sessionStorage.setItem("exit_broker_match_shown", "1");
    setLoading(true);
    setShow(true);

    try {
      const res = await fetch("/api/exit-match");
      if (res.ok) {
        const data: ExitMatchResponse = await res.json();
        setMatch(data);
        trackEvent("exit_broker_match_impression", {
          broker_slug: data.broker.slug,
          reason: data.reason,
        });
      }
    } catch {
      // Silently fail — close the modal if fetch fails
      setShow(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Desktop: mouse leaving viewport
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("exit_broker_match_shown") || sessionStorage.getItem("exit_popup_shown")) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !fetchedRef.current) {
        fetchedRef.current = true;
        trigger();
      }
    };

    // Delay before attaching — don't annoy users who just arrived
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 20000); // 20 seconds

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [trigger]);

  // Mobile: back button / popstate
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("exit_broker_match_shown") || sessionStorage.getItem("exit_popup_shown")) return;

    const timer = setTimeout(() => {
      // Push a dummy state so we can intercept back
      window.history.pushState({ exitMatch: true }, "");

      const handlePopState = (e: PopStateEvent) => {
        if (e.state?.exitMatch !== undefined && !fetchedRef.current) {
          fetchedRef.current = true;
          trigger();
        }
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }, 20000);

    return () => clearTimeout(timer);
  }, [trigger]);

  const dismiss = useCallback(() => {
    setShow(false);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!show) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [show, dismiss]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Personalized broker recommendation"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-center relative">
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <Icon name="x" size={20} />
          </button>
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-2">
            <Icon name="target" size={22} className="text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-0.5">Before you go</h2>
          <p className="text-sm text-slate-300">We found your best match</p>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading && !match ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-sm text-slate-500">Finding your match...</span>
            </div>
          ) : match ? (
            <>
              {/* Broker card */}
              <div className="border border-slate-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <BrokerLogo broker={match.broker} size="md" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">{match.broker.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="text-amber-500">{"★".repeat(Math.floor(match.broker.rating))}</span>
                      <span>{match.broker.rating}/5</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">ASX brokerage</p>
                    <p className="text-sm font-bold text-slate-900">{match.broker.asx_fee || "N/A"}</p>
                  </div>
                </div>

                {/* Reason */}
                <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5 mb-3">
                  <Icon name="check-circle" size={12} className="inline mr-1 -mt-0.5" />
                  {match.reason}
                </p>

                {/* Top 2 pros */}
                {match.broker.pros && match.broker.pros.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {match.broker.pros.slice(0, 2).map((pro, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <Icon name="check" size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{pro}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Deal text */}
                {match.broker.deal_text && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-700 mb-3">
                    <Icon name="zap" size={12} className="inline mr-1 -mt-0.5" />
                    {match.broker.deal_text}
                  </div>
                )}

                {/* CTAs */}
                <div className="flex gap-2">
                  <a
                    href={getAffiliateLink(match.broker as Parameters<typeof getAffiliateLink>[0])}
                    target="_blank"
                    rel={AFFILIATE_REL}
                    onClick={() => {
                      trackClick(
                        match.broker.slug,
                        match.broker.name,
                        "exit-broker-match",
                        typeof window !== "undefined" ? window.location.pathname : "/",
                        undefined,
                        undefined,
                        "exit_intent"
                      );
                      trackEvent("exit_broker_match_click", {
                        broker_slug: match.broker.slug,
                        action: "open_account",
                      });
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-all text-center"
                  >
                    Open Account
                    <Icon name="arrow-right" size={14} className="inline ml-1 -mt-0.5" />
                  </a>
                  <Link
                    href={`/broker/${match.broker.slug}`}
                    onClick={() => {
                      trackEvent("exit_broker_match_click", {
                        broker_slug: match.broker.slug,
                        action: "full_review",
                      });
                      dismiss();
                    }}
                    className="px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-all text-center"
                  >
                    See Full Review
                  </Link>
                </div>
              </div>

              <button
                onClick={dismiss}
                className="w-full text-xs text-slate-400 hover:text-slate-600 text-center"
              >
                No thanks, I&apos;ll keep looking
              </button>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500">Couldn&apos;t load recommendation.</p>
              <button onClick={dismiss} className="mt-2 text-xs text-slate-400 hover:text-slate-600">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
