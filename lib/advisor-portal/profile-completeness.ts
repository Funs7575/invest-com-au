/**
 * lib/advisor-portal/profile-completeness.ts
 *
 * Single source of truth for advisor profile-completeness — extracted from the
 * inline calc in app/api/advisor-dashboard/route.ts so it is (a) unit-testable
 * and (b) shared by the dashboard API *and* the guided onboarding wizard.
 *
 * Completeness is DERIVED from existing `professionals` fields (no
 * `profile_completeness` column) so it's always fresh. The field set, weights,
 * labels and order are preserved verbatim from the dashboard route, so the API
 * response (`{ score, missingFields }`) is unchanged; this adds the wizard's
 * 5-step grouping + the "next best action".
 */

/** The five guided wizard steps (brief: photo → bio → specialties → fees → availability). */
export type WizardStepId = "photo" | "bio" | "specialties" | "fees" | "availability";

export interface CompletenessFieldDef {
  /** `professionals` column. */
  key: string;
  /** Human label (mirrors the missingFields labels the dashboard already returns). */
  label: string;
  /** Contribution to the 0–100 score. */
  weight: number;
  /** Which wizard step collects it. */
  step: WizardStepId;
}

// Field set + weights + ORDER preserved from app/api/advisor-dashboard/route.ts
// (total weight = 100). Do not reorder — `missingFields` order is part of the
// existing API contract.
export const COMPLETENESS_FIELDS: CompletenessFieldDef[] = [
  { key: "photo_url",       label: "Profile photo",   weight: 20, step: "photo" },
  { key: "bio",             label: "Bio / About",     weight: 20, step: "bio" },
  { key: "specialties",     label: "Specialties",     weight: 15, step: "specialties" },
  { key: "fee_structure",   label: "Fee structure",   weight: 10, step: "fees" },
  { key: "fee_description", label: "Fee description", weight: 10, step: "fees" },
  { key: "website",         label: "Website URL",     weight: 5,  step: "bio" },
  { key: "phone",           label: "Phone number",    weight: 10, step: "availability" },
  { key: "booking_link",    label: "Booking link",    weight: 10, step: "availability" },
];

export interface WizardStepDef {
  id: WizardStepId;
  title: string;
  /** Commercial framing — why completing it improves matching/conversion. */
  blurb: string;
}

// Ordered for the wizard. The blurbs frame completeness as a commercial benefit
// (the brief), and are truthful platform-level statements (no fabricated stats).
export const WIZARD_STEPS: WizardStepDef[] = [
  { id: "photo",       title: "Add your photo",        blurb: "Investors pick an advisor they can put a face to — a photo is the first trust signal on your card." },
  { id: "bio",         title: "Introduce yourself",    blurb: "A clear bio (and your website) tells matched clients who you are and why you're the right fit." },
  { id: "specialties", title: "Set your specialties",  blurb: "Specialties drive matching — they're how the quiz routes the right clients to you, not someone else." },
  { id: "fees",        title: "Explain your fees",     blurb: "Up-front fee clarity removes the biggest hesitation before a client makes an enquiry." },
  { id: "availability",title: "Make it easy to reach you", blurb: "A phone number and booking link turn a match into a booked call instead of a dead end." },
];

export interface FieldStatus extends CompletenessFieldDef {
  filled: boolean;
}

export interface StepStatus {
  id: WizardStepId;
  title: string;
  blurb: string;
  /** All fields in this step are filled. */
  complete: boolean;
  filledWeight: number;
  totalWeight: number;
  /** Labels of the still-missing fields in this step. */
  missing: string[];
}

export interface CompletenessResult {
  /** 0–100. */
  score: number;
  /** Missing field labels, in COMPLETENESS_FIELDS order (existing API shape). */
  missingFields: string[];
  /** Per-field filled status. */
  fields: FieldStatus[];
  /** Per wizard step rollup. */
  steps: StepStatus[];
  /** Next best action: the first incomplete step in wizard order, or null at 100%. */
  nextStep: WizardStepId | null;
  /** Whether every weighted field is filled. */
  complete: boolean;
}

/** A field counts as filled when it's a non-empty value / non-empty array. */
function isFilled(val: unknown): boolean {
  if (val === null || val === undefined || val === "") return false;
  if (Array.isArray(val) && val.length === 0) return false;
  return true;
}

/**
 * Derive completeness + the wizard step model from a professional row.
 * Tolerant of any row shape (the Supabase row, a partial, or null).
 */
export function deriveProfileCompleteness(
  professional: Record<string, unknown> | null | undefined,
): CompletenessResult {
  const fields: FieldStatus[] = COMPLETENESS_FIELDS.map((f) => ({
    ...f,
    filled: isFilled(professional?.[f.key]),
  }));

  let score = 0;
  const missingFields: string[] = [];
  for (const f of fields) {
    if (f.filled) score += f.weight;
    else missingFields.push(f.label);
  }

  const steps: StepStatus[] = WIZARD_STEPS.map((s) => {
    const stepFields = fields.filter((f) => f.step === s.id);
    const totalWeight = stepFields.reduce((sum, f) => sum + f.weight, 0);
    const filledWeight = stepFields.reduce((sum, f) => sum + (f.filled ? f.weight : 0), 0);
    const missing = stepFields.filter((f) => !f.filled).map((f) => f.label);
    return {
      id: s.id,
      title: s.title,
      blurb: s.blurb,
      complete: missing.length === 0,
      filledWeight,
      totalWeight,
      missing,
    };
  });

  const nextStep = steps.find((s) => !s.complete)?.id ?? null;

  return { score, missingFields, fields, steps, nextStep, complete: nextStep === null };
}
