/**
 * lib/advisor-compare-matrix.ts
 *
 * Pure helper that transforms N advisor records (as returned by
 * /api/advisor-compare) into a typed { rows, columns, cells } matrix
 * suitable for rendering a structured feature-comparison table.
 *
 * AFSL SAFETY: Every cell reflects objective, factual data only.
 * No "best" ranking, no advice, no suitability inference.
 * Callers must render the GENERAL_ADVICE_WARNING alongside this matrix.
 *
 * Pure function — no I/O, no side effects.
 */

import {
  computeAdvisorTrustScore,
  trustScoreLabel,
  trustScoreLabelColor,
  type AdvisorTrustScoreInput,
} from "@/lib/advisor-trust-score";

/* ─── Input shape ─────────────────────────────────────────────────────────── */

/**
 * The subset of the `professionals` row that the matrix assembler needs.
 * Mirrors what /api/advisor-compare returns (plus the fields required by
 * AdvisorTrustScoreInput that the API select already includes).
 *
 * Every optional field is typed `| null | undefined` so the assembler
 * can safely coerce missing data to "—" cells.
 */
export interface AdvisorCompareInput {
  /* Identity */
  id: number;
  slug: string;
  name: string;
  firm_name?: string | null;
  type: string;
  photo_url?: string | null;

  /* Rating & reviews */
  rating: number;
  review_count: number;

  /* Credentials */
  verified: boolean;
  afsl_number?: string | null;
  registration_number?: string | null;
  verified_at?: string | null;

  /* Specialties & advice areas */
  specialties?: string[] | null;

  /* Fee model */
  fee_structure?: string | null;
  fee_description?: string | null;
  hourly_rate_cents?: number | null;
  flat_fee_cents?: number | null;
  aum_percentage?: number | null;
  initial_consultation_free?: boolean | null;

  /* Availability */
  accepts_new_clients?: boolean | null;
  booking_link?: string | null;

  /* Meeting methods */
  meeting_types?: string[] | null;

  /* Languages */
  languages?: string[] | null;

  /* Trust Score inputs (transparency / track record) */
  created_at?: string | null;
  years_experience?: number | null;
  bio?: string | null;
  qualifications?: unknown[] | null;
  education?: unknown[] | null;
  memberships?: unknown[] | null;
  linkedin_url?: string | null;
  website?: string | null;

  /* Additional */
  accepts_international_clients?: boolean | null;
  firb_specialist?: boolean | null;
  location_display?: string | null;
}

/* ─── Output types ─────────────────────────────────────────────────────────── */

/**
 * A single row key identifying which feature is being compared.
 */
export type MatrixRowKey =
  | "specialties"
  | "fee_model"
  | "credentials"
  | "trust_score"
  | "accepts_new_clients"
  | "meeting_methods"
  | "languages"
  | "verified";

/**
 * The kind of value stored in a matrix cell.
 *
 * - "text"       — plain string (may be "—" for missing data)
 * - "badge_list" — array of short pill labels (specialties, languages, etc.)
 * - "boolean"    — yes / no / not specified
 * - "score"      — numeric 0-100 with accompanying label and colour token
 */
export type CellKind = "text" | "badge_list" | "boolean" | "score";

export interface TextCell {
  kind: "text";
  value: string;
  /** True when value is the explicit missing-data sentinel "—". */
  missing: boolean;
}

export interface BadgeListCell {
  kind: "badge_list";
  items: string[];
  /** True when items is empty (no data). */
  missing: boolean;
}

export interface BooleanCell {
  kind: "boolean";
  value: boolean | null;
  /** Display string: "Yes" | "No" | "—" */
  display: string;
  missing: boolean;
}

export interface ScoreCell {
  kind: "score";
  /** 0–100 composite Trust Score. */
  overall: number;
  /** Band label: "Strong" | "Good" | "Moderate" | "Limited". */
  label: string;
  /** Tailwind text-colour class fragment (e.g. "text-emerald-600"). */
  labelColor: string;
  missing: boolean;
}

export type MatrixCell = TextCell | BadgeListCell | BooleanCell | ScoreCell;

/**
 * A single row descriptor in the matrix output.
 */
export interface MatrixRow {
  key: MatrixRowKey;
  /** Human-readable label shown in the left-hand "Feature" column. */
  label: string;
  /**
   * Tooltip / sub-heading explaining what this row measures.
   * Safe to display as UI text; no markdown.
   */
  description: string;
}

/**
 * A single advisor column descriptor.
 */
export interface MatrixColumn {
  slug: string;
  name: string;
  firm_name: string | null;
  photo_url: string | null;
  /** Direct link to the advisor profile page. */
  profilePath: string;
}

