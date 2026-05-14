/**
 * Investor Brief template registry.
 *
 * Each template defines:
 *   - label / description (UI copy)
 *   - the Zod schema for `brief_payload` so we can validate the structured
 *     answers before insert
 *   - a small UI hint set used by the Brief form to render dynamic fields
 *
 * Four templates ship with proper structured fields. The remaining
 * templates use the generic `notesPayloadSchema` (just a free-text
 * `notes` field) so admins can flesh them out later without code changes
 * on the form side.
 */

import { z } from "zod";

import type { BriefTemplate } from "./types";

export const BRIEF_TEMPLATES: BriefTemplate[] = [
  "general",
  "smsf_property",
  "foreign_investor",
  "expat",
  "opportunity_assessment",
  "business_acquisition",
  "commercial_property",
  "second_opinion",
  "mortgage",
  "tax",
  "smsf_accountant",
  "financial_adviser",
  "listing",
  "listing_readiness",
];

export const BRIEF_TEMPLATE_LABELS: Record<BriefTemplate, string> = {
  general: "General Expert Brief",
  smsf_property: "SMSF Property Brief",
  foreign_investor: "Foreign Investor Brief",
  expat: "Expat Investor Brief",
  opportunity_assessment: "Opportunity Assessment Brief",
  business_acquisition: "Business Acquisition Brief",
  commercial_property: "Commercial Property Brief",
  second_opinion: "Second Opinion Brief",
  mortgage: "Mortgage Brief",
  tax: "Tax / Accounting Brief",
  smsf_accountant: "SMSF Accountant Brief",
  financial_adviser: "Financial Adviser Brief",
  listing: "Listing Brief",
  listing_readiness: "Listing Readiness Check",
};

export const BRIEF_TEMPLATE_BLURBS: Record<BriefTemplate, string> = {
  general: "Tell verified professionals what you need help with.",
  smsf_property: "SMSF property strategy and the team you need to make it happen.",
  foreign_investor: "Investing in Australia from overseas — tax, structuring, FIRB.",
  expat: "Australians abroad — tax residency, super, investing.",
  opportunity_assessment: "Help reviewing a specific opportunity or listing.",
  business_acquisition: "Buying a business — diligence, lending, legal.",
  commercial_property: "Commercial property purchase, lease, or investment.",
  second_opinion: "Get a second opinion on advice you have already received.",
  mortgage: "Home loan, investment loan, refinance or restructure.",
  tax: "Tax planning or return preparation.",
  smsf_accountant: "SMSF establishment, compliance, or accounting.",
  financial_adviser: "General financial planning / wealth strategy.",
  listing: "Post an investment listing — find buyers and stay compliant.",
  listing_readiness: "Get your opportunity ready to list (legal, financial, copy).",
};

const TIMELINE_OPTIONS = [
  "asap",
  "1_3_months",
  "3_6_months",
  "6_12_months",
  "12_months_plus",
  "not_sure",
] as const;

const SMSF_STATUS_OPTIONS = [
  "no_smsf",
  "considering_smsf",
  "smsf_established",
  "not_sure",
] as const;

const SUPER_BALANCE_BANDS = [
  "under_100k",
  "100k_300k",
  "300k_500k",
  "500k_800k",
  "800k_1_2m",
  "1_2m_plus",
  "not_sure",
] as const;

const PROPERTY_BUDGETS = [
  "under_500k",
  "500k_700k",
  "700k_900k",
  "900k_1_2m",
  "1_2m_2m",
  "2m_plus",
  "not_sure",
] as const;

const SMSF_HELP_NEEDED = [
  "smsf_setup",
  "financial_advice",
  "lending",
  "property_search",
  "conveyancing",
  "not_sure",
] as const;

const OPPORTUNITY_HELP_NEEDED = [
  "finance",
  "tax_accounting",
  "legal_review",
  "due_diligence",
  "full_specialist_team",
  "not_sure",
] as const;

const FOREIGN_INVESTOR_HELP_NEEDED = [
  "firb_application",
  "tax_residency",
  "structuring",
  "lending",
  "property_search",
  "not_sure",
] as const;

const VISA_TYPES = [
  "citizen_australia",
  "permanent_resident",
  "temporary_resident",
  "non_resident",
  "considering_migration",
  "not_sure",
] as const;

// ─── Schemas ──────────────────────────────────────────────────────────────

const notesPayloadSchema = z
  .object({
    notes: z.string().max(2000).optional(),
  })
  .strict();

const generalPayloadSchema = z
  .object({
    goal: z.string().max(300).optional(),
    notes: z.string().max(2000).optional(),
    timeline: z.enum(TIMELINE_OPTIONS).optional(),
  })
  .strict();

