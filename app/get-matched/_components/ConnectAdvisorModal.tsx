"use client";

/**
 * ConnectAdvisorModal — Decision Engine P6: in-funnel lead capture.
 *
 * The proven value-first order (§5.6): the user has already SEEN their match
 * on the lane surface; this modal collects contact details and verifies the
 * email at the side-effecting confirm — only then is the lead created, via
 * the canonical /api/submit-lead confirm fast-path (country gate, dedup,
 * notification all inherited). ONE lead → ONE advisor.
 */
import { useEffect, useRef, useState } from "react";
import { submitLead } from "@/lib/submit-lead-client";
import { trackEvent as phTrack } from "@/lib/posthog/events";
import type { TopMatch } from "@/lib/getmatched/types";

interface Props {
  advisor: TopMatch;
  planId: number | null;
  shareToken: string | null;
  /** Quiz-style need slug for attribution (e.g. "financial-planner"). */
  advisorType?: string | null;
  onClose: () => void;
  onConnected: (leadId: number) => void;
}

type Stage = "form" | "sending" | "otp" | "verifying" | "done";

export default function ConnectAdvisorModal({
  advisor,
  planId,
  shareToken,
  advisorType,
  onClose,
  onConnected,
}: Props) {
  const [stage, setStage] = useState<Stage>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [stage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stage !== "done") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, stage]);

  const firstName = advisor.name.split(" ")[0];

  async function sendOtp() {
    setError(null);
    if (!name.trim()) return setError("Please enter your first name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Please enter a valid email.");
    if (!consent) return setError("Please agree so we can make the introduction.");
    setStage("sending");
    try {
      const res = await fetch("/api/verify-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Couldn't send the code.");
      }
      setStage("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the code.");
      setStage("form");
    }
  }

  async function verifyAndConnect() {
    setError(null);
    if (code.trim().length !== 6) return setError("Enter the 6-digit code from your email.");
    setStage("verifying");
    try {
      const v = await fetch("/api/verify-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      if (!v.ok) {
        const d = await v.json().catch(() => ({}));
        setError(d.error || "Incorrect code.");
        setStage("otp");
        return;
      }
      // Verified — create the ONE lead for the chosen advisor.
      const data = await submitLead({
        lead_type: "advisor",
        user_email: email.trim(),
        user_name: name.trim(),
        user_phone: phone.trim() || undefined,
        user_intent: advisorType ? { need: advisorType } : undefined,
        source_page: "/get-matched",
        confirm_advisor_id: advisor.ref_id,
      });
      if (!data.lead_id) throw new Error("Couldn't confirm the introduction. Please try again.");

      phTrack("advisor_contacted", {
        advisor_id: advisor.ref_id ?? 0,
        contact_method: "enquiry_form",
        source_section: "get_matched_lane",
      });
      // Mark the plan converted (best-effort; the lead is the source of truth).
      if (planId != null && shareToken) {
        void fetch(`/api/get-matched/plans/${planId}/connected`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ share_token: shareToken, lead_id: data.lead_id }),
        }).catch(() => {});
      }
      setStage("done");
      onConnected(data.lead_id as number);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setStage("otp");
    }
  }

  const input =
    "w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40";

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-modal-heading"
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 ref={headingRef} tabIndex={-1} id="connect-modal-heading" className="text-lg font-bold text-slate-900 outline-none">
            {stage === "done" ? "You’re connected!" : `Connect with ${advisor.name}`}
          </h2>
          {stage !== "done" && (
            <button onClick={onClose} aria-label="Close" className="w-9 h-9 min-h-11 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">✕</button>
          )}
        </div>

        {stage === "done" ? (
          <div>
            <p className="text-sm text-slate-600 mb-4">
              {advisor.name} has been notified and will reach out to {email.trim()} — usually within 24 hours. Free initial chat, no obligation.
            </p>
            <button onClick={onClose} className="w-full py-3 min-h-11 bg-amber-500 text-slate-900 text-sm font-bold rounded-lg hover:bg-amber-600">
              Back to my plan
            </button>
          </div>
        ) : stage === "otp" || stage === "verifying" ? (
          <div>
            <p className="text-xs text-slate-600 mb-3">
              We sent a 6-digit code to <strong>{email.trim()}</strong>. Verifying protects {firstName} from spam — your details go to this one advisor only.
            </p>
            <label htmlFor="cam-code" className="block text-xs font-semibold text-slate-700 mb-1">Verification code</label>
            <input
              id="cam-code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={`${input} tracking-[0.4em] text-center font-bold`}
              placeholder="••••••"
            />
            {error && <p role="alert" className="text-xs text-red-600 mt-2">{error}</p>}
            <button
              onClick={verifyAndConnect}
              disabled={stage === "verifying"}
              className="w-full mt-3 py-3 min-h-11 bg-amber-500 text-slate-900 text-sm font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              {stage === "verifying" ? "Verifying…" : "Verify & Connect →"}
            </button>
            <button onClick={() => setStage("form")} className="w-full mt-2 py-2 min-h-11 text-xs font-semibold text-slate-500 hover:text-slate-700">
              ← Edit my details
            </button>
          </div>
        ) : (
          <div>
            <p className="text-xs text-slate-600 mb-3">
              You’ve seen the match — now where should {firstName} reach you? One advisor only, never a call centre.
            </p>
            <div className="space-y-3">
              <div>
                <label htmlFor="cam-name" className="block text-xs font-semibold text-slate-700 mb-1">First name</label>
                <input id="cam-name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="Alex" />
              </div>
              <div>
                <label htmlFor="cam-email" className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input id="cam-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="you@email.com" />
              </div>
              <div>
                <label htmlFor="cam-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input id="cam-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} placeholder="04xx xxx xxx" />
              </div>
              <label className="flex items-start gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-amber-500"
                />
                <span>
                  I agree to be contacted by {advisor.name} about my enquiry. Free, no obligation, no spam.
                </span>
              </label>
            </div>
            {error && <p role="alert" className="text-xs text-red-600 mt-2">{error}</p>}
            <button
              onClick={sendOtp}
              disabled={stage === "sending"}
              className="w-full mt-4 py-3 min-h-11 bg-amber-500 text-slate-900 text-sm font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              {stage === "sending" ? "Sending code…" : "Send verification code →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
