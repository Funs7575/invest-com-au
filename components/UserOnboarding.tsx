"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

const STORAGE_KEY = "user_onboarding_seen";

interface NotifPrefs {
  fee_alerts: boolean;
  weekly_digest: boolean;
  morning_brief: boolean;
}

const NOTIF_TOGGLES: Array<{ key: keyof NotifPrefs; label: string; description: string }> = [
  {
    key: "fee_alerts",
    label: "Fee change alerts",
    description: "Email when a broker you've viewed changes their fees",
  },
  {
    key: "weekly_digest",
    label: "Weekly digest",
    description: "Top platform news & rate movements, every Monday",
  },
  {
    key: "morning_brief",
    label: "Morning brief",
    description: "Daily markets & investing headlines at 8 am AEDT",
  },
];

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function UserOnboarding() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  // Lazy initializer runs once on client mount — no effect needed, no SSR
  // concerns because this component is always loaded with ssr: false.
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) !== "true";
  });
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    fee_alerts: true,
    weekly_digest: true,
    morning_brief: false,
  });

  // Move focus to the first focusable element whenever the step changes.
  // Calling .focus() on a DOM element is safe in an effect (not set-state-in-effect).
  useEffect(() => {
    if (!visible) return;
    const el = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    el?.focus();
  }, [visible, step]);

  // Tab-cycle focus trap + Escape-to-close, handled via onKeyDown on the
  // dialog div (no useEffect needed — React synthetic events work fine here).
  const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      dismissPermanent();
      return;
    }
    if (e.key !== "Tab") return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
    );
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const dismissPermanent = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  const navigateAndClose = (href: string) => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
    router.push(href);
  };

  const saveNotifPrefs = () => {
    // Fire-and-forget — silently fails for unauthenticated users (401)
    void fetch("/api/notification-preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notifPrefs),
    }).catch(() => undefined);
  };

  if (!visible) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      onKeyDown={handleDialogKeyDown}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ animation: "resultCardIn 0.3s ease-out" }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-5">
          {[0, 1, 2, 3].map((i) => (
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
          <button onClick={dismissPermanent} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Skip
          </button>
        </div>

        <div className="px-6 pb-6" style={{ minHeight: "280px" }}>
          {step === 0 && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="search" size={28} className="text-amber-600" />
              </div>
              <h2 id="onboarding-title" className="text-xl font-extrabold text-slate-900 mb-2">Find Your Perfect Broker</h2>
              <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                Compare fees, features, and safety across every major Australian investment platform — independent, transparent, and free.
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
              <h2 id="onboarding-title" className="text-lg font-extrabold text-slate-900 text-center mb-6">How It Works</h2>
              <div className="flex items-start gap-4">
                <div className="flex-1 text-center">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-2">
                    <Icon name="clipboard-list" size={22} className="text-blue-600" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 mb-0.5">Take Quiz</p>
                  <p className="text-[0.62rem] text-slate-500 leading-snug">Answer a few questions about your investing goals.</p>
                </div>
                <Icon name="chevron-right" size={16} className="text-slate-300 mt-4 shrink-0" />
                <div className="flex-1 text-center">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-2">
                    <Icon name="scale" size={22} className="text-amber-600" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 mb-0.5">Compare</p>
                  <p className="text-[0.62rem] text-slate-500 leading-snug">See your personalised broker match ranked by fit.</p>
                </div>
                <Icon name="chevron-right" size={16} className="text-slate-300 mt-4 shrink-0" />
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
            <div className="py-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <Icon name="bell" size={28} className="text-blue-600" />
              </div>
              <h2 id="onboarding-title" className="text-lg font-extrabold text-slate-900 text-center mb-1">Stay in the Loop</h2>
              <p className="text-xs text-slate-500 text-center mb-5">Choose what you&apos;d like to hear about. Change any time in settings.</p>
              <div className="space-y-3">
                {NOTIF_TOGGLES.map(({ key, label, description }) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer">
                    <div className="relative mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notifPrefs[key]}
                        onChange={(e) =>
                          setNotifPrefs((prev) => ({ ...prev, [key]: e.target.checked }))
                        }
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-checked:bg-amber-500 rounded-full transition-colors" />
                      <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 leading-tight">{label}</p>
                      <p className="text-[0.68rem] text-slate-500 leading-snug">{description}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-center mt-5">
                <button
                  onClick={() => {
                    saveNotifPrefs();
                    setStep(3);
                  }}
                  className="px-7 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="zap" size={28} className="text-emerald-600" />
              </div>
              <h2 id="onboarding-title" className="text-xl font-extrabold text-slate-900 mb-2">Ready to Get Started?</h2>
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
                  onChange={(e) => {
                    setDontShowAgain(e.target.checked);
                    if (e.target.checked) {
                      localStorage.setItem(STORAGE_KEY, "true");
                    } else {
                      localStorage.removeItem(STORAGE_KEY);
                    }
                  }}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-400/30 accent-slate-900"
                />
                <span className="text-xs text-slate-500">Don&apos;t show this again</span>
              </label>
            </div>
          )}
        </div>

        {/* Back navigation for steps 1–2 */}
        {step > 0 && step < 3 && (
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