const smsfPropertyPayloadSchema = z
  .object({
    smsf_status: z.enum(SMSF_STATUS_OPTIONS),
    super_balance_band: z.enum(SUPER_BALANCE_BANDS).optional(),
    property_budget: z.enum(PROPERTY_BUDGETS),
    target_location: z.string().max(120).optional(),
    timeline: z.enum(TIMELINE_OPTIONS),
    help_needed: z.array(z.enum(SMSF_HELP_NEEDED)).min(1).max(SMSF_HELP_NEEDED.length),
    notes: z.string().max(2000).optional(),
  })
  .strict();

const foreignInvestorPayloadSchema = z
  .object({
    country_of_residence: z.string().min(2).max(80),
    visa_type: z.enum(VISA_TYPES).optional(),
    investment_amount_aud: z.string().max(60).optional(),
    asset_type: z.string().max(120).optional(),
    timeline: z.enum(TIMELINE_OPTIONS),
    help_needed: z.array(z.enum(FOREIGN_INVESTOR_HELP_NEEDED)).min(1),
    notes: z.string().max(2000).optional(),
  })
  .strict();

const opportunityAssessmentPayloadSchema = z
  .object({
    listing_url_or_name: z.string().max(500).optional(),
    investment_amount_aud: z.string().max(60).optional(),
    timeline: z.enum(TIMELINE_OPTIONS),
    help_needed: z.array(z.enum(OPPORTUNITY_HELP_NEEDED)).min(1),
    notes: z.string().max(2000).optional(),
  })
  .strict();

// Map every template to its payload schema. Templates without a richer
// schema fall back to `notesPayloadSchema` so admins can iterate copy
// without a code change.
export const BRIEF_TEMPLATE_SCHEMAS: Record<BriefTemplate, z.ZodTypeAny> = {
  general: generalPayloadSchema,
  smsf_property: smsfPropertyPayloadSchema,
  foreign_investor: foreignInvestorPayloadSchema,
  opportunity_assessment: opportunityAssessmentPayloadSchema,
  expat: notesPayloadSchema,
  business_acquisition: notesPayloadSchema,
  commercial_property: notesPayloadSchema,
  second_opinion: notesPayloadSchema,
  mortgage: notesPayloadSchema,
  tax: notesPayloadSchema,
  smsf_accountant: notesPayloadSchema,
  financial_adviser: notesPayloadSchema,
  listing: notesPayloadSchema,
  listing_readiness: notesPayloadSchema,
};

export function getTemplateSchema(template: BriefTemplate): z.ZodTypeAny {
  return BRIEF_TEMPLATE_SCHEMAS[template];
}

export function isBriefTemplate(value: unknown): value is BriefTemplate {
  return typeof value === "string" && (BRIEF_TEMPLATES as readonly string[]).includes(value);
}

/**
 * UI hints consumed by the dynamic brief form to render structured fields
 * for the shipped templates. Other templates rely on the generic notes
 * textarea.
 */
export interface FieldHint {
  key: string;
  label: string;
  kind: "text" | "textarea" | "select" | "multiselect";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}

const TIMELINE_FIELD: FieldHint = {
  key: "timeline",
  label: "Timeline",
  kind: "select",
  required: true,
  options: [
    { value: "asap", label: "As soon as possible" },
    { value: "1_3_months", label: "1–3 months" },
    { value: "3_6_months", label: "3–6 months" },
    { value: "6_12_months", label: "6–12 months" },
    { value: "12_months_plus", label: "12+ months" },
    { value: "not_sure", label: "Not sure yet" },
  ],
};

const NOTES_FIELD: FieldHint = {
  key: "notes",
  label: "Anything else verified providers should know?",
  kind: "textarea",
  maxLength: 2000,
  placeholder: "Optional context, deadlines, preferences.",
};

