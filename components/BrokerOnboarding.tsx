"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

const STORAGE_KEY = "broker_onboarding_complete";

interface BrokerOnboardingProps {
  /** ISO date string of when the broker account was created */
  accountCreatedAt?: string;
}

const featureCards = [
  { icon: "pie-chart", title: "Analytics", description: "Track impressions, clicks, and conversions in real time.", href: "/broker-portal/analytics" },
  { icon: "git-branch", title: "A/B Tests", description: "Test different CTAs, banners, and landing pages.", href: "/broker-portal/ab-tests" },
  { icon: "trending-up", title: "Reports", description: "Download performance reports and billing summaries.", href: "/broker-portal/reports" },
  { icon: "link", title: "Webhooks", description: "Get real-time conversion postbacks to your systems.", href: "/broker-portal/webhooks" },
];

export default function BrokerOnboarding({ accountCreatedAt }: BrokerOnboardingProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Don't show if already completed
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "true") return;

    // Only show if account is less than 7 days old
    if (accountCreatedAt) {
      const created = new Date(accountCreatedAt);
      const daysSinceCreation = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 7) {
        return;
      }
    }

    setVisible(true);
  }, [accountCreatedAt]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  const next = () => {
    if (step < 4) setStep(step + 1);
    else dismiss();
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const navigateAndClose = (href: string) => {
    dismiss();
    router.push(href);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" style={{ animation: "resultCardIn 0.3s ease-out" }}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 px-6 pt-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                i <= step ? "bg-amber-500" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Skip link */}
        <div className="flex justify-end px-6 pt-2">
          <button onClick={dismiss} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Skip Onboarding
          </button>
        </div>

        {/* Step content */}
        <div className="px-6 pb-6" style={{ minHeight: "320px" }}>
          {step === 0 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
                <Icon name="party-popper" size={32} className="text-amber-600" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Welcome to Invest.com.au Marketplace!</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                You are now part of Australia's leading broker comparison platform. Let us show you around so you can start driving qualified traffic in minutes.
              </p>
              <button
                onClick={next}
                className="mt-6 px-8 py-3 bg-amber-500 text-white font-bold text-sm rounded-xl hover:bg-amber-600 transition-colors"
              >
                Get Started
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="py-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <Icon name="user" size={22} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">Complete Your Profile</h2>
              <p className="text-sm text-slate-500 mb-5">Help us display your brand accurately across the marketplace.</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Company Name</label>
                  <input type="text" placeholder="e.g. Interactive Brokers AU"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Contact Email</label>
                  <input type="email" placeholder="partnerships@broker.com.au"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Website</label>
                  <input type="url" placeholder="https://broker.com.au"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Brief Description</label>
                  <textarea placeholder="Tell investors why they should choose your platform..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 resize-none"
                    rows={2} />
                </div>
                <button onClick={() => navigateAndClose("/broker-portal/creatives")}
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                  Upload your logo on the Creatives page
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="py-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                <Icon name="wallet" size={22} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">Understand Billing</h2>
              <p className="text-sm text-slate-500 mb-5">Our transparent CPC model means you only pay for real engagement.</p>

              <div className="space-y-3">
                {/* CPC flow diagram */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-3 text-center">
                    <div className="flex-1">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-1.5">
                        <Icon name="wallet" size={18} className="text-amber-600" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">Top Up Wallet</p>
                      <p className="text-[0.62rem] text-slate-400">Add funds anytime</p>
                    </div>
                    <Icon name="chevron-right" size={18} className="text-slate-300 shrink-0" />
                    <div className="flex-1">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-1.5">
                        <Icon name="mouse-pointer-click" size={18} className="text-blue-600" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">User Clicks</p>
                      <p className="text-[0.62rem] text-slate-400">Pay per click only</p>
                    </div>
                    <Icon name="chevron-right" size={18} className="text-slate-300 shrink-0" />
                    <div className="flex-1">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-1.5">
                        <Icon name="target" size={18} className="text-emerald-600" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">Conversions</p>
                      <p className="text-[0.62rem] text-slate-400">Track sign-ups</p>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Icon name="dollar-sign" size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-800">Your first $50 is on us!</p>
                      <p className="text-xs text-emerald-600">New accounts receive a $50 promotional credit to get started.</p>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <p className="flex items-center gap-2"><Icon name="check-circle" size={13} className="text-emerald-500" /> No monthly minimums or lock-in contracts</p>
                  <p className="flex items-center gap-2"><Icon name="check-circle" size={13} className="text-emerald-500" /> Set daily budget caps to control spend</p>
                  <p className="flex items-center gap-2"><Icon name="check-circle" size={13} className="text-emerald-500" /> Auto top-up available so you never miss traffic</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4">
                <Icon name="megaphone" size={22} className="text-purple-600" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">Create Your First Campaign</h2>
              <p className="text-sm text-slate-500 mb-5">Get listed across our comparison pages and start receiving clicks today.</p>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Campaign Name</label>
                  <input type="text" placeholder="e.g. Q1 2025 ASX Promotion"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Daily Budget</label>
                  <input type="text" placeholder="$50.00"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400" />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigateAndClose("/broker-portal/campaigns/new")}
                  className="flex-1 px-4 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors text-center"
                >
                  Create Full Campaign
                </button>
                <button
                  onClick={next}
                  className="px-4 py-3 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="py-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
                <Icon name="layout" size={22} className="text-amber-600" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">Explore Features</h2>
              <p className="text-sm text-slate-500 mb-5">Click any feature below to jump in, or close to start from the dashboard.</p>

              <div className="grid grid-cols-2 gap-3">
                {featureCards.map((card) => (
                  <button
                    key={card.href}
                    onClick={() => navigateAndClose(card.href)}
                    className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center mb-2 group-hover:bg-slate-100 transition-colors">
                      <Icon name={card.icon} size={16} className="text-slate-600" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 mb-0.5">{card.title}</p>
                    <p className="text-xs text-slate-500 leading-snug">{card.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        {step > 0 && (
          <div className="px-6 pb-5 flex items-center justify-between">
            <button onClick={prev} className="text-sm text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
              <Icon name="arrow-left" size={14} />
              Back
            </button>
            {step < 4 ? (
              <button onClick={next}
                className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors">
                Continue
              </button>
            ) : (
              <button onClick={dismiss}
                className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors">
                Go to Dashboard
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
