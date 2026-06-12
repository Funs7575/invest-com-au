"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import FormStepper from "@/components/FormStepper";
import {
  BRIEF_TEMPLATES,
  BRIEF_TEMPLATE_LABELS,
  BRIEF_TEMPLATE_FIELDS,
  type FieldHint,
} from "@/lib/briefs/templates";
import type { BriefTemplate } from "@/lib/briefs/types";
import {
  getIntentById,
  intentForTemplate,
  type IntentDef,
} from "@/lib/briefs/intent-catalog";
import { scoreBriefStrength } from "@/lib/briefs/brief-strength";
import IntentPicker from "@/components/briefs/IntentPicker";
import BriefPreviewCard from "@/components/briefs/BriefPreviewCard";
import BriefStrengthMeter from "@/components/briefs/BriefStrengthMeter";
import MatchModeChooser, { type MatchPatch } from "@/components/briefs/MatchModeChooser";
import BriefHowItWorksRail from "@/components/briefs/BriefHowItWorksRail";
import BriefSuccess from "@/components/briefs/BriefSuccess";
import ListingCompanionServices from "./ListingCompanionServices";

type Step = "intent" | "details" | "match" | "contact" | "success";

const STEP_ORDER: Step[] = ["intent", "details", "match", "contact"];
const STEPPER: { label: string }[] = [
  { label: "What you need" },
  { label: "Details" },
  { label: "Matching" },
  { label: "Contact" },
];

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const BUDGETS = [
  { value: "under_500", label: "Under $500" },
  { value: "500_2k", label: "$500 – $2,000" },
  { value: "2k_5k", label: "$2,000 – $5,000" },
  { value: "5k_10k", label: "$5,000 – $10,000" },
  { value: "10k_plus", label: "$10,000+" },
  { value: "not_sure", label: "Budget TBD" },
];

const PROVIDER_PREF_LABELS: Record<string, string> = {
  any: "Any verified pro",
  individual: "An individual expert",
  firm: "A firm / brokerage",
  expert_team: "An expert team",
  multiple: "Multiple verified pros",
};

const DRAFT_KEY = "brief-studio-draft:v1";

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
  joinPool: boolean;
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
  routing_mode: "multi_response",
  target_team_slug: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  consent: false,
  joinPool: false,
};

export interface WorkspaceContext {
  kind:
    | "advisor"
    | "broker_partner"
    | "investor"
    | "business_owner"
    | "listing_owner"
    | "startup"
    | "org_admin";
  label: string;
  prefillName: string | null;
  prefillEmail: string | null;
  prefillPhone: string | null;
}

interface BriefFormProps {
  /**
   * Whether the AI co-pilot drafting path is enabled. Resolved server-side
   * via `isFlagEnabled('ai_match_request_copilot', ...)`. The freeform
   * "describe it in your own words" entry always exists; when this is false
   * it seeds a general brief from the text instead of calling the AI.
   */
  aiCopilotEnabled?: boolean;
  /** Server-resolved active workspace — drives the "Filing as" chip and prefills contact. */
  workspace?: WorkspaceContext | null;
  /**
   * Signed-in investor fallback prefill (Money Profile) — used when no
   * business/listing workspace supplies contact details. Name/email come
   * from the account; state from the Money Profile.
   */
  investorPrefill?: { name: string | null; email: string | null; state: string | null } | null;
  /** Server-resolved Investor Pro subscription state — unlocks the direct-route perk. */
  proSubscriber?: boolean;
  /** Honest count of active verified pros, for social proof. Null hides the number. */
  proSupply?: number | null;
  /**
   * Whether the Group Briefs opt-in is enabled. Resolved server-side via
   * `isFlagEnabled('demand_pools', ...)`. When false the opt-in checkbox never
   * renders (fail-closed dormancy) and the brief never joins a pool.
   */
  poolOptInEnabled?: boolean;
  /**
   * Household block (idea #6) — non-null only when the `households` flag is on
   * AND the signed-in user is in a household with an accepted partner. Drives
   * the isolated "post as household" checkbox in the contact step. When absent,
   * the block does not render at all (flag-off / no-household = fully dormant).
   *
   * DUAL-NOTIFY DECISION: the brief model (advisor_auctions) has no field for
   * extra notification recipients and the consumer notification path is
   * single-email, so we do NOT dual-notify the partner. Checking the box badges
   * the brief copy (a household line prepended to the description that pros see)
   * — nothing more. See the submit() transform below.
   */
  householdContext?: { partnerLabel: string; ownLabel: string } | null;
}