export const BRIEF_TEMPLATE_FIELDS: Record<BriefTemplate, FieldHint[]> = {
  general: [
    {
      key: "goal",
      label: "Your goal",
      kind: "text",
      maxLength: 300,
      placeholder: "e.g. Long-term wealth-building plan",
    },
    TIMELINE_FIELD,
    NOTES_FIELD,
  ],
  smsf_property: [
    {
      key: "smsf_status",
      label: "SMSF status",
      kind: "select",
      required: true,
      options: [
        { value: "no_smsf", label: "I don't have an SMSF yet" },
        { value: "considering_smsf", label: "Considering an SMSF" },
        { value: "smsf_established", label: "Existing SMSF" },
        { value: "not_sure", label: "Not sure" },
      ],
    },
    {
      key: "super_balance_band",
      label: "Estimated super balance",
      kind: "select",
      options: [
        { value: "under_100k", label: "Under $100k" },
        { value: "100k_300k", label: "$100k – $300k" },
        { value: "300k_500k", label: "$300k – $500k" },
        { value: "500k_800k", label: "$500k – $800k" },
        { value: "800k_1_2m", label: "$800k – $1.2m" },
        { value: "1_2m_plus", label: "$1.2m+" },
        { value: "not_sure", label: "Not sure" },
      ],
    },
    {
      key: "property_budget",
      label: "Property budget",
      kind: "select",
      required: true,
      options: [
        { value: "under_500k", label: "Under $500k" },
        { value: "500k_700k", label: "$500k – $700k" },
        { value: "700k_900k", label: "$700k – $900k" },
        { value: "900k_1_2m", label: "$900k – $1.2m" },
        { value: "1_2m_2m", label: "$1.2m – $2m" },
        { value: "2m_plus", label: "$2m+" },
        { value: "not_sure", label: "Not sure" },
      ],
    },
    {
      key: "target_location",
      label: "Target location",
      kind: "text",
      maxLength: 120,
      placeholder: "e.g. Brisbane inner suburbs",
    },
    TIMELINE_FIELD,
    {
      key: "help_needed",
      label: "Help needed",
      kind: "multiselect",
      required: true,
      options: [
        { value: "smsf_setup", label: "SMSF setup" },
        { value: "financial_advice", label: "Financial advice" },
        { value: "lending", label: "Lending" },
        { value: "property_search", label: "Property search" },
        { value: "conveyancing", label: "Conveyancing / legal" },
        { value: "not_sure", label: "Not sure" },
      ],
    },
    NOTES_FIELD,
  ],
  foreign_investor: [
    {
      key: "country_of_residence",
      label: "Country of residence",
      kind: "text",
      required: true,
      maxLength: 80,
      placeholder: "e.g. Singapore",
    },
    {
      key: "visa_type",
      label: "Visa / residency status",
      kind: "select",
      options: [
        { value: "citizen_australia", label: "Australian citizen" },
        { value: "permanent_resident", label: "Permanent resident" },
        { value: "temporary_resident", label: "Temporary resident" },
        { value: "non_resident", label: "Non-resident" },
        { value: "considering_migration", label: "Considering migration" },
        { value: "not_sure", label: "Not sure" },
      ],
    },
    {
      key: "investment_amount_aud",
      label: "Investment amount (AUD)",
      kind: "text",
      maxLength: 60,
      placeholder: "e.g. A$1.5m",
    },
    {
      key: "asset_type",
      label: "Asset type",
      kind: "text",
      maxLength: 120,
      placeholder: "e.g. Residential property, managed fund",
    },
    TIMELINE_FIELD,
    {
      key: "help_needed",
      label: "Help needed",
      kind: "multiselect",
      required: true,
      options: [
        { value: "firb_application", label: "FIRB application" },
        { value: "tax_residency", label: "Tax / residency" },
        { value: "structuring", label: "Structuring" },
        { value: "lending", label: "Lending" },
        { value: "property_search", label: "Property search" },
        { value: "not_sure", label: "Not sure" },
      ],
    },
    NOTES_FIELD,
  ],
  opportunity_assessment: [
    {
      key: "listing_url_or_name",
      label: "Listing URL or name",
      kind: "text",
      maxLength: 500,
      placeholder: "Paste a listing URL or describe the opportunity",
    },
    {
      key: "investment_amount_aud",
      label: "Investment amount (AUD)",
      kind: "text",
      maxLength: 60,
    },
    TIMELINE_FIELD,
    {
      key: "help_needed",
      label: "Help needed",
      kind: "multiselect",
      required: true,
      options: [
        { value: "finance", label: "Finance" },
        { value: "tax_accounting", label: "Tax / accounting" },
        { value: "legal_review", label: "Legal review" },
        { value: "due_diligence", label: "Due diligence" },
        { value: "full_specialist_team", label: "Full specialist team" },
        { value: "not_sure", label: "Not sure" },
      ],
    },
    NOTES_FIELD,
  ],
  expat: [NOTES_FIELD],
  business_acquisition: [NOTES_FIELD],
  commercial_property: [NOTES_FIELD],
  second_opinion: [NOTES_FIELD],
  mortgage: [NOTES_FIELD],
  tax: [NOTES_FIELD],
  smsf_accountant: [NOTES_FIELD],
  financial_adviser: [NOTES_FIELD],
  listing: [NOTES_FIELD],
  listing_readiness: [NOTES_FIELD],
};
