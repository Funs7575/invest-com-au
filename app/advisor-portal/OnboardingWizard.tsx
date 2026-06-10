"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AdvisorPhotoUpload from "@/components/AdvisorPhotoUpload";
import {
  WIZARD_STEPS,
  deriveProfileCompleteness,
  type WizardStepId,
} from "@/lib/advisor-portal/profile-completeness";
import {
  ALL_ADVISOR_SPECIALTIES,
  SPECIALTIES_BY_TYPE,
} from "@/lib/advisor-specialties";
import type { Advisor } from "./types";

/**
 * Guided 5-step onboarding wizard (photo → bio → specialties → fees →
 * availability). Steps, field→step mapping, and the completeness % all come
 * from lib/advisor-portal/profile-completeness — the same source the dashboard
 * API uses — so the wizard, the checklist banner, and the API can never drift.
 *
 * Persistence is per-step through the existing PATCH /api/advisor-auth/profile
 * allowlist (the photo step persists itself via /api/advisor-photo inside
 * AdvisorPhotoUpload). Skipping is always allowed; nothing is lost on close
 * because each step saves independently.
 */

type Props = {
  advisor: Advisor;
  onAdvisorChange: (a: Advisor) => void;
  onClose: () => void;
  initialStep?: WizardStepId | null;
};

const FEE_STRUCTURES = [
  { value: "fee-for-service", label: "Fee for Service" },
  { value: "commission", label: "Commission Based" },
  { value: "hybrid", label: "Hybrid" },
  { value: "percentage", label: "Percentage of AUM" },
];

const AVAILABILITY_OPTIONS: { value: "open" | "waitlist" | "closed"; label: string; dot: string }[] = [
  { value: "open", label: "Accepting new clients", dot: "bg-emerald-500" },
  { value: "waitlist", label: "Waitlist", dot: "bg-amber-400" },
  { value: "closed", label: "Not taking clients", dot: "bg-slate-400" },
];

/** Directory quality gate wants a real bio — mirror its 50-char floor here. */
const BIO_QUALITY_MIN = 50;

/** Max canonical suggestions to show — enough to seed, not a wall of chips. */
const SPECIALTY_SUGGESTION_CAP = 12;

/**
 * Canonical, matching-aligned specialty suggestions for this advisor's type.
 * The quiz and ranker match on these exact strings, so seeding them (instead
 * of free-text-only) keeps the taxonomy coherent and the advisor routable.
 */
function specialtySuggestionsFor(advisorType: string | undefined): string[] {
  const byType =
    advisorType && advisorType in SPECIALTIES_BY_TYPE
      ? SPECIALTIES_BY_TYPE[advisorType as keyof typeof SPECIALTIES_BY_TYPE]
      : null;
  return (byType && byType.length > 0 ? byType : ALL_ADVISOR_SPECIALTIES).slice(
    0,
    SPECIALTY_SUGGESTION_CAP,
  );
}

/** The PATCH body for each step — only allowlisted fields, only this step's. */
function stepPatchBody(step: WizardStepId, draft: Advisor): Record<string, unknown> | null {
  switch (step) {
    case "photo":
      return null; // AdvisorPhotoUpload persists via /api/advisor-photo itself
    case "bio":
      return { bio: draft.bio || "", website: draft.website || "" };
    case "specialties":
      return { specialties: draft.specialties || [] };
    case "fees":
      return { fee_structure: draft.fee_structure || "", fee_description: draft.fee_description || "" };
    case "availability":
      return {
        phone: draft.phone || "",
        booking_link: draft.booking_link || "",
        availability_status: draft.availability_status || "open",
      };
  }
}

