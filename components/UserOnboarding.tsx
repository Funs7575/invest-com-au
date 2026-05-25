"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

const STORAGE_KEY = "user_onboarding_seen";
const HEADING_ID = "onboarding-dialog-title";

export default function UserOnboarding() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  // Holds the element that was focused before the modal opened so we can restore it on close.
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "true") return;
    setVisible(true);
  }, []);

  // Capture the previously-focused element and auto-focus the dialog on open.
  useEffect(() => {
    if (!visible) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    // Auto-focus the first interactive element inside the dialog.
    setTimeout(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    }, 50);
  }, [visible]);

  // Esc-to-close + focus trap (matches ConfirmDialog / BottomSheet pattern).
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismiss();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // `dismiss` is defined below but stable across renders — ESLint is satisfied
    // because this effect only needs to re-run when `visible` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /** Close the modal and optionally persist the dismissal to localStorage. */
  const close = (persist: boolean) => {
    if (persist) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setVisible(false);
    // Restore focus to the element that was focused before the modal opened.
    previousFocusRef.current?.focus();
  };

  /**
   * "Skip" and Esc use the current checkbox value to decide whether to persist.
   * The final-step CTAs always navigate, so they always persist (user has acted).
   */
  const dismiss = () => close(dontShowAgain);

  const navigateAndClose = (href: string) => {
    // User explicitly chose a destination — always persist.
    close(true);
    router.push(href);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ animation: "resultCardIn 0.3s ease-out" }}
      // Clicking the backdrop dismisses (respects checkbox).
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={HEADING_ID}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        // Prevent backdrop click propagating into the panel.
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === step ? "bg-amber-500 w-6" : i < step ? "bg-amber-300" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Skip */}
        <div className="flex justify-end px-5 pt-2">
          <button
            onClick={dismiss}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip
          </button>
        </div>

        <div className="px-6 pb-6" style={{ minHeight: "280px" }}>
          {step === 0 && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="search" size={28} className="text-amber-600" />
              </div>
              <h2 id={HEADING_ID} className="text-xl font-extrabold text-slate-900 mb-2">
                Find Your Perfect Broker
              </h2>
              <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                Compare fees, features, and safety across every major Australian investment platform -- independent, transparent, and free.
              </p>
              <button
                onClick={() => setStep(1)}
                className="mt-5 px-7 py-3 bg-amber-500 text-white font-bold text-sm rounded-xl hover:bg-amber-600 transition-colors"
              >
                See How It Works
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="py-6">
              <h2 id={HEADING_ID} className="text-lg font-extrabold text-slate-900 text-center mb-6">
                How It Works
              </h2>
              <div className="flex items-start gap-4">
                {/* Step 1 */}
                <div className="flex-1 text-center">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-2">
                    <Icon name="clipboard-list" size={22} className="text-blue-600" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 mb-0.5">Take Quiz</p>
                  <p className="text-[0.62rem] text-slate-500 leading-snug">Answer a few questions about your investing goals.</p>
                </div>
                {/* Arrow */}
                <Icon name="chevron-right" size={16} className="text-slate-300 mt-4 shrink-0" />
                {/* Step 2 */}
                <div className="flex-1 text-center">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-2">
                    <Icon name="scale" size={22} className="text-amber-600" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 mb-0.5">Compare</p>
                  <p className="text-[0.62rem] text-slate-500 leading-snug">See your personalised broker match ranked by fit.</p>
                </div>
                {/* Arrow */}
                <Icon name="chevron-right" size={16} className="text-slate-300 mt-4 shrink-0" />
                {/* Step 3 */}
                <div className="flex-1 text-center">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                    <Icon name="check-circle" size={22} className="text-emerald-600" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 mb-0.5">Switch</p>
                  <p className="text-[0.62rem] text-slate-500 leading-snug">Open your new account and start investing smarter.</p>
                </div>
              </div>
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-7 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="zap" size={28} className="text-emerald-600" />
              </div>
              <h2 id={HEADING_ID} className="text-xl font-extrabold text-slate-900 mb-2">
                Ready to Get Started?
              </h2>
              <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed mb-6">
                Take our 60-second quiz for personalised results, or browse all brokers at your own pace.
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => navigateAndClose("/quiz")}
                  className="w-full px-6 py-3 bg-amber-500 text-white font-bold text-sm rounded-xl hover:bg-amber-600 transition-colors"
                >
                  Take the Quiz
                </button>
                <button
                  onClick={() => navigateAndClose("/compare")}
                  className="w-full px-6 py-3 bg-slate-100 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Browse All Platforms
                </button>
              </div>
              <label className="flex items-center justify-center gap-2 mt-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-400/30 accent-slate-900"
                />
                <span className="text-xs text-slate-500">Don&apos;t show this again</span>
              </label>
            </div>
          )}
        </div>

        {/* Back navigation for steps > 0 */}
        {step > 0 && step < 2 && (
          <div className="px-6 pb-5">
            <button
              onClick={() => setStep(step - 1)}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
            >
              <Icon name="arrow-left" size={14} />
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
