"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import Icon from "@/components/Icon";
import {
  BRIEF_TEMPLATES,
  BRIEF_TEMPLATE_LABELS,
  BRIEF_TEMPLATE_BLURBS,
  BRIEF_TEMPLATE_FIELDS,
  type FieldHint,
} from "@/lib/briefs/templates";
import type { BriefTemplate } from "@/lib/briefs/types";
import ListingCompanionServices from "./ListingCompanionServices";

type Step = "template" | "details" | "preference" | "contact" | "success";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const BUDGETS = [
  { value: "under_500", label: "Under $500" },
  { value: "500_2k", label: "$500 – $2,000" },
  { value: "2k_5k", label: "$2,000 – $5,000" },
  { value: "5k_10k", label: "$5,000 – $10,000" },
  { value: "10k_plus", label: "$10,000+" },
  { value: "not_sure", label: "Budget TBD" },
];

const PROVIDER_PREFERENCES = [
  { value: "any", label: "No preference" },
  { value: "individual", label: "Individual expert" },
  { value: "firm", label: "Firm / brokerage" },
  { value: "expert_team", label: "Expert team" },
  { value: "multiple", label: "Multiple professional responses" },
];

const ROUTING_MODES = [
  {
    value: "smart_match",
    label: "Smart Match",
    blurb: "We route to the most relevant verified providers.",
  },
  {
    value: "direct",
    label: "Send to a specific provider",
    blurb: "Use a team/firm/individual slug from their profile page.",
  },
  {
    value: "multi_response",
    label: "Receive multiple responses",
    blurb: "Open the brief up to several providers in parallel.",
  },
];

interface FormState {
  brief_template: BriefTemplate | "";
  job_title: string;
  job_description: string;
  budget_band: string;
  location_state: string;
  payload: Record<string, unknown>;
  provider_preference: string;
  routing_mode: string;
  target_team_slug: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  consent: boolean;
}

function providerPrefForRoute(route: string | null | undefined): string {
  if (route === "expert_team") return "expert_team";
  if (route === "firm") return "firm";
  if (route === "individual") return "individual";
  return "any";
}

const INITIAL: FormState = {
  brief_template: "",
  job_title: "",
  job_description: "",
  budget_band: "",
  location_state: "",
  payload: {},
  provider_preference: "any",
  routing_mode: "smart_match",
  target_team_slug: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  consent: false,
};

interface BriefFormProps {
  /**
   * Whether the AI co-pilot toggle should render. Resolved server-side
   * via `isFlagEnabled('ai_match_request_copilot', ...)` in the parent
   * server page. When false the toggle never renders, so the freeform
   * textarea + Submit button path is never reachable client-side either.
   */
  aiCopilotEnabled?: boolean;
}