export default function OnboardingWizard({ advisor, onAdvisorChange, onClose, initialStep }: Props) {
  const startIndex = Math.max(0, WIZARD_STEPS.findIndex((s) => s.id === (initialStep ?? WIZARD_STEPS[0]!.id)));
  const [stepIndex, setStepIndex] = useState(startIndex);
  const [draft, setDraft] = useState<Advisor>(advisor);
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const step = WIZARD_STEPS[stepIndex] ?? WIZARD_STEPS[0]!;
  const completeness = useMemo(
    () => deriveProfileCompleteness(draft as unknown as Record<string, unknown>),
    [draft],
  );

  // Announce + focus each step's heading (and the finish screen).
  useEffect(() => {
    headingRef.current?.focus();
  }, [stepIndex, finished]);

  // Esc closes (standard dialog behaviour).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (patch: Partial<Advisor>) => setDraft((d) => ({ ...d, ...patch }));

  const addSpecialty = (raw?: string) => {
    const value = (raw ?? specialtyInput).trim().replace(/,$/, "");
    if (!value) return;
    const current = draft.specialties || [];
    if (!current.some((s) => s.toLowerCase() === value.toLowerCase())) {
      set({ specialties: [...current, value] });
    }
    if (raw === undefined) setSpecialtyInput("");
  };

  const specialtySuggestions = useMemo(() => {
    const selected = new Set((draft.specialties || []).map((s) => s.toLowerCase()));
    return specialtySuggestionsFor(draft.type).filter(
      (s) => !selected.has(s.toLowerCase()),
    );
  }, [draft.type, draft.specialties]);

  const removeSpecialty = (value: string) =>
    set({ specialties: (draft.specialties || []).filter((s) => s !== value) });

  const advance = () => {
    if (stepIndex + 1 >= WIZARD_STEPS.length) setFinished(true);
    else setStepIndex((i) => i + 1);
  };

  const handleSkip = () => {
    setSaveError(null);
    advance();
  };

  const handleSave = async () => {
    setSaveError(null);
    const body = stepPatchBody(step.id, draft);
    if (!body) {
      // Photo step — upload already persisted by AdvisorPhotoUpload.
      advance();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/advisor-auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`save ${res.status}`);
      onAdvisorChange({ ...draft });
      advance();
    } catch {
      setSaveError("Couldn't save — please check your connection and try again.");
    }
    setSaving(false);
  };

  const inputClass =
    "w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900";

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-wizard-heading"
    >
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        {/* Sticky progress header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-xs font-semibold text-violet-700">
              {finished ? "Setup complete" : `Step ${stepIndex + 1} of ${WIZARD_STEPS.length}`}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">{completeness.score}% complete</span>
              <button
                onClick={onClose}
                aria-label="Close setup wizard"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
          </div>
          <div
            className="h-1.5 bg-violet-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={completeness.score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Profile ${completeness.score}% complete`}
          >
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${completeness.score}%` }}
            />
          </div>
        </div>

        {finished ? (
          <div className="px-5 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3" aria-hidden="true">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 ref={headingRef} tabIndex={-1} id="onboarding-wizard-heading" className="text-lg font-bold text-slate-900 outline-none mb-1">
              {completeness.complete ? "Your profile is ready" : `You're at ${completeness.score}%`}
            </h2>
            <p className="text-sm text-slate-600 mb-5">
              {completeness.complete
                ? "A complete profile gets you matched to the right clients — you're all set."
                : "Nice progress. Finish the remaining fields any time from your dashboard — a complete profile converts more matches into clients."}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href={`/advisor/${advisor.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 min-h-11 inline-flex items-center justify-center bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800"
              >
                View my public profile
              </Link>
              <button
                onClick={onClose}
                className="px-4 py-2.5 min-h-11 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50"
              >
                Back to dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-5">
            <h2 ref={headingRef} tabIndex={-1} id="onboarding-wizard-heading" className="text-lg font-bold text-slate-900 outline-none">
              {step.title}
            </h2>
            <p className="text-xs text-slate-600 mt-1 mb-4">{step.blurb}</p>

            {step.id === "photo" && (
              <div className="flex flex-col items-center py-2">
                <AdvisorPhotoUpload
                  currentPhotoUrl={draft.photo_url}
                  advisorSlug={advisor.slug}
                  onPhotoUpdated={(url) => {
                    set({ photo_url: url });
                    onAdvisorChange({ ...draft, photo_url: url });
                  }}
                />
              </div>
            )}

            {step.id === "bio" && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="ow-bio" className="block text-xs font-semibold text-slate-600 mb-1">Bio</label>
                  <textarea
                    id="ow-bio"
                    rows={5}
                    value={draft.bio || ""}
                    onChange={(e) => set({ bio: e.target.value })}
                    className={inputClass}
                    placeholder="Tell investors about your experience and approach..."
                    aria-describedby="ow-bio-hint"
                  />
                  <p id="ow-bio-hint" className="text-[0.68rem] text-slate-500 mt-1">
                    {(draft.bio || "").trim().length > 0 && (draft.bio || "").trim().length < BIO_QUALITY_MIN
                      ? `${BIO_QUALITY_MIN - (draft.bio || "").trim().length} more characters to pass the directory quality check.`
                      : "Aim for at least a few sentences — profiles with a real bio pass the directory quality check and convert more matches."}
                  </p>
                </div>
                <div>
                  <label htmlFor="ow-website" className="block text-xs font-semibold text-slate-600 mb-1">
                    Website <span className="font-normal text-slate-500">(optional)</span>
                  </label>
                  <input
                    id="ow-website"
                    type="url"
                    value={draft.website || ""}
                    onChange={(e) => set({ website: e.target.value })}
                    className={inputClass}
                    placeholder="https://yourfirm.com.au"
                  />
                </div>
              </div>
            )}

            {step.id === "specialties" && (
              <div>
                {specialtySuggestions.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-600 mb-1.5">
                      Tap to add — these are the specialties investors search and the quiz matches on
                    </p>
                    <ul className="flex flex-wrap gap-1.5" aria-label="Suggested specialties">
                      {specialtySuggestions.map((s) => (
                        <li key={s}>
                          <button
                            type="button"
                            onClick={() => addSpecialty(s)}
                            className="flex items-center gap-1 border border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50 text-slate-700 text-xs font-medium rounded-full px-2.5 py-1.5 min-h-8 transition-colors"
                          >
                            <span aria-hidden className="text-violet-500 font-bold">+</span>
                            {s}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <label htmlFor="ow-specialty" className="block text-xs font-semibold text-slate-600 mb-1">
                  Or type your own, then press Enter
                </label>
                <input
                  id="ow-specialty"
                  value={specialtyInput}
                  onChange={(e) => setSpecialtyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addSpecialty();
                    }
                  }}
                  onBlur={() => addSpecialty()}
                  className={inputClass}
                  placeholder="e.g. SMSF setup, First-home buyers, Retirement planning"
                />
                {(draft.specialties || []).length > 0 && (
                  <ul className="flex flex-wrap gap-1.5 mt-3" aria-label="Your specialties">
                    {(draft.specialties || []).map((s) => (
                      <li key={s} className="flex items-center gap-1 bg-violet-50 border border-violet-200 text-violet-800 text-xs font-medium rounded-full pl-2.5 pr-1 py-1">
                        {s}
                        <button
                          onClick={() => removeSpecialty(s)}
                          aria-label={`Remove ${s}`}
                          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-violet-100 text-violet-500"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {step.id === "fees" && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="ow-fee-structure" className="block text-xs font-semibold text-slate-600 mb-1">Fee structure</label>
                  <select
                    id="ow-fee-structure"
                    value={draft.fee_structure || ""}
                    onChange={(e) => set({ fee_structure: e.target.value })}
                    className={inputClass}
                  >
                    <option value="" disabled>Select a fee structure…</option>
                    {FEE_STRUCTURES.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ow-fee-description" className="block text-xs font-semibold text-slate-600 mb-1">Fee description (shown to investors)</label>
                  <input
                    id="ow-fee-description"
                    value={draft.fee_description || ""}
                    onChange={(e) => set({ fee_description: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. SOA from $3,300 · first consultation free"
                  />
                </div>
              </div>
            )}

            {step.id === "availability" && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="ow-phone" className="block text-xs font-semibold text-slate-600 mb-1">Phone number</label>
                  <input
                    id="ow-phone"
                    type="tel"
                    value={draft.phone || ""}
                    onChange={(e) => set({ phone: e.target.value })}
                    className={inputClass}
                    placeholder="04xx xxx xxx"
                  />
                </div>
                <div>
                  <label htmlFor="ow-booking" className="block text-xs font-semibold text-slate-600 mb-1">
                    Booking link <span className="font-normal text-slate-500">(Calendly, Cal.com, …)</span>
                  </label>
                  <input
                    id="ow-booking"
                    type="url"
                    value={draft.booking_link || ""}
                    onChange={(e) => set({ booking_link: e.target.value })}
                    className={inputClass}
                    placeholder="https://calendly.com/you/intro-call"
                  />
                </div>
                <div>
                  <p className="block text-xs font-semibold text-slate-600 mb-1.5">Availability</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {AVAILABILITY_OPTIONS.map((opt) => {
                      const selected = (draft.availability_status ?? "open") === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => set({ availability_status: opt.value })}
                          className={`flex items-center gap-2 px-3 py-2.5 min-h-11 rounded-lg border text-left text-xs font-semibold transition-colors ${
                            selected
                              ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900 text-slate-900"
                              : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.dot}`} aria-hidden="true" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {saveError && (
              <p role="alert" className="text-xs text-red-600 mt-3">{saveError}</p>
            )}

            {/* Step actions */}
            <div className="flex items-center gap-2 mt-6">
              {stepIndex > 0 && (
                <button
                  onClick={() => setStepIndex((i) => i - 1)}
                  className="px-3 py-2.5 min-h-11 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-50"
                >
                  Back
                </button>
              )}
              <div className="flex-1" />
              <button
                onClick={handleSkip}
                className="px-3 py-2.5 min-h-11 text-sm font-semibold text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Skip for now
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2.5 min-h-11 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : step.id === "photo" ? "Continue" : "Save & continue"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
