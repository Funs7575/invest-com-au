"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import { AdvisorOptInCheckboxes, DEFAULT_ADVISOR_OPT_INS } from "@/components/AdvisorOptInCheckboxes";
import type { ProfessionalType } from "@/lib/types";

// Map quiz advisor_type slugs (kebab-case) → ProfessionalType (snake_case)
// for the AdvisorOptInCheckboxes selection. Used when the quiz outcome
// resolver routes a user here with ?type=advisor-slug.
const QUIZ_TYPE_TO_PROFESSIONAL: Record<string, ProfessionalType> = {
  "mortgage-broker": "mortgage_broker",
  "buyers-agent": "buyers_agent",
  "financial-planner": "financial_planner",
  "smsf-accountant": "smsf_accountant",
  "tax-agent": "tax_agent",
  "insurance-broker": "insurance_broker",
};

// Friendly label for the goal that came from the quiz, used to seed the
// job_title with something more useful than a blank field.
const GOAL_TO_TITLE_HINT: Record<string, string> = {
  super: "Help me with my super",
  property: "Property investment guidance",
  "property-super": "SMSF property strategy",
  home: "Home loan / refinance",
  crypto: "Crypto tax and structuring",
  trade: "Active trading tax review",
  income: "Income / dividend strategy",
  grow: "Long-term wealth-building plan",
  business: "Australian business setup",
  help: "I need expert help",
};

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

const BUDGETS = [
  { value: "under_500", label: "Under $500" },
  { value: "500_2k", label: "$500 – $2,000" },
  { value: "2k_5k", label: "$2,000 – $5,000" },
  { value: "5k_10k", label: "$5,000 – $10,000" },
  { value: "10k_plus", label: "$10,000+" },
  { value: "not_sure", label: "Not sure yet" },
];

type Step = "details" | "advisors" | "contact" | "success";

interface JobForm {
  job_title: string;
  job_description: string;
  budget_band: string;
  location_state: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  agree_terms: boolean;
  /** Idea #11 — sealed bidding (advisers can't see competing amounts until close). */
  sealed: boolean;
}

const INITIAL: JobForm = {
  job_title: "",
  job_description: "",
  budget_band: "",
  location_state: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  agree_terms: false,
  sealed: false,
};