export default function BriefForm({ aiCopilotEnabled = false }: BriefFormProps) {
  const searchParams = useSearchParams();
  const presetTeam = searchParams?.get("team") ?? "";
  const presetTemplate = searchParams?.get("template") ?? "";
  const presetProviderPreference = searchParams?.get("provider_preference") ?? "";
  const presetRoutingMode = searchParams?.get("routing_mode") ?? "";
  const planId = searchParams?.get("plan_id") ?? "";

  // ── AI co-pilot state ───────────────────────────────────────────────
  // The toggle only renders when the parent server page passed
  // aiCopilotEnabled=true (feature flag on). When toggled ON, we replace
  // the multi-step form with a single textarea. On submit the textarea
  // POSTs to /api/briefs/ai-copilot; if confidence is high enough we
  // pre-fill the form and drop the user back into step "details" to
  // review. Otherwise we fall back to the manual flow with a toast.
  const [copilotMode, setCopilotMode] = useState(false);
  const [copilotText, setCopilotText] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotInfo, setCopilotInfo] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("template");
  const [form, setForm] = useState<FormState>(() => ({
    ...INITIAL,
    target_team_slug: presetTeam || "",
    routing_mode: presetRoutingMode || (presetTeam ? "direct" : "smart_match"),
    provider_preference: presetProviderPreference || "any",
    brief_template: (BRIEF_TEMPLATES.includes(presetTemplate as BriefTemplate)
      ? (presetTemplate as BriefTemplate)
      : "") as BriefTemplate | "",
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    slug: string;
    accept_credits_cost: number | null;
    risk_review_status: string;
  } | null>(null);
  const [planPrefilled, setPlanPrefilled] = useState(false);

  // Pre-fill from Get Matched action plan if plan_id present.
  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/get-matched/plans/by-id/${planId}`);
        if (!res.ok) return;
        const data = await res.json();
        const plan = data.plan;
        const template =
          (data.recommended_brief_template as BriefTemplate | null) ??
          (BRIEF_TEMPLATES.includes(plan?.intent_slug)
            ? (plan?.intent_slug as BriefTemplate)
            : "general");
        if (cancelled) return;
        setForm((p) => ({
          ...p,
          brief_template: template,
          job_title: plan?.goal ?? "Investment brief",
          job_description: data.description ?? "Investment brief from action plan.",
          budget_band: plan?.budget_band ?? "not_sure",
          location_state: plan?.location_state ?? "NSW",
          provider_preference:
            presetProviderPreference || providerPrefForRoute(plan?.route),
          routing_mode: presetRoutingMode || "smart_match",
          payload: plan?.answers ?? {},
        }));
        setPlanPrefilled(true);
        // Skip ahead to contact step since template + details + preference
        // are now known.
        setStep("contact");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const fields: FieldHint[] = useMemo(() => {
    if (!form.brief_template) return [];
    return BRIEF_TEMPLATE_FIELDS[form.brief_template] ?? [];
  }, [form.brief_template]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function setPayload(key: string, value: unknown) {
    setForm((p) => ({ ...p, payload: { ...p.payload, [key]: value } }));
  }

  const canTemplate = !!form.brief_template;
  const canDetails =
    form.job_title.trim().length >= 8 &&
    form.job_description.trim().length >= 30 &&
    form.budget_band &&
    form.location_state &&
    fields
      .filter((f) => f.required)
      .every((f) => {
        const v = form.payload[f.key];
        if (f.kind === "multiselect") {
          return Array.isArray(v) && v.length > 0;
        }
        return typeof v === "string" && v.length > 0;
      });
  const canPreference = !!form.provider_preference && !!form.routing_mode;
  const canContact =
    form.contact_name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email) &&
    form.consent;

  async function runCopilot() {
    if (copilotText.trim().length < 10) {
      setCopilotInfo("Tell us a bit more — at least 10 characters.");
      return;
    }
    setCopilotLoading(true);
    setCopilotInfo(null);
    try {
      const res = await fetch("/api/briefs/ai-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: copilotText }),
      });
      if (res.status === 404) {
        // Feature flag flipped off between server render and submit —
        // bail back to the manual form silently.
        setCopilotMode(false);
        setCopilotInfo(null);
        return;
      }
      if (!res.ok) {
        setCopilotInfo("We couldn't draft your brief. Use the form below instead.");
        setCopilotMode(false);
        return;
      }
      const data = (await res.json()) as {
        ok: boolean;
        payload: Partial<FormState> & {
          brief_template?: BriefTemplate;
          job_title?: string;
          job_description?: string;
          budget_band?: string;
          location_state?: string;
          advisor_types?: string[];
          brief_payload?: Record<string, unknown>;
        };
        confidence: number;
        missing_fields: string[];
      };
      const ok =
        data.ok &&
        data.confidence >= 0.6 &&
        (data.missing_fields?.length ?? 0) === 0;

      // Pre-fill what we can regardless — even a low-confidence draft
      // beats an empty form for the user.
      const p = data.payload || {};
      const template = BRIEF_TEMPLATES.includes(p.brief_template as BriefTemplate)
        ? (p.brief_template as BriefTemplate)
        : form.brief_template;
      setForm((prev) => ({
        ...prev,
        brief_template: template || "general",
        job_title: p.job_title ?? prev.job_title,
        job_description: p.job_description ?? prev.job_description,
        budget_band: p.budget_band ?? prev.budget_band,
        location_state: p.location_state ?? prev.location_state,
        payload: { ...prev.payload, ...(p.brief_payload ?? {}) },
      }));

      // Always drop the user into the manual form so they can review.
      setCopilotMode(false);
      setStep("details");
      if (ok) {
        setCopilotInfo("We've drafted your brief — review and submit.");
      } else {
        setCopilotInfo("We need a bit more info — please fill in the highlighted fields.");
      }
    } catch {
      setCopilotInfo("We couldn't draft your brief. Use the form below instead.");
      setCopilotMode(false);
    } finally {
      setCopilotLoading(false);
    }
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      // If we have a plan_id, use the plan→brief endpoint so the brief is
      // linked back to the action plan.
      const fromPlan = !!planId && planPrefilled;
      const url = fromPlan
        ? `/api/get-matched/plans/${planId}/to-brief`
        : "/api/briefs";
      const body = fromPlan
        ? {
            contact_name: form.contact_name,
            contact_email: form.contact_email,
            contact_phone: form.contact_phone || undefined,
            routing_mode: form.routing_mode,
            provider_preference: form.provider_preference,
            consent_share: form.consent,
          }
        : {
            brief_template: form.brief_template,
            brief_payload: form.payload,
            job_title: form.job_title,
            job_description: form.job_description,
            budget_band: form.budget_band,
            location_state: form.location_state,
            provider_preference: form.provider_preference,
            routing_mode: form.routing_mode,
            target_team_slug: form.target_team_slug || undefined,
            advisor_types: [],
            contact_name: form.contact_name,
            contact_email: form.contact_email,
            contact_phone: form.contact_phone || undefined,
            consent_share: form.consent,
          };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create brief.");
      setResult({
        slug: fromPlan ? (data.brief_slug as string) : (data.slug as string),
        accept_credits_cost: data.accept_credits_cost ?? null,
        risk_review_status: data.risk_review_status ?? "clear",
      });
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "success" && result) {
    const heldForReview = result.risk_review_status === "pending_review";
    return (
      <div className="bg-white border border-emerald-200 rounded-2xl p-8 text-center max-w-2xl mx-auto">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="check-circle" size={28} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
          Match Request sent
        </h2>
        <p className="text-slate-600 text-sm leading-relaxed mb-6 max-w-md mx-auto">
          {heldForReview
            ? "Your brief mentions topics that need a quick compliance review before verified providers can see it. We'll email you once it's cleared."
            : `Verified providers can now see a masked preview of your brief. ${
                result.accept_credits_cost
                  ? `Accept cost: ~${result.accept_credits_cost} credits.`
                  : ""
              } We'll email you when a provider accepts.`}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/briefs/${result.slug}?email=${encodeURIComponent(
              form.contact_email,
            )}`}
            className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            View your Quote Status
            <Icon name="arrow-right" size={16} />
          </Link>
          <Link
            href="/advisors"
            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-xl hover:border-slate-300 transition-colors"
          >
            Browse verified providers
          </Link>
        </div>
      </div>
    );
  }

  // ── AI co-pilot mode — single textarea replaces the multi-step form
  if (copilotMode && aiCopilotEnabled) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              Beta
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-2">
              Tell us what you&apos;re trying to do
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Describe your situation in your own words. We&apos;ll draft a brief for you to review.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCopilotMode(false);
              setCopilotInfo(null);
            }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline"
          >
            Use the regular form
          </button>
        </div>
        <textarea
          rows={8}
          maxLength={3000}
          value={copilotText}
          onChange={(e) => setCopilotText(e.target.value)}
          placeholder="e.g. I'm a 38-year-old in NSW with a $200k super balance and I'm thinking about setting up an SMSF to buy an investment property in QLD. Budget around $2,000 for advice. Need help in the next 3 months."
          className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
        />
        <p className="text-xs text-slate-400 mt-1">
          {copilotText.length} / 3000
        </p>
        {copilotInfo && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900 mt-3">
            {copilotInfo}
          </div>
        )}
        <div className="flex justify-end mt-5">
          <button
            type="button"
            disabled={copilotLoading || copilotText.trim().length < 10}
            onClick={runCopilot}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-900 font-bold px-7 py-3 rounded-xl"
          >
            {copilotLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                Drafting…
              </>
            ) : (
              <>
                Draft my brief <Icon name="arrow-right" size={16} />
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-4 leading-relaxed">
          AI assists with structuring only — verified providers deliver the actual service under their own licence. We never give personal advice.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
      {aiCopilotEnabled && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <Icon name="lightbulb" size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-900">Try AI co-pilot (beta).</strong>{" "}
              Describe your situation in plain English and we&apos;ll draft the brief for you.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCopilotMode(true);
              setCopilotInfo(null);
            }}
            className="text-xs font-bold text-amber-700 hover:text-amber-900 underline shrink-0"
          >
            Try it
          </button>
        </div>
      )}
      {copilotInfo && !copilotMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900 mb-4">
          {copilotInfo}
        </div>
      )}
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {(["template", "details", "preference", "contact"] as Step[]).map(
          (s, i) => {
            const order: Step[] = ["template", "details", "preference", "contact"];
            const cur = order.indexOf(step);
            const idx = order.indexOf(s);
            const done = cur > idx;
            const active = step === s;
            const labels: Record<string, string> = {
              template: "Template",
              details: "Details",
              preference: "Match",
              contact: "Contact",
            };
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                {i > 0 && (
                  <div
                    className={`flex-1 h-px ${done ? "bg-amber-500" : "bg-slate-200"}`}
                  />
                )}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      done
                        ? "bg-amber-500 text-slate-900"
                        : active
                          ? "bg-slate-900 text-white"
                          : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {done ? <Icon name="check" size={13} /> : i + 1}
                  </div>
                  <span
                    className={`text-xs hidden sm:block ${active ? "text-slate-900 font-semibold" : "text-slate-400"}`}
                  >
                    {labels[s]}
                  </span>
                </div>
              </div>
            );
          },
        )}
      </div>

      {step === "template" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              What kind of help do you need?
            </h2>
            <p className="text-sm text-slate-500">
              Pick the closest match. We ask a few structured questions so verified pros can quote you well.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BRIEF_TEMPLATES.filter(
              (t) => t !== "listing" && t !== "listing_readiness",
            ).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setField("brief_template", t)}
                className={`text-left rounded-xl p-4 border transition-colors ${
                  form.brief_template === t
                    ? "border-amber-500 ring-2 ring-amber-300 bg-amber-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="font-bold text-sm text-slate-900">
                  {BRIEF_TEMPLATE_LABELS[t]}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  {BRIEF_TEMPLATE_BLURBS[t]}
                </p>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canTemplate}
              onClick={() => setStep("details")}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-900 font-bold px-7 py-3 rounded-xl"
            >
              Continue <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </div>
      )}

      {step === "details" && form.brief_template && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              {BRIEF_TEMPLATE_LABELS[form.brief_template]}
            </h2>
            <p className="text-sm text-slate-500">
              Be specific — verified providers respond better when the brief is clear.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={120}
              value={form.job_title}
              onChange={(e) => setField("job_title", e.target.value)}
              placeholder="e.g. SMSF property strategy in QLD"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Describe the situation <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              maxLength={3000}
              value={form.job_description}
              onChange={(e) => setField("job_description", e.target.value)}
              placeholder="What's the situation, what outcome you want, any deadlines."
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
            />
            <p className="text-xs text-slate-400 mt-1">
              {form.job_description.length} / 3000
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                State <span className="text-red-500">*</span>
              </label>
              <select
                value={form.location_state}
                onChange={(e) => setField("location_state", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Select state</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Budget band <span className="text-red-500">*</span>
              </label>
              <select
                value={form.budget_band}
                onChange={(e) => setField("budget_band", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Select budget</option>
                {BUDGETS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {fields.length > 0 && (
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Template-specific details
              </p>
              {fields.map((field) => (
                <DynamicField
                  key={field.key}
                  field={field}
                  value={form.payload[field.key]}
                  onChange={(v) => setPayload(field.key, v)}
                />
              ))}
            </div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep("template")}
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-sm px-4 py-2.5"
            >
              <Icon name="arrow-left" size={14} /> Back
            </button>
            <button
              type="button"
              disabled={!canDetails}
              onClick={() => setStep("preference")}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-900 font-bold px-7 py-3 rounded-xl"
            >
              Continue <Icon name="arrow-right" size={16} />
            </button>
          </div>

          {(form.brief_template === "listing" ||
            form.brief_template === "listing_readiness") && (
            <ListingCompanionServices />
          )}
        </div>
      )}

      {step === "preference" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Who do you want to hear from?
            </h2>
            <p className="text-sm text-slate-500">
              Pick the provider type and the routing mode. You stay in control.
            </p>
          </div>

          <div>
            <p className="block text-sm font-semibold text-slate-700 mb-2">
              Provider preference
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PROVIDER_PREFERENCES.map((p) => (
                <button
                  type="button"
                  key={p.value}
                  onClick={() => setField("provider_preference", p.value)}
                  className={`text-left rounded-lg p-3 border text-sm transition-colors ${
                    form.provider_preference === p.value
                      ? "border-amber-500 ring-2 ring-amber-300 bg-amber-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="block text-sm font-semibold text-slate-700 mb-2">
              Routing mode
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ROUTING_MODES.map((m) => (
                <button
                  type="button"
                  key={m.value}
                  onClick={() => setField("routing_mode", m.value)}
                  className={`text-left rounded-lg p-3 border text-sm transition-colors ${
                    form.routing_mode === m.value
                      ? "border-amber-500 ring-2 ring-amber-300 bg-amber-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="font-semibold text-slate-900">{m.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{m.blurb}</p>
                </button>
              ))}
            </div>
          </div>

          {form.routing_mode === "direct" && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Target team / firm / individual slug
              </label>
              <input
                type="text"
                value={form.target_team_slug}
                onChange={(e) => setField("target_team_slug", e.target.value)}
                placeholder="e.g. sydney-smsf-property-team"
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <p className="text-xs text-slate-400 mt-1">
                Use the slug from a verified team, firm or individual profile URL.
              </p>
            </div>
          )}

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
              disabled={!canPreference}
              onClick={() => setStep("contact")}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-900 font-bold px-7 py-3 rounded-xl"
            >
              Continue <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </div>
      )}

      {step === "contact" && (
        <div className="space-y-6">
          {planPrefilled && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <Icon name="check-circle" size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong>Pre-filled from your Action Plan.</strong> We&apos;ll send this brief with the goal, budget, timeline and route you already picked. Edit anything you need below.
              </p>
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Your details
            </h2>
            <p className="text-sm text-slate-500">
              Hidden from providers until one accepts your brief.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.contact_name}
              onChange={(e) => setField("contact_name", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setField("contact_email", e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={form.contact_phone}
                onChange={(e) => setField("contact_phone", e.target.value)}
                placeholder="+61 4XX XXX XXX"
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => setField("consent", e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-amber-500 shrink-0"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              I&apos;m happy for my brief details (without contact information) to be shown to relevant verified providers. My contact details are only shared after a provider accepts. I&apos;ve read the{" "}
              <Link href="/privacy" className="underline hover:text-slate-700">
                privacy policy
              </Link>
              {" "}and{" "}
              <Link href="/terms" className="underline hover:text-slate-700">
                terms
              </Link>
              . I understand Invest.com.au provides general information only — the professional, firm or team I engage delivers the service under their own licence.
            </span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep("preference")}
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
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  Send Match Request <Icon name="check" size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: FieldHint;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.kind === "text") {
    return (
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
        </label>
        <input
          type="text"
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
    );
  }
  if (field.kind === "textarea") {
    return (
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
        </label>
        <textarea
          rows={3}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
        />
      </div>
    );
  }
  if (field.kind === "select") {
    return (
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
        </label>
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">Select…</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  // multiselect
  const arr = Array.isArray(value) ? (value as string[]) : [];
  return (
    <div>
      <p className="block text-sm font-semibold text-slate-700 mb-1.5">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {field.options?.map((o) => {
          const checked = arr.includes(o.value);
          return (
            <label
              key={o.value}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                checked
                  ? "border-amber-500 bg-amber-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                className="accent-amber-500"
                checked={checked}
                onChange={() => {
                  const next = checked
                    ? arr.filter((x) => x !== o.value)
                    : [...arr, o.value];
                  onChange(next);
                }}
              />
              <span className="text-slate-700">{o.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