export default function BriefForm({
  aiCopilotEnabled = false,
  workspace = null,
  investorPrefill = null,
  proSubscriber = false,
  proSupply = null,
  poolOptInEnabled = false,
  householdContext = null,
}: BriefFormProps) {
  // Household block state (idea #6) — isolated, self-contained. See prop docs.
  const [postAsHousehold, setPostAsHousehold] = useState(false);
  const searchParams = useSearchParams();
  const presetTeam = searchParams?.get("team") ?? "";
  const presetTemplate = searchParams?.get("template") ?? "";
  const presetProviderPreference = searchParams?.get("provider_preference") ?? "";
  const presetRoutingMode = searchParams?.get("routing_mode") ?? "";
  const planId = searchParams?.get("plan_id") ?? "";
  const hasPreset = !!(presetTeam || presetTemplate || planId);

  // ── Freeform / AI co-pilot state ────────────────────────────────────
  const [freeformMode, setFreeformMode] = useState(false);
  const [freeformText, setFreeformText] = useState("");
  const [freeformLoading, setFreeformLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("intent");
  const [selectedIntentId, setSelectedIntentId] = useState<string | null>(
    presetTemplate ? intentForTemplate(presetTemplate as BriefTemplate)?.id ?? null : null,
  );
  const [form, setForm] = useState<FormState>(() => ({
    ...INITIAL,
    target_team_slug: presetTeam || "",
    routing_mode: presetRoutingMode || (presetTeam ? "direct" : "multi_response"),
    provider_preference: presetProviderPreference || "any",
    brief_template: (BRIEF_TEMPLATES.includes(presetTemplate as BriefTemplate)
      ? (presetTemplate as BriefTemplate)
      : "") as BriefTemplate | "",
    contact_name: workspace?.prefillName ?? investorPrefill?.name ?? INITIAL.contact_name,
    contact_email: workspace?.prefillEmail ?? investorPrefill?.email ?? INITIAL.contact_email,
    contact_phone: workspace?.prefillPhone ?? INITIAL.contact_phone,
    location_state: investorPrefill?.state ?? INITIAL.location_state,
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    slug: string;
    accept_credits_cost: number | null;
    risk_review_status: string;
  } | null>(null);
  const [planPrefilled, setPlanPrefilled] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const draftLoaded = useRef(false);

  // ── Draft restore (once, only for clean anonymous starts) ───────────
  useEffect(() => {
    if (draftLoaded.current) return;
    draftLoaded.current = true;
    if (hasPreset || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { form?: FormState; step?: Step; intentId?: string | null };
      const f = saved.form;
      if (!f || typeof f !== "object") return;
      // Only restore if there's meaningful content and a valid template.
      const validTemplate = f.brief_template && BRIEF_TEMPLATES.includes(f.brief_template);
      if (!validTemplate && !f.job_title && !f.job_description) return;
      setForm((prev) => ({ ...prev, ...f }));
      setSelectedIntentId(saved.intentId ?? null);
      const restoredStep = saved.step && STEP_ORDER.includes(saved.step) ? saved.step : "details";
      setStep(restoredStep);
      setRestoredDraft(true);
    } catch {
      /* ignore malformed draft */
    }
  }, [hasPreset]);

  // ── Draft autosave ──────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (planId || step === "intent" || step === "success") return;
    try {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ form, step, intentId: selectedIntentId }),
      );
    } catch {
      /* storage full / disabled — non-fatal */
    }
  }, [form, step, selectedIntentId, planId]);

  function clearDraft() {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }

  // ── Pre-fill from Get Matched action plan ───────────────────────────
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
          provider_preference: presetProviderPreference || providerPrefForRoute(plan?.route),
          routing_mode: presetRoutingMode || "multi_response",
          payload: plan?.answers ?? {},
        }));
        setSelectedIntentId(intentForTemplate(template)?.id ?? null);
        setPlanPrefilled(true);
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

  const strength = useMemo(
    () =>
      scoreBriefStrength({
        title: form.job_title,
        description: form.job_description,
        budgetBand: form.budget_band,
        locationState: form.location_state,
        payload: form.payload,
        fields,
      }),
    [form.job_title, form.job_description, form.budget_band, form.location_state, form.payload, fields],
  );

  const activeIntent = getIntentById(selectedIntentId);
  const intentLabel =
    activeIntent?.label ??
    (form.brief_template ? BRIEF_TEMPLATE_LABELS[form.brief_template] : null);
  const budgetLabel = BUDGETS.find((b) => b.value === form.budget_band)?.label ?? null;

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function setPayload(key: string, value: unknown) {
    setForm((p) => ({ ...p, payload: { ...p.payload, [key]: value } }));
  }

  const canDetails =
    form.job_title.trim().length >= 8 &&
    form.job_description.trim().length >= 30 &&
    !!form.budget_band &&
    !!form.location_state &&
    fields
      .filter((f) => f.required)
      .every((f) => {
        const v = form.payload[f.key];
        if (f.kind === "multiselect") return Array.isArray(v) && v.length > 0;
        return typeof v === "string" && v.length > 0;
      });
  const canContact =
    form.contact_name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email) &&
    form.consent;

  function selectIntent(intent: IntentDef) {
    setSelectedIntentId(intent.id);
    setForm((p) => ({
      ...p,
      brief_template: intent.template,
      provider_preference: presetProviderPreference || intent.providerPreference || "any",
      routing_mode: p.routing_mode || "multi_response",
    }));
    setInfo(null);
    setStep("details");
  }

  function openFreeform() {
    setFreeformMode(true);
    setInfo(null);
  }

  async function submitFreeform() {
    const text = freeformText.trim();
    if (text.length < 10) {
      setInfo("Tell us a bit more — at least 10 characters.");
      return;
    }
    // No AI: seed a general brief from the text and let the user refine.
    if (!aiCopilotEnabled) {
      setForm((p) => ({
        ...p,
        brief_template: p.brief_template || "general",
        job_description: p.job_description || text,
      }));
      setSelectedIntentId((id) => id ?? "general");
      setFreeformMode(false);
      setStep("details");
      setInfo("We've started your brief — add a title and a few details below.");
      return;
    }
    // AI co-pilot drafting path.
    setFreeformLoading(true);
    setInfo(null);
    try {
      const res = await fetch("/api/briefs/ai-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text }),
      });
      if (res.status === 404) {
        // Flag flipped off — fall back to seeding a general brief.
        setForm((p) => ({
          ...p,
          brief_template: p.brief_template || "general",
          job_description: p.job_description || text,
        }));
        setSelectedIntentId((id) => id ?? "general");
        setFreeformMode(false);
        setStep("details");
        return;
      }
      if (!res.ok) {
        setInfo("We couldn't draft your brief. Pick an option below instead.");
        setFreeformMode(false);
        return;
      }
      const data = (await res.json()) as {
        ok: boolean;
        payload: {
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
      const good = data.ok && data.confidence >= 0.6 && (data.missing_fields?.length ?? 0) === 0;
      const p = data.payload || {};
      const template = BRIEF_TEMPLATES.includes(p.brief_template as BriefTemplate)
        ? (p.brief_template as BriefTemplate)
        : form.brief_template || "general";
      setForm((prev) => ({
        ...prev,
        brief_template: template || "general",
        job_title: p.job_title ?? prev.job_title,
        job_description: p.job_description ?? text,
        budget_band: p.budget_band ?? prev.budget_band,
        location_state: p.location_state ?? prev.location_state,
        payload: { ...prev.payload, ...(p.brief_payload ?? {}) },
      }));
      setSelectedIntentId(intentForTemplate(template as BriefTemplate)?.id ?? "general");
      setFreeformMode(false);
      setStep("details");
      setInfo(
        good
          ? "We've drafted your brief — review and refine it below."
          : "We've made a start — please fill in the highlighted details below.",
      );
    } catch {
      setInfo("We couldn't draft your brief. Pick an option below instead.");
      setFreeformMode(false);
    } finally {
      setFreeformLoading(false);
    }
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const fromPlan = !!planId && planPrefilled;
      const url = fromPlan ? `/api/get-matched/plans/${planId}/to-brief` : "/api/briefs";
      // Household badge (idea #6): when "post as household" is on we prepend a
      // single household line to the description pros see. We do NOT dual-notify
      // the partner — the brief model has no extra-recipient field (decision
      // documented on the householdContext prop). This transform is the block's
      // only effect on the submitted body.
      const jobDescription =
        householdContext && postAsHousehold
          ? `[Posting as a household: ${householdContext.ownLabel} & ${householdContext.partnerLabel}]\n\n${form.job_description}`
          : form.job_description;
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
            job_description: jobDescription,
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
            join_demand_pool: poolOptInEnabled ? form.joinPool : false,
          };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create brief.");
      clearDraft();
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

  // ── Success ─────────────────────────────────────────────────────────
  if (step === "success" && result) {
    return (
      <BriefSuccess
        slug={result.slug}
        contactEmail={form.contact_email}
        riskReviewStatus={result.risk_review_status}
      />
    );
  }

  // ── Freeform / AI drafting view ─────────────────────────────────────
  if (freeformMode) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {aiCopilotEnabled && (
              <Badge variant="warning" size="sm">
                <Icon name="zap" size={11} /> AI co-pilot · beta
              </Badge>
            )}
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Tell us what you&apos;re trying to do
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Describe your situation in your own words.{" "}
              {aiCopilotEnabled
                ? "We'll draft a structured brief for you to review."
                : "We'll set up the right brief for you to refine."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFreeformMode(false);
              setInfo(null);
            }}
            className="shrink-0 text-xs font-semibold text-slate-500 underline hover:text-slate-700"
          >
            Pick from a list
          </button>
        </div>
        <textarea
          rows={8}
          maxLength={3000}
          value={freeformText}
          onChange={(e) => setFreeformText(e.target.value)}
          placeholder="e.g. I'm a 38-year-old in NSW with a $200k super balance and I'm thinking about setting up an SMSF to buy an investment property in QLD. Budget around $2,000 for advice. Need help in the next 3 months."
          className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <p className="mt-1 text-xs text-slate-500">{freeformText.length} / 3000</p>
        {info && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {info}
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <Button
            onClick={submitFreeform}
            loading={freeformLoading}
            disabled={freeformText.trim().length < 10}
            icon={<Icon name="arrow-right" size={16} />}
          >
            {aiCopilotEnabled ? "Draft my brief" : "Continue"}
          </Button>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          AI assists with structuring only — verified pros deliver the service
          under their own licence. We never give personal advice.
        </p>
      </div>
    );
  }

  const currentStepIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      {/* Workspace chip */}
      {workspace && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold uppercase tracking-wide text-slate-500">Filing as</span>
          <span className="truncate font-bold text-slate-900">{workspace.label}</span>
          <Link
            href="/account/select-workspace"
            className="ml-auto shrink-0 font-semibold text-amber-700 hover:underline"
          >
            Switch
          </Link>
        </div>
      )}

      {/* Restored-draft banner */}
      {restoredDraft && step !== "intent" && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          <Icon name="rotate-ccw" size={14} className="mt-0.5 shrink-0 text-blue-500" />
          <p className="leading-relaxed">
            <strong>We saved your progress.</strong> Picked up right where you left off.{" "}
            <button
              type="button"
              onClick={() => {
                clearDraft();
                setForm({
                  ...INITIAL,
                  contact_name: workspace?.prefillName ?? "",
                  contact_email: workspace?.prefillEmail ?? "",
                  contact_phone: workspace?.prefillPhone ?? "",
                });
                setSelectedIntentId(null);
                setRestoredDraft(false);
                setStep("intent");
              }}
              className="font-semibold underline hover:text-blue-700"
            >
              Start over
            </button>
          </p>
        </div>
      )}

      <div className="mb-5">
        <FormStepper steps={STEPPER} currentStepIndex={currentStepIndex} />
      </div>

      {info && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {info}
        </div>
      )}

      <div key={step} style={{ animation: "slideInRight 0.3s ease-out" }}>
          {step === "intent" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 md:text-xl">
                  What do you need help with?
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Pick a category, search, or describe it in your own words.
                </p>
              </div>
              <IntentPicker
                selectedIntentId={selectedIntentId}
                onSelect={selectIntent}
                onFreeform={openFreeform}
                aiEnabled={aiCopilotEnabled}
              />
            </div>
          )}

          {step === "details" && form.brief_template && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {intentLabel ?? "Tell pros about it"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Be specific — clear briefs get more, better responses.
                </p>
              </div>

              <Input
                id="brief-title"
                label="Title"
                required
                maxLength={120}
                value={form.job_title}
                onChange={(e) => setField("job_title", e.target.value)}
                placeholder="e.g. SMSF property strategy in QLD"
                hint={
                  form.job_title.trim().length > 0 && form.job_title.trim().length < 8
                    ? undefined
                    : "A specific one-liner helps pros decide fast."
                }
                error={
                  form.job_title.trim().length > 0 && form.job_title.trim().length < 8
                    ? "Add a little more — at least 8 characters."
                    : undefined
                }
              />

              <div>
                <label
                  htmlFor="brief-description"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Describe the situation <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="brief-description"
                  rows={5}
                  maxLength={3000}
                  value={form.job_description}
                  onChange={(e) => setField("job_description", e.target.value)}
                  placeholder={
                    activeIntent?.examples[0] ??
                    "What's the situation, what outcome you want, and any deadlines."
                  }
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all duration-150 hover:border-slate-300 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {form.job_description.trim().length < 30
                      ? `${30 - form.job_description.trim().length} more characters for a complete brief`
                      : "Looking good"}
                  </span>
                  <span className="text-xs text-slate-500">{form.job_description.length} / 3000</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  id="brief-state"
                  label="State"
                  required
                  value={form.location_state}
                  onChange={(e) => setField("location_state", e.target.value)}
                  options={[
                    { value: "", label: "Select state" },
                    ...STATES.map((s) => ({ value: s, label: s })),
                  ]}
                />
                <Select
                  id="brief-budget"
                  label="Budget band"
                  required
                  value={form.budget_band}
                  onChange={(e) => setField("budget_band", e.target.value)}
                  options={[{ value: "", label: "Select budget" }, ...BUDGETS]}
                />
              </div>

              {fields.length > 0 && (
                <div className="space-y-4 border-t border-slate-100 pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    A few specifics
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

              {(form.brief_template === "listing" ||
                form.brief_template === "listing_readiness") && <ListingCompanionServices />}

              <StepNav
                onBack={() => setStep("intent")}
                onNext={() => setStep("match")}
                nextDisabled={!canDetails}
                nextLabel="Continue"
              />
            </div>
          )}

          {step === "match" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">How do you want to be matched?</h2>
                <p className="mt-1 text-sm text-slate-500">You stay in control the whole way.</p>
              </div>
              <MatchModeChooser
                routingMode={form.routing_mode}
                providerPreference={form.provider_preference}
                targetSlug={form.target_team_slug}
                proSubscriber={proSubscriber}
                proSupply={proSupply}
                onChange={(patch: MatchPatch) => setForm((p) => ({ ...p, ...patch }))}
              />
              <StepNav
                onBack={() => setStep("details")}
                onNext={() => setStep("contact")}
                nextDisabled={false}
                nextLabel="Continue"
              />
            </div>
          )}

          {step === "contact" && (
            <div className="space-y-5">
              {planPrefilled && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <Icon name="check-circle" size={14} className="mt-0.5 shrink-0 text-amber-600" />
                  <p className="text-xs leading-relaxed text-amber-900">
                    <strong>Pre-filled from your Action Plan.</strong> Edit anything below.
                  </p>
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-slate-900">Where should responses go?</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Hidden from pros until one responds and you choose to share.
                </p>
              </div>

              <Input
                id="brief-contact-name"
                label="Name"
                required
                value={form.contact_name}
                onChange={(e) => setField("contact_name", e.target.value)}
                placeholder="Your name"
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  id="brief-contact-email"
                  label="Email"
                  required
                  type="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={form.contact_email}
                  onChange={(e) => setField("contact_email", e.target.value)}
                  placeholder="you@example.com"
                />
                <Input
                  id="brief-contact-phone"
                  label="Phone (optional)"
                  type="tel"
                  autoComplete="tel"
                  value={form.contact_phone}
                  onChange={(e) => setField("contact_phone", e.target.value)}
                  placeholder="+61 4XX XXX XXX"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => setField("consent", e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500"
                />
                <span className="text-xs leading-relaxed text-slate-600">
                  I&apos;m happy for my brief details (without contact information) to be
                  shown to relevant verified pros. My contact details are only shared
                  after a pro responds and I choose to share them. I&apos;ve read the{" "}
                  <Link href="/privacy" className="underline hover:text-slate-700">
                    privacy policy
                  </Link>{" "}
                  and{" "}
                  <Link href="/terms" className="underline hover:text-slate-700">
                    terms
                  </Link>
                  . I understand Invest.com.au provides general information only — the
                  professional, firm or team I engage delivers the service under their
                  own licence.
                </span>
              </label>

              {/* Group Briefs opt-in (idea #17) — flag-gated; renders only when
                  the demand_pools flag is on. Factual copy: a group offer is
                  the adviser's own package; each member decides individually. */}
              {poolOptInEnabled && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <input
                    type="checkbox"
                    checked={form.joinPool}
                    onChange={(e) => setField("joinPool", e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500"
                  />
                  <span className="text-xs leading-relaxed text-slate-700">
                    <strong>Join others with the same need.</strong> Advisers may make
                    a group offer (a package and availability) to everyone with a
                    similar request this month — you decide individually whether to
                    accept. Your details stay private until you accept an offer.
                  </span>
                </label>
              )}

              {/* Household block (idea #6) — isolated, flag-gated. Renders only
                  when householdContext is non-null (flag on + accepted partner).
                  Badges the brief as a household post; does not dual-notify. */}
              {householdContext && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
                  <input
                    type="checkbox"
                    checked={postAsHousehold}
                    onChange={(e) => setPostAsHousehold(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-violet-600"
                  />
                  <span className="text-xs leading-relaxed text-violet-900">
                    <strong>Post as a household</strong> ({householdContext.ownLabel} &amp;{" "}
                    {householdContext.partnerLabel}). We&apos;ll note on the brief that
                    you&apos;re looking together, so pros know it&apos;s a joint decision.
                  </span>
                </label>
              )}

              {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <StepNav
                onBack={() => setStep("match")}
                onNext={submit}
                nextDisabled={!canContact}
                nextLoading={loading}
                nextLabel="Post my brief"
                nextIcon={<Icon name="check" size={16} />}
              />
            </div>
          )}
        </div>
      </div>

      {/* Contextual rail — how-it-works on the intent step, then a live
          "what pros see" preview + strength meter once a brief is forming. */}
      <aside className="space-y-3 lg:sticky lg:top-20">
        {step === "intent" ? (
          <BriefHowItWorksRail proSupply={proSupply} />
        ) : (
          <>
            <BriefPreviewCard
              intentLabel={intentLabel}
              title={form.job_title}
              description={form.job_description}
              budgetLabel={budgetLabel}
              locationState={form.location_state || null}
              providerPreferenceLabel={
                step === "match" || step === "contact"
                  ? PROVIDER_PREF_LABELS[form.provider_preference] ?? null
                  : null
              }
            />
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <BriefStrengthMeter strength={strength} />
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  nextDisabled,
  nextLoading,
  nextLabel,
  nextIcon,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  nextLoading?: boolean;
  nextLabel: string;
  nextIcon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 px-2 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <Icon name="arrow-left" size={14} /> Back
      </button>
      <Button
        onClick={onNext}
        disabled={nextDisabled}
        loading={nextLoading}
        icon={nextIcon ?? <Icon name="arrow-right" size={16} />}
        className="min-w-[9rem]"
      >
        {nextLabel}
      </Button>
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
  const id = useId();
  if (field.kind === "text") {
    return (
      <Input
        id={id}
        label={field.label}
        required={field.required}
        maxLength={field.maxLength}
        placeholder={field.placeholder}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.kind === "textarea") {
    return (
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
        </label>
        <textarea
          id={id}
          rows={3}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all duration-150 hover:border-slate-300 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
    );
  }
  if (field.kind === "select") {
    return (
      <Select
        id={id}
        label={field.label}
        required={field.required}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        options={[{ value: "", label: "Select…" }, ...(field.options ?? [])]}
      />
    );
  }
  // multiselect
  const arr = Array.isArray(value) ? (value as string[]) : [];
  return (
    <div>
      <p className="mb-1.5 block text-sm font-semibold text-slate-700">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {field.options?.map((o) => {
          const checked = arr.includes(o.value);
          return (
            <label
              key={o.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                checked ? "border-amber-500 bg-amber-50" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                className="accent-amber-500"
                checked={checked}
                onChange={() => {
                  const next = checked ? arr.filter((x) => x !== o.value) : [...arr, o.value];
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