export default function JobPostForm({ sealedOptionEnabled = false }: { sealedOptionEnabled?: boolean }) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState<JobForm>(INITIAL);
  const [advisorTypes, setAdvisorTypes] = useState<ProfessionalType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultSlug, setResultSlug] = useState<string | null>(null);
  // True when the form was pre-populated from quiz query params, used to
  // surface a "From your quiz" reassurance banner so users don't think the
  // form is auto-filling itself unexplainably.
  const [prefilledFromQuiz, setPrefilledFromQuiz] = useState(false);
  // Tracks which specific fields were auto-populated from the quiz so we can
  // apply a visual highlight only to those fields (not to user-typed values).
  const [prefilledFields, setPrefilledFields] = useState<Set<keyof JobForm>>(new Set());

  function set<K extends keyof JobForm>(key: K, v: JobForm[K]) {
    setForm((p) => ({ ...p, [key]: v }));
  }

  // Read quiz handoff params on mount. Quiz outcome resolver routes users
  // here with: context=quiz, goal, amount, complexity, type, country, visa.
  // We seed job_title (goal hint) + advisorTypes (from `type`) so the user
  // doesn't have to re-describe what the quiz already learned.
  useEffect(() => {
    const context = searchParams.get("context");
    if (context !== "quiz") return;

    const goal = searchParams.get("goal");
    const complexity = searchParams.get("complexity");
    const type = searchParams.get("type");

    let didPrefill = false;
    const newPrefilledFields = new Set<keyof JobForm>();

    if (goal && GOAL_TO_TITLE_HINT[goal]) {
      const titleHint = complexity === "complex"
        ? `${GOAL_TO_TITLE_HINT[goal]} (complex situation)`
        : GOAL_TO_TITLE_HINT[goal];
      setForm((p) => ({ ...p, job_title: titleHint }));
      newPrefilledFields.add("job_title");
      didPrefill = true;
    }

    if (type && QUIZ_TYPE_TO_PROFESSIONAL[type]) {
      const professionalType = QUIZ_TYPE_TO_PROFESSIONAL[type];
      setAdvisorTypes((prev) => prev.includes(professionalType) ? prev : [...prev, professionalType]);
      didPrefill = true;
    }

    if (didPrefill) {
      setPrefilledFromQuiz(true);
      setPrefilledFields(newPrefilledFields);
    }
  }, [searchParams]);

  const canDetails =
    form.job_title.trim().length >= 8 &&
    form.job_description.trim().length >= 30 &&
    form.budget_band &&
    form.location_state;

  const canAdvisors = advisorTypes.length > 0;

  const canContact =
    form.contact_name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email) &&
    form.agree_terms;

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: form.job_title,
          job_description: form.job_description,
          budget_band: form.budget_band,
          location_state: form.location_state,
          advisor_types: advisorTypes,
          contact_name: form.contact_name,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone || undefined,
          // Idea #11 — only send when the option is enabled AND chosen. The
          // server re-checks the auction_rounds flag before honouring it.
          ...(sealedOptionEnabled && form.sealed ? { bid_visibility: "sealed" } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to post job.");
      setResultSlug(data.slug);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "success") {
    return (
      <div className="bg-white border border-emerald-200 rounded-2xl p-8 text-center max-w-2xl mx-auto">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="check-circle" size={28} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Job posted!</h2>
        <p className="text-slate-600 text-sm leading-relaxed mb-2 max-w-md mx-auto">
          Verified advisors are being notified now. Expect quotes within 24–72 hours.
          We&apos;ve sent a link to <strong>{form.contact_email}</strong>.
        </p>
        <p className="text-xs text-slate-500 mb-6">You can close this tab — your job is saved.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {resultSlug && (
            <Link
              href={`/quotes/${resultSlug}?email=${encodeURIComponent(form.contact_email)}`}
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
            >
              View your job
              <Icon name="arrow-right" size={16} />
            </Link>
          )}
          {resultSlug && (
            <a
              href={`mailto:?subject=Get%20a%20free%20financial%20advice%20quote&body=I%20just%20posted%20a%20job%20on%20Invest.com.au%20%E2%80%94%20share%20with%20an%20advisor%20you%20know%3A%20https%3A%2F%2Finvest.com.au%2Fquotes%2F${resultSlug}`}
              className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-xl hover:border-slate-300 transition-colors"
            >
              Share with an advisor you know
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
      {/* Trust banner */}
      {step === "details" && (
        <div className="mb-5 -mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-2.5">
          <span className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Free, no obligation</span>
          <span className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> AFSL-licensed advisors only</span>
          <span className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Compare up to 5 quotes</span>
          <span className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Reply within 72 hours</span>
        </div>
      )}
      {/* Prefilled-from-quiz banner — soft reassurance that we're carrying
          their context, not auto-filling the form mysteriously. */}
      {prefilledFromQuiz && (
        <div className="mb-6 -mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
          <Icon name="check" size={14} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800">
            <strong>Pre-filled from your quiz.</strong> Edit anything below before posting.
          </p>
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {(["details", "advisors", "contact"] as Step[]).map((s, i) => {
          const order: Step[] = ["details", "advisors", "contact"];
          const cur = order.indexOf(step);
          const idx = order.indexOf(s);
          const done = cur > idx;
          const active = step === s;
          const labels: Record<string, string> = {
            details: "Your job",
            advisors: "Who can help",
            contact: "Your details",
          };
          return (
            <div key={s} className="flex items-center gap-2 flex-1">
              {i > 0 && <div className={`flex-1 h-px ${done ? "bg-amber-500" : "bg-slate-200"}`} />}
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  done ? "bg-amber-500 text-slate-900" : active ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
                }`}>
                  {done ? <Icon name="check" size={13} /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${active ? "text-slate-900 font-semibold" : "text-slate-500"}`}>{labels[s]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {step === "details" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Tell us what you need help with</h2>
            <p className="text-sm text-slate-500">Be specific — advisors give better quotes when they know what they&apos;re bidding on.</p>
          </div>

          <div>
            <label htmlFor="job-title" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="job-title"
              type="text"
              maxLength={120}
              value={form.job_title}
              onChange={(e) => {
                set("job_title", e.target.value);
                // Clear the prefill highlight once the user starts editing
                setPrefilledFields((prev) => { const next = new Set(prev); next.delete("job_title"); return next; });
              }}
              placeholder="e.g. Refinance our $750k investment loan"
              className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${prefilledFields.has("job_title") ? "border-blue-200 bg-blue-50 ring-1 ring-blue-200" : "border-slate-300"}`}
            />
            <p className="text-xs text-slate-500 mt-1">A short summary advisors will see in the job board.</p>
          </div>

          <div>
            <label htmlFor="job-description" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Describe your situation <span className="text-red-500">*</span>
            </label>
            <textarea
              id="job-description"
              rows={6}
              maxLength={3000}
              value={form.job_description}
              onChange={(e) => set("job_description", e.target.value)}
              placeholder="What's the situation? What outcome do you want? Any deadlines? The more context the better — advisors will give sharper, lower quotes."
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
            />
            <p className="text-xs text-slate-500 mt-1">Min 30 characters — specific descriptions attract better quotes from advisors. {form.job_description.length} written</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="job-state" className="block text-sm font-semibold text-slate-700 mb-1.5">
                State <span className="text-red-500">*</span>
              </label>
              <select
                id="job-state"
                value={form.location_state}
                onChange={(e) => set("location_state", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Select state</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="job-budget" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Budget <span className="text-red-500">*</span>
              </label>
              <select
                id="job-budget"
                value={form.budget_band}
                onChange={(e) => set("budget_band", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Select budget</option>
                {BUDGETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
              <p className="text-xs text-slate-500 mt-1">Total project budget. SOA from ~$1,500 · Hourly from ~$250/hr</p>
            </div>
          </div>

          {/* Idea #11 — sealed bidding option (flag-gated). */}
          {sealedOptionEnabled && (
            <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-3.5 hover:border-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={form.sealed}
                onChange={(e) => set("sealed", e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-indigo-500 shrink-0"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Icon name="lock" size={13} className="text-indigo-600" />
                  Sealed bids
                </span>
                <span className="mt-0.5 block text-xs text-slate-500 leading-relaxed">
                  Advisers can&apos;t see each other&apos;s quote amounts until your request closes — only the number of quotes. You still see every amount. Encourages each adviser to price on the merits.
                </span>
              </span>
            </label>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canDetails}
              onClick={() => setStep("advisors")}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-900 font-bold px-7 py-3 rounded-xl"
            >
              Continue <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </div>
      )}

      {step === "advisors" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Who do you need?</h2>
            <p className="text-sm text-slate-500">Pick everyone who could help — picking more types means more quotes.</p>
          </div>

          <AdvisorOptInCheckboxes
            selected={advisorTypes}
            onChange={setAdvisorTypes}
            options={DEFAULT_ADVISOR_OPT_INS}
            heading="Pick advisor types"
            subheading="Each ticked type will see your job and may submit a quote."
          />

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep("details")}
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-sm px-4 py-2.5"
            >
              <Icon name="arrow-left" size={14} /> Back
            </button>
            <button
              type="button"
              disabled={!canAdvisors}
              onClick={() => setStep("contact")}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-900 font-bold px-7 py-3 rounded-xl"
            >
              Continue <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </div>
      )}

      {step === "contact" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Your details</h2>
            <p className="text-sm text-slate-500">We&apos;ll email you the link to your job page so you can review quotes.</p>
          </div>

          <div>
            <label htmlFor="contact-name" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="contact-name"
              type="text"
              value={form.contact_name}
              onChange={(e) => set("contact_name", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="contact-email"
                type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                value={form.contact_email}
                onChange={(e) => set("contact_email", e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label htmlFor="contact-phone" className="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label>
              <input
                id="contact-phone"
                type="tel"
                autoComplete="tel"
                value={form.contact_phone}
                onChange={(e) => set("contact_phone", e.target.value)}
                placeholder="+61 4XX XXX XXX"
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.agree_terms}
              onChange={(e) => set("agree_terms", e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-amber-500 shrink-0"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              I agree to share my contact details with the advisor I accept a bid from. I&apos;ve read the{" "}
              <Link href="/privacy" className="underline hover:text-slate-700">privacy policy</Link>
              {" "}and{" "}
              <Link href="/terms" className="underline hover:text-slate-700">terms</Link>.
            </span>
          </label>

          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep("advisors")}
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-sm px-4 py-2.5"
            >
              <Icon name="arrow-left" size={14} /> Back
            </button>
            <button
              type="button"
              disabled={!canContact || loading}
              onClick={submit}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-300 text-slate-900 font-bold px-8 py-3 rounded-xl"
            >
              {loading ? (
                <>
                  <div aria-hidden="true" className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  Posting...
                </>
              ) : (
                <>Post job <Icon name="check" size={16} /></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
