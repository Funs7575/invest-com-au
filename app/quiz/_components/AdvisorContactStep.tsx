"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface Props {
  firstName: string;
  email: string;
  phone: string;
  consent: boolean;
  advisorLabel: string;
  onChange: (field: string, value: string | boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  submitting: boolean;
  errors: Record<string, string>;
  submitError: string | null;
  otpStage: "idle" | "sending" | "sent" | "verifying";
  otpCode: string;
  otpError: string | null;
  onOtpCodeChange: (v: string) => void;
  onOtpVerify: () => void;
  onOtpResend: (e: React.SyntheticEvent) => void;
}

export default function AdvisorContactStep({
  firstName, email, phone, consent, advisorLabel,
  onChange, onSubmit, onBack, submitting, errors, submitError,
  otpStage, otpCode, otpError, onOtpCodeChange, onOtpVerify, onOtpResend,
}: Props) {
  const otpActive = otpStage === "sent" || otpStage === "verifying";

  return (
    <Card variant="default" padding="lg">
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 leading-tight">
          Almost there — where should we send your match?
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          We&apos;ll connect you with a verified {advisorLabel} in your area within 24 hours.
        </p>
      </div>

      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2.5">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {submitError}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Input id="adv-firstName" label="First name" type="text" required placeholder="John"
          value={firstName} onChange={(e) => onChange("firstName", e.target.value)}
          error={errors.firstName} autoComplete="given-name" disabled={otpActive} />

        <Input id="adv-email" label="Email address" type="email" required placeholder="john@example.com"
          value={email} onChange={(e) => onChange("email", e.target.value)}
          hint={otpActive ? `Code sent to ${email}` : "We'll send a verification code here"}
          error={errors.email} autoComplete="email" disabled={otpActive} />

        <Input id="adv-phone" label="Phone number" type="tel" placeholder="04XX XXX XXX"
          value={phone} onChange={(e) => onChange("phone", e.target.value)}
          hint="Optional — advisors may call to arrange a meeting"
          autoComplete="tel" disabled={otpActive} />

        {/* Consent */}
        <div className="space-y-1.5">
          <label className={`flex items-start gap-3 p-4 bg-slate-50 rounded-xl transition-colors ${otpActive ? "opacity-60 cursor-default" : "cursor-pointer hover:bg-slate-100"}`}>
            <input
              type="checkbox" checked={consent}
              onChange={(e) => !otpActive && onChange("consent", e.target.checked)}
              disabled={otpActive}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 accent-amber-500 focus:ring-amber-400 shrink-0"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              I agree to Invest.com.au&apos;s{" "}
              <Link href="/privacy" target="_blank" className="text-amber-600 hover:text-amber-700 underline">Privacy Policy</Link>
              {" "}and{" "}
              <Link href="/terms" target="_blank" className="text-amber-600 hover:text-amber-700 underline">Terms of Use</Link>.
              {" "}<strong className="text-slate-700">Your details go to ONE matched advisor only — no spam.</strong>
            </span>
          </label>
          {errors.consent && (
            <p className="text-xs text-red-600 flex items-center gap-1.5 px-1" role="alert">
              <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.consent}
            </p>
          )}
        </div>

        {!otpActive && (
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onBack} disabled={otpStage === "sending"}>&larr; Back</Button>
            <Button type="submit" variant="primary" loading={otpStage === "sending"} disabled={otpStage === "sending"} className="flex-1">
              {otpStage === "sending" ? "Sending code…" : "Continue →"}
            </Button>
          </div>
        )}
      </form>

      {/* OTP panel */}
      {otpActive && (
        <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Check your inbox</p>
              <p className="text-xs text-slate-500 mt-0.5">We sent a 6-digit code to <strong>{email}</strong></p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otpCode}
                onChange={(e) => onOtpCodeChange(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onOtpVerify(); } }}
                placeholder="000000"
                className="w-full px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] border-2 border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 bg-white"
                autoFocus
              />
              {otpError && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {otpError}
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="primary"
              loading={otpStage === "verifying" || submitting}
              disabled={otpCode.length < 6 || otpStage === "verifying" || submitting}
              onClick={onOtpVerify}
              className="w-full"
            >
              {otpStage === "verifying" || submitting ? "Verifying…" : "Verify & Get Matched →"}
            </Button>

            <p className="text-center text-xs text-slate-400">
              Didn&apos;t get it?{" "}
              <button type="button" onClick={onOtpResend} className="text-amber-600 hover:text-amber-700 font-semibold">
                Resend code
              </button>
              {" "}· Wrong email?{" "}
              <button
                type="button"
                onClick={() => { onOtpCodeChange(""); window.location.reload(); }}
                className="text-slate-500 hover:text-slate-700 font-semibold"
              >
                Start over
              </button>
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
