"use client";

/**
 * /pros/join — 5-step provider onboarding wizard.
 *
 * Steps:
 *   1. Type (Individual / Firm / Pro Squad)
 *   2. Specialty (multi-select from ProfessionalType enum)
 *   3. Credentials (name, firm, AFSL / credit licence / ASIC / ABN)
 *   4. Verification doc upload (PDF or image)
 *   5. Billing (BSB + account last4, start-with-free-credits opt-in)
 *
 * Submit posts to /api/pros/join → row in professionals with
 * verification_status='pending' + accepts_briefs=false until admin approves.
 *
 * Compliance: copy uses passive routing language ("matched", "routed to",
 * "consumers can be matched") — never "we recommend" or "we'll send you".
 *
 * Mobile-first: tested at 375px, single column at every breakpoint.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { PROFESSIONAL_TYPE_LABELS, type ProfessionalType } from "@/lib/types";

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

const TYPE_OPTIONS = [
  {
    value: "individual" as const,
    label: "Individual",
    blurb: "Solo practitioner or authorised representative",
  },
  {
    value: "firm" as const,
    label: "Firm",
    blurb: "Firm / brokerage with multiple advisors",
  },
  {
    value: "expert_team" as const,
    label: "Pro Squad",
    blurb: "Cross-firm expert team that takes briefs jointly",
  },
];

type Kind = "individual" | "firm" | "expert_team";

interface WizardState {
  kind: Kind | null;
  specialties: ProfessionalType[];
  name: string;
  firm_name: string;
  email: string;
  phone: string;
  afsl_number: string;
  credit_licence_number: string;
  asic_registration_number: string;
  abn: string;
  location_state: string;
  location_suburb: string;
  payout_bsb: string;
  payout_account_number: string;
  start_with_free_credits: boolean;
  agreed_to_terms: boolean;
}

const INITIAL_STATE: WizardState = {
  kind: null,
  specialties: [],
  name: "",
  firm_name: "",
  email: "",
  phone: "",
  afsl_number: "",
  credit_licence_number: "",
  asic_registration_number: "",
  abn: "",
  location_state: "",
  location_suburb: "",
  payout_bsb: "",
  payout_account_number: "",
  start_with_free_credits: true,
  agreed_to_terms: false,
};

const TOTAL_STEPS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BSB_RE = /^\d{3}-?\d{3}$/;

// Specialty options shown in the picker — primary marketplace fits first.
const PRIMARY_SPECIALTIES: ProfessionalType[] = [
  "financial_planner",
  "mortgage_broker",
  "tax_agent",
  "smsf_accountant",
  "buyers_agent",
  "property_advisor",
  "estate_planner",
  "insurance_broker",
];

const SECONDARY_SPECIALTIES: ProfessionalType[] = (
  Object.keys(PROFESSIONAL_TYPE_LABELS) as ProfessionalType[]
).filter((k) => !PRIMARY_SPECIALTIES.includes(k));

function StepHeader({ step }: { step: number }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5 mb-3" aria-label={`Step ${step} of ${TOTAL_STEPS}`}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              n <= step ? "bg-violet-600" : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500 font-medium">
        Step {step} of {TOTAL_STEPS}
      </p>
    </div>
  );
}

export default function ProsJoinWizard() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docStoragePath, setDocStoragePath] = useState<string | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docError, setDocError] = useState("");
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [submitError, setSubmitError] = useState("");

  const update = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const stepValid = useMemo(() => {
    switch (step) {
      case 1:
        return state.kind !== null;
      case 2:
        return state.specialties.length > 0;
      case 3:
        return (
          state.name.trim().length >= 2 &&
          EMAIL_RE.test(state.email.trim()) &&
          // At least one credential to verify against. Lawyers carry an
          // ASIC registration; brokers carry AFSL or credit licence; tax
          // agents carry ASIC TPB. We accept any.
          (state.afsl_number.trim() ||
            state.credit_licence_number.trim() ||
            state.asic_registration_number.trim() ||
            state.abn.trim()).length > 0
        );
      case 4:
        return docStoragePath !== null;
      case 5:
        return (
          BSB_RE.test(state.payout_bsb.trim()) &&
          state.payout_account_number.replace(/\D/g, "").length >= 6 &&
          state.agreed_to_terms
        );
      default:
        return false;
    }
  }, [step, state, docStoragePath]);

  const handleNext = () => {
    if (!stepValid) return;
    if (step < TOTAL_STEPS) setStep(step + 1);
  };
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleSpecialty = (spec: ProfessionalType) => {
    setState((prev) => {
      const has = prev.specialties.includes(spec);
      if (has) {
        return { ...prev, specialties: prev.specialties.filter((s) => s !== spec) };
      }
      if (prev.specialties.length >= 8) return prev;
      return { ...prev, specialties: [...prev.specialties, spec] };
    });
  };

  const handleDocSelect = async (file: File) => {
    setDocError("");
    setDocStoragePath(null);
    setDocFile(file);

    const ALLOWED = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!ALLOWED.includes(file.type)) {
      setDocError("Upload a PDF, JPG, PNG, or WebP file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setDocError("File must be under 10MB.");
      return;
    }

    setDocUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/pros/join/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDocError(data.error || "Upload failed");
        setDocFile(null);
        return;
      }
      setDocStoragePath(data.storage_path);
    } catch {
      setDocError("Network error. Please try again.");
      setDocFile(null);
    } finally {
      setDocUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!stepValid) return;
    setSubmitState("submitting");
    setSubmitError("");

    try {
      const last4 = state.payout_account_number.replace(/\D/g, "").slice(-4);
      const payload = {
        kind: state.kind,
        specialties: state.specialties,
        name: state.name.trim(),
        firm_name: state.firm_name.trim() || null,
        email: state.email.trim().toLowerCase(),
        phone: state.phone.trim() || null,
        afsl_number: state.afsl_number.trim() || null,
        credit_licence_number: state.credit_licence_number.trim() || null,
        asic_registration_number:
          state.asic_registration_number.trim() || null,
        abn: state.abn.trim() || null,
        location_state: state.location_state || null,
        location_suburb: state.location_suburb.trim() || null,
        verification_doc_path: docStoragePath,
        payout_bsb: state.payout_bsb.trim(),
        payout_account_last4: last4,
        start_with_free_credits: state.start_with_free_credits,
        agreed_to_terms: state.agreed_to_terms,
      };

      const res = await fetch("/api/pros/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || "Something went wrong. Please try again.");
        setSubmitState("error");
        return;
      }
      setSubmitState("success");
    } catch {
      setSubmitError("Network error. Please try again.");
      setSubmitState("error");
    }
  };

  if (submitState === "success") {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 mb-1.5">
          Application received
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
          Verification is typically completed within 1 business day. A
          confirmation has been sent to{" "}
          <span className="font-semibold text-slate-900">{state.email}</span>.
        </p>
        <p className="text-xs text-slate-500 mt-4">
          Once verified, you can be matched to incoming consumer requests.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 text-sm font-semibold text-violet-600 hover:text-violet-700"
        >
          &larr; Back to Invest.com.au
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-7 shadow-sm">
      <StepHeader step={step} />

      {step === 1 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            How are you applying?
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Pick the option that matches how consumers can be matched to you.
          </p>
          <div className="space-y-2.5">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update("kind", opt.value)}
                className={`w-full text-left p-3.5 rounded-xl border-2 transition-colors ${
                  state.kind === opt.value
                    ? "border-violet-600 bg-violet-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
                aria-pressed={state.kind === opt.value}
              >
                <div className="font-bold text-sm text-slate-900">
                  {opt.label}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {opt.blurb}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Which specialties do you cover?
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Pick up to 8. Selected specialties determine which Match Requests
            can be routed to you.
          </p>
          <div className="space-y-3">
            <SpecialtyGroup
              title="Common"
              options={PRIMARY_SPECIALTIES}
              selected={state.specialties}
              onToggle={toggleSpecialty}
              limitReached={state.specialties.length >= 8}
            />
            <details className="bg-slate-50 rounded-lg border border-slate-200">
              <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-slate-700">
                Show all specialties ({SECONDARY_SPECIALTIES.length})
              </summary>
              <div className="px-3 pb-3">
                <SpecialtyGroup
                  title=""
                  options={SECONDARY_SPECIALTIES}
                  selected={state.specialties}
                  onToggle={toggleSpecialty}
                  limitReached={state.specialties.length >= 8}
                />
              </div>
            </details>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Your credentials
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Provide at least one regulator-issued credential. We&apos;ll
            verify against ASIC / TPB / Law Society records before activating
            your listing.
          </p>
          <div className="space-y-3">
            <Field
              label="Full name *"
              value={state.name}
              onChange={(v) => update("name", v)}
              placeholder="Sarah Chen"
            />
            <Field
              label="Firm / business name"
              value={state.firm_name}
              onChange={(v) => update("firm_name", v)}
              placeholder="Chen Advisory"
            />
            <Field
              type="email"
              label="Work email *"
              value={state.email}
              onChange={(v) => update("email", v)}
              placeholder="sarah@firm.com.au"
            />
            <Field
              label="Phone"
              value={state.phone}
              onChange={(v) => update("phone", v)}
              placeholder="04XX XXX XXX"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <Field
                label="AFSL #"
                value={state.afsl_number}
                onChange={(v) => update("afsl_number", v)}
                placeholder="234567"
                small
              />
              <Field
                label="Credit licence #"
                value={state.credit_licence_number}
                onChange={(v) => update("credit_licence_number", v)}
                placeholder="ACL 555 555"
                small
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Field
                label="ASIC / TPB / TAN"
                value={state.asic_registration_number}
                onChange={(v) => update("asic_registration_number", v)}
                placeholder="ASIC 0000"
                small
              />
              <Field
                label="ABN"
                value={state.abn}
                onChange={(v) => update("abn", v)}
                placeholder="11 222 333 444"
                small
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  State
                </label>
                <select
                  value={state.location_state}
                  onChange={(e) => update("location_state", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="">Select…</option>
                  {AU_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="Suburb"
                value={state.location_suburb}
                onChange={(v) => update("location_suburb", v)}
                placeholder="Sydney CBD"
                small
              />
            </div>
          </div>
        </section>
      )}

      {step === 4 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Verification document
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Upload one document that proves your registration —
            accountant&apos;s practising certificate, lawyer&apos;s practising
            certificate, or a screenshot of your ASIC AFSL listing.
          </p>
          <label
            htmlFor="verification-doc-input"
            className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              docStoragePath
                ? "border-emerald-300 bg-emerald-50"
                : "border-slate-300 hover:border-slate-400 bg-slate-50"
            }`}
          >
            <input
              id="verification-doc-input"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleDocSelect(f);
              }}
              disabled={docUploading}
            />
            {docUploading ? (
              <div className="text-sm text-slate-600">
                <div className="mx-auto mb-2 w-6 h-6 border-2 border-slate-300 border-t-violet-600 rounded-full animate-spin" />
                Uploading {docFile?.name}…
              </div>
            ) : docStoragePath && docFile ? (
              <div>
                <div className="text-sm font-semibold text-emerald-900">
                  {docFile.name}
                </div>
                <div className="text-xs text-emerald-700 mt-1">
                  Uploaded. Tap to replace.
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-semibold text-slate-700">
                  Tap to upload
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  PDF, JPG, PNG or WebP. Max 10MB.
                </div>
              </div>
            )}
          </label>
          {docError && (
            <p className="text-xs text-red-600 font-medium mt-2">{docError}</p>
          )}
          <p className="text-[0.62rem] text-slate-400 mt-3 leading-relaxed">
            Documents are stored privately and visible only to the
            Invest.com.au verification team. No information is published
            without your approval.
          </p>
        </section>
      )}

      {step === 5 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Payouts &amp; starter credits
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Bank details for credit payouts. We never store the full account
            number — only BSB and last 4 digits.
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <Field
                label="BSB *"
                value={state.payout_bsb}
                onChange={(v) => update("payout_bsb", v)}
                placeholder="062-000"
                small
              />
              <Field
                label="Account number *"
                value={state.payout_account_number}
                onChange={(v) =>
                  update("payout_account_number", v.replace(/[^\d\s-]/g, ""))
                }
                placeholder="12345678"
                small
              />
            </div>

            <label className="flex items-start gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={state.start_with_free_credits}
                onChange={(e) =>
                  update("start_with_free_credits", e.target.checked)
                }
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Start with 10 free credits
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Use them to unlock and accept your first 10 Match Requests
                  before topping up. Granted on verification.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={state.agreed_to_terms}
                onChange={(e) => update("agreed_to_terms", e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                I agree to the{" "}
                <Link
                  href="/advisor-terms"
                  target="_blank"
                  className="text-violet-600 underline"
                >
                  Provider Services Agreement
                </Link>
                ,{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="text-violet-600 underline"
                >
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-violet-600 underline"
                >
                  Privacy Policy
                </Link>
                . I confirm I hold the registrations stated above.
              </span>
            </label>

            {submitError && (
              <p className="text-xs text-red-600 font-medium">{submitError}</p>
            )}
          </div>
        </section>
      )}

      <div className="mt-7 flex items-center gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            &larr; Back
          </button>
        ) : (
          <span />
        )}

        {step < TOTAL_STEPS && (
          <button
            type="button"
            onClick={handleNext}
            disabled={!stepValid}
            className="ml-auto px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue &rarr;
          </button>
        )}

        {step === TOTAL_STEPS && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!stepValid || submitState === "submitting"}
            className="ml-auto px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitState === "submitting"
              ? "Submitting…"
              : "Submit application"}
          </button>
        )}
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  small?: boolean;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  small,
}: FieldProps) {
  return (
    <div>
      <label className={`block ${small ? "text-[0.65rem]" : "text-xs"} font-semibold text-slate-600 mb-1`}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
      />
    </div>
  );
}

interface SpecialtyGroupProps {
  title: string;
  options: ProfessionalType[];
  selected: ProfessionalType[];
  onToggle: (s: ProfessionalType) => void;
  limitReached: boolean;
}

function SpecialtyGroup({
  title,
  options,
  selected,
  onToggle,
  limitReached,
}: SpecialtyGroupProps) {
  return (
    <div>
      {title && (
        <div className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          {title}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          const disabled = !isSelected && limitReached;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isSelected
                  ? "bg-violet-600 text-white border-violet-600"
                  : disabled
                    ? "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              {PROFESSIONAL_TYPE_LABELS[opt]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