/**
 * The fully-assembled comparison matrix.
 *
 * Access a cell via: cells[rowKey][slug]
 */
export interface AdvisorCompareMatrix {
  rows: MatrixRow[];
  columns: MatrixColumn[];
  /** Sparse map: cells[rowKey][advisorSlug] → MatrixCell */
  cells: Record<MatrixRowKey, Record<string, MatrixCell>>;
}

/* ─── Row metadata (static) ────────────────────────────────────────────────── */

/** Ordered list of rows to include in every compare matrix. */
const ROW_DEFS: MatrixRow[] = [
  {
    key: "specialties",
    label: "Specialties / Advice Areas",
    description: "The financial topics or advice areas this advisor specialises in.",
  },
  {
    key: "fee_model",
    label: "Fee Model",
    description:
      "How this advisor charges for their services (hourly rate, flat fee, % of assets under management, or other).",
  },
  {
    key: "credentials",
    label: "Credentials & AFSL",
    description:
      "Licence and registration details. AFSL = Australian Financial Services Licence. AR = Authorised Representative.",
  },
  {
    key: "trust_score",
    label: "Trust Score",
    description:
      "A factual composite (0–100) based on verification status, profile tenure, transparency completeness, " +
      "and client-review volume & rating. Not a recommendation. See /advisor/trust-score-methodology.",
  },
  {
    key: "accepts_new_clients",
    label: "Accepts New Clients",
    description: "Whether this advisor is currently accepting enquiries from new clients.",
  },
  {
    key: "meeting_methods",
    label: "Meeting Methods",
    description: "The ways in which this advisor can meet with clients (in-person, video, phone, etc.).",
  },
  {
    key: "languages",
    label: "Languages",
    description: "Languages this advisor can conduct consultations in. English assumed when not listed.",
  },
  {
    key: "verified",
    label: "Verified Profile",
    description:
      "Whether Invest.com.au's editorial team has independently checked this advisor's credentials " +
      "against ASIC Professional Registers.",
  },
];

/* ─── Cell assemblers ────────────────────────────────────────────────────────── */

function buildSpecialtiesCell(advisor: AdvisorCompareInput): BadgeListCell {
  const items = (advisor.specialties ?? []).filter(Boolean) as string[];
  return { kind: "badge_list", items, missing: items.length === 0 };
}

/**
 * Formats the fee model into a concise display string.
 * Returns "—" when no fee data is available.
 */
export function formatFeeModel(advisor: AdvisorCompareInput): string {
  if (advisor.hourly_rate_cents && advisor.hourly_rate_cents > 0) {
    return `$${(advisor.hourly_rate_cents / 100).toLocaleString("en-AU")}/hr`;
  }
  if (advisor.flat_fee_cents && advisor.flat_fee_cents > 0) {
    return `$${(advisor.flat_fee_cents / 100).toLocaleString("en-AU")} flat fee`;
  }
  if (advisor.aum_percentage && advisor.aum_percentage > 0) {
    return `${advisor.aum_percentage}% AUM`;
  }
  if (
    advisor.fee_description &&
    advisor.fee_description.trim().length > 0
  ) {
    // Truncate long descriptions to ~50 chars for the matrix cell
    const desc = advisor.fee_description.trim();
    return desc.length > 50 ? `${desc.slice(0, 50)}…` : desc;
  }
  if (advisor.fee_structure && advisor.fee_structure.trim().length > 0) {
    return advisor.fee_structure.trim();
  }
  return "—";
}

function buildFeeModelCell(advisor: AdvisorCompareInput): TextCell {
  const feeText = formatFeeModel(advisor);
  const missing = feeText === "—";
  // Append free-consult note when applicable
  const value =
    !missing && advisor.initial_consultation_free
      ? `${feeText} · Free initial consult`
      : feeText;
  return { kind: "text", value, missing };
}

/**
 * Formats credentials into a readable string.
 * Prefers AFSL number, then registration number, then "Verified" flag alone.
 */
export function formatCredentials(advisor: AdvisorCompareInput): string {
  const parts: string[] = [];
  if (advisor.afsl_number && advisor.afsl_number.trim().length > 0) {
    parts.push(`AFSL ${advisor.afsl_number.trim()}`);
  }
  if (
    advisor.registration_number &&
    advisor.registration_number.trim().length > 0
  ) {
    parts.push(`AR ${advisor.registration_number.trim()}`);
  }
  if (parts.length === 0) {
    return "—";
  }
  return parts.join(" · ");
}

function buildCredentialsCell(advisor: AdvisorCompareInput): TextCell {
  const value = formatCredentials(advisor);
  return { kind: "text", value, missing: value === "—" };
}

function buildTrustScoreCell(advisor: AdvisorCompareInput): ScoreCell {
  // Map AdvisorCompareInput → AdvisorTrustScoreInput (they overlap)
  const input: AdvisorTrustScoreInput = {
    verified: advisor.verified,
    afsl_number: advisor.afsl_number ?? null,
    registration_number: advisor.registration_number ?? null,
    verified_at: advisor.verified_at ?? null,
    created_at: advisor.created_at ?? null,
    years_experience: advisor.years_experience ?? null,
    bio: advisor.bio ?? null,
    photo_url: advisor.photo_url ?? null,
    qualifications: advisor.qualifications ?? null,
    education: advisor.education ?? null,
    memberships: advisor.memberships ?? null,
    fee_structure: advisor.fee_structure ?? null,
    fee_description: advisor.fee_description ?? null,
    linkedin_url: advisor.linkedin_url ?? null,
    website: advisor.website ?? null,
    languages: advisor.languages ?? null,
    rating: advisor.rating,
    review_count: advisor.review_count,
  };

  const result = computeAdvisorTrustScore(input);

  return {
    kind: "score",
    overall: result.overall,
    label: trustScoreLabel(result.overall),
    labelColor: trustScoreLabelColor(result.overall),
    missing: false,
  };
}

function buildAcceptsNewClientsCell(advisor: AdvisorCompareInput): BooleanCell {
  if (advisor.accepts_new_clients === true) {
    return { kind: "boolean", value: true, display: "Yes", missing: false };
  }
  if (advisor.accepts_new_clients === false) {
    return { kind: "boolean", value: false, display: "No", missing: false };
  }
  return { kind: "boolean", value: null, display: "—", missing: true };
}

function buildMeetingMethodsCell(advisor: AdvisorCompareInput): BadgeListCell {
  const items = (advisor.meeting_types ?? []).filter(Boolean) as string[];
  return { kind: "badge_list", items, missing: items.length === 0 };
}

function buildLanguagesCell(advisor: AdvisorCompareInput): BadgeListCell {
  const raw = (advisor.languages ?? []).filter(Boolean) as string[];
  // If no languages specified, treat as English-only
  const items = raw.length > 0 ? raw : ["English"];
  return { kind: "badge_list", items, missing: raw.length === 0 };
}

function buildVerifiedCell(advisor: AdvisorCompareInput): BooleanCell {
  if (advisor.verified) {
    return { kind: "boolean", value: true, display: "Yes", missing: false };
  }
  return { kind: "boolean", value: false, display: "No", missing: false };
}

/* ─── Main export ─────────────────────────────────────────────────────────── */

/**
 * Assemble a structured comparison matrix from an array of advisor records.
 *
 * @param advisors  Up to 3 advisor records (further items are silently ignored).
 * @returns         A fully-typed matrix with `rows`, `columns`, and `cells`.
 *
 * Pure function — no I/O, no side effects.
 */
export function buildAdvisorCompareMatrix(
  advisors: AdvisorCompareInput[],
): AdvisorCompareMatrix {
  // Cap at 3 — same limit as the compare page
  const capped = advisors.slice(0, 3);

  const columns: MatrixColumn[] = capped.map((a) => ({
    slug: a.slug,
    name: a.name,
    firm_name: a.firm_name ?? null,
    photo_url: a.photo_url ?? null,
    profilePath: `/advisor/${a.slug}`,
  }));

  const rows: MatrixRow[] = ROW_DEFS;

  // Build cells map: cells[rowKey][slug] = MatrixCell
  const cells: Record<MatrixRowKey, Record<string, MatrixCell>> = {
    specialties: {},
    fee_model: {},
    credentials: {},
    trust_score: {},
    accepts_new_clients: {},
    meeting_methods: {},
    languages: {},
    verified: {},
  };

  for (const advisor of capped) {
    cells.specialties[advisor.slug] = buildSpecialtiesCell(advisor);
    cells.fee_model[advisor.slug] = buildFeeModelCell(advisor);
    cells.credentials[advisor.slug] = buildCredentialsCell(advisor);
    cells.trust_score[advisor.slug] = buildTrustScoreCell(advisor);
    cells.accepts_new_clients[advisor.slug] = buildAcceptsNewClientsCell(advisor);
    cells.meeting_methods[advisor.slug] = buildMeetingMethodsCell(advisor);
    cells.languages[advisor.slug] = buildLanguagesCell(advisor);
    cells.verified[advisor.slug] = buildVerifiedCell(advisor);
  }

  return { rows, columns, cells };
}
