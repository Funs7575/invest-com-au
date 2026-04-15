/**
 * Rule-based article scorecard.
 *
 * Runs in <10ms against a draft article and returns a deterministic
 * score + remediation list. Runs on every save from the admin editor
 * so writers see compliance gaps before they publish, not after.
 *
 * This is distinct from `lib/article-quality-scoring.ts` (Wave 3),
 * which is LLM-backed and runs on published content for the trending
 * / featured pipelines. That layer is slow + expensive + runs
 * after publish. This layer is fast, free, and runs at write time.
 *
 * The scorecard is deliberately opinionated — it enforces the
 * invest.com.au editorial + compliance standard, not generic
 * "readability" rules. Every check has:
 *
 *   - a `code` (stable identifier)
 *   - a `severity` (hard | soft)
 *   - a `weight` (point deduction)
 *   - a `message` the editor sees in remediation
 *
 * Hard failures (missing GA warning, no affiliate disclosure on a
 * broker review, sub-minimum word count) cap the grade at F regardless
 * of the other checks. Soft failures deduct points but a piece can
 * still ship with a couple of them.
 *
 * Consumers:
 *   - /admin/articles/editor/[slug] calls runScorecard() live
 *   - /api/admin/article-scorecard persists the result to
 *     article_scorecard_runs for audit
 *   - Future: the content-calendar "ready to ship" status filter
 *     requires a recent A-grade scorecard
 */

import { detectForwardLookingStatements } from "@/lib/text-moderation";

export type ScorecardSeverity = "hard" | "soft";
export type ScorecardGrade = "A" | "B" | "C" | "D" | "F";

export interface ScorecardCheckDef {
  code: string;
  label: string;
  severity: ScorecardSeverity;
  weight: number;           // 0-100
  appliesTo?: string[];     // template slugs this check runs on, omit for all
}

export interface ScorecardInput {
  title: string;
  body: string;
  excerpt?: string | null;
  category?: string | null;
  tags?: string[] | null;
  templateSlug?: string | null;      // one of article_templates.slug
  /** Sections list, usually from template.required_sections */
  requiredSections?: string[];
  /** Min words from template.min_words */
  minWords?: number;
}

export interface RemediationItem {
  code: string;
  severity: ScorecardSeverity;
  message: string;
  field?: string;
}

export interface ScorecardResult {
  score: number;                     // 0-100
  grade: ScorecardGrade;
  passedChecks: string[];
  failedChecks: string[];
  remediation: RemediationItem[];
}

// ─── Check catalogue ─────────────────────────────────────────────

/**
 * Every check lives here. Adding a new rule is one entry in this
 * array plus a case in `runCheck()`. Keeping them declarative means
 * the admin UI can render the full list even for checks that
 * passed, so editors know what they're being graded on.
 */
const CHECKS: ScorecardCheckDef[] = [
  // ── Hard compliance checks ─────────────────────────────────
  {
    code: "general_advice_warning",
    label: "General advice warning present",
    severity: "hard",
    weight: 25,
  },
  {
    code: "no_forward_looking_statements",
    label: "No forward-looking price/return claims",
    severity: "hard",
    weight: 25,
  },
  {
    code: "affiliate_disclosure_on_reviews",
    label: "Affiliate disclosure on broker/comparison pieces",
    severity: "hard",
    weight: 20,
    appliesTo: ["broker_review", "comparison_post"],
  },
  {
    code: "primary_source_on_news",
    label: "Primary source link on news briefs",
    severity: "hard",
    weight: 20,
    appliesTo: ["news_brief"],
  },
  {
    code: "min_word_count",
    label: "Meets template minimum word count",
    severity: "hard",
    weight: 15,
  },
  // ── Soft quality checks ────────────────────────────────────
  {
    code: "title_length_sane",
    label: "Title 30-80 characters (SEO sweet spot)",
    severity: "soft",
    weight: 5,
  },
  {
    code: "excerpt_present",
    label: "Meta excerpt 50-160 characters",
    severity: "soft",
    weight: 5,
  },
  {
    code: "h2_structure",
    label: "At least 3 H2 headings (## …)",
    severity: "soft",
    weight: 5,
  },
  {
    code: "has_internal_links",
    label: "At least 2 internal links (/broker, /advisor, /article)",
    severity: "soft",
    weight: 5,
  },
  {
    code: "paragraph_length",
    label: "No paragraphs over 140 words",
    severity: "soft",
    weight: 5,
  },
  {
    code: "tags_present",
    label: "At least 2 tags for discoverability",
    severity: "soft",
    weight: 3,
  },
  {
    code: "category_set",
    label: "Category assigned",
    severity: "soft",
    weight: 2,
  },
  {
    code: "no_marketing_fluff",
    label: "No marketing cliches (best-in-class, revolutionary, etc.)",
    severity: "soft",
    weight: 5,
  },
];

/** Public read: callers that want the full catalogue for rendering */
export function listScorecardChecks(templateSlug?: string | null): ScorecardCheckDef[] {
  if (!templateSlug) {
    // No template selected → only run un-gated checks. The
    // template-specific checks (affiliate disclosure on broker
    // reviews, primary source link on news briefs) don't apply
    // because we don't know which surface the piece is for.
    return CHECKS.filter((c) => !c.appliesTo);
  }
  return CHECKS.filter(
    (c) => !c.appliesTo || c.appliesTo.includes(templateSlug),
  );
}

// ─── Individual check implementations ────────────────────────────

const GA_WARNING_PATTERNS = [
  /general\s+advice\b/i,
  /does\s+not\s+take\s+into\s+account\s+your/i,
  /before\s+acting\s+on\s+any\s+information/i,
];

const AFFILIATE_DISCLOSURE_PATTERNS = [
  /affiliate\s+(link|commission|disclosure)/i,
  /we\s+may\s+earn\s+(a\s+)?commission/i,
  /partner\s+brokers?\b/i,
];

const MARKETING_CLICHES = [
  /\bbest[-\s]in[-\s]class\b/i,
  /\brevolutionary\b/i,
  /\bgame[-\s]changer\b/i,
  /\bcutting[-\s]edge\b/i,
  /\bunparalleled\b/i,
  /\bworld[-\s]class\b/i,
  /\bsynergies?\b/i,
  /\bleverage\s+(synergies|our\s+platform)\b/i,
];

interface CheckContext {
  input: ScorecardInput;
  bodyLower: string;
  wordCount: number;
}

function runCheck(check: ScorecardCheckDef, ctx: CheckContext): boolean {
  const { input, bodyLower, wordCount } = ctx;
  const text = `${input.title}\n\n${input.body}\n\n${input.excerpt || ""}`;

  switch (check.code) {
    case "general_advice_warning":
      return GA_WARNING_PATTERNS.some((p) => p.test(text));

    case "no_forward_looking_statements":
      return detectForwardLookingStatements(text).length === 0;

    case "affiliate_disclosure_on_reviews":
      return AFFILIATE_DISCLOSURE_PATTERNS.some((p) => p.test(text));

    case "primary_source_on_news": {
      // Any https link inside the body counts; we assume the
      // editor added the primary source as a link. A stronger
      // check would parse the markdown for a [text](url) but
      // this is sufficient for the write-time gate.
      return /\bhttps?:\/\/[^\s)]+/.test(input.body);
    }

    case "min_word_count": {
      const min = input.minWords || 600;
      return wordCount >= min;
    }

    case "title_length_sane": {
      const len = input.title.trim().length;
      return len >= 30 && len <= 80;
    }

    case "excerpt_present": {
      const len = (input.excerpt || "").trim().length;
      return len >= 50 && len <= 160;
    }

    case "h2_structure": {
      const h2Count = (input.body.match(/^##\s+\S/gm) || []).length;
      return h2Count >= 3;
    }

    case "has_internal_links": {
      const internalLinks = (
        input.body.match(/\]\((\/[a-z0-9/_-]+)\)/gi) || []
      ).length;
      return internalLinks >= 2;
    }

    case "paragraph_length": {
      const paragraphs = input.body.split(/\n\n+/);
      return paragraphs.every((p) => {
        const w = p.trim().split(/\s+/).filter(Boolean).length;
        return w <= 140;
      });
    }

    case "tags_present":
      return (input.tags || []).length >= 2;

    case "category_set":
      return !!input.category && input.category.trim().length > 0;

    case "no_marketing_fluff":
      return !MARKETING_CLICHES.some((p) => p.test(bodyLower));

    default:
      return true;
  }
}

// ─── Public entry point ──────────────────────────────────────────

const REMEDIATION_MESSAGES: Record<string, string> = {
  general_advice_warning:
    "Add an ASIC-style general advice warning, e.g. 'This information is general advice only and does not take into account your personal objectives...'",
  no_forward_looking_statements:
    "Remove forward-looking price/return claims. No 'will hit $X', 'guaranteed', 'triple your money', or 'next Tesla/Bitcoin' framing.",
  affiliate_disclosure_on_reviews:
    "Add an affiliate disclosure, e.g. 'We may earn a commission when readers open accounts via our affiliate links'.",
  primary_source_on_news:
    "Link the primary source (ASX release, minister statement, company investor page) in the body.",
  min_word_count:
    "Piece is under the template's minimum word count. Expand the thin sections before publishing.",
  title_length_sane:
    "Aim for 30-80 characters in the title — short titles underperform in SERP, long titles get truncated.",
  excerpt_present:
    "Set a meta excerpt of 50-160 characters. Google often uses it as the SERP snippet.",
  h2_structure:
    "Use at least three ## headings so the piece is scannable and Google can extract outlines.",
  has_internal_links:
    "Add at least two internal links to /broker, /advisor or /article pages — helps SEO and keeps readers on-site.",
  paragraph_length:
    "Break up paragraphs longer than 140 words. Short paragraphs read faster and bounce less.",
  tags_present:
    "Add at least two tags so the piece surfaces in the /tag hub pages.",
  category_set: "Assign a category so the article lands in /topic/<category>.",
  no_marketing_fluff:
    "Delete marketing cliches (best-in-class, revolutionary, world-class, etc.). They damage reader trust.",
};

function toGrade(score: number, hardFailed: boolean): ScorecardGrade {
  if (hardFailed) return "F";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function runScorecard(input: ScorecardInput): ScorecardResult {
  const bodyLower = input.body.toLowerCase();
  const wordCount = input.body
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const ctx: CheckContext = { input, bodyLower, wordCount };

  const applicable = listScorecardChecks(input.templateSlug);

  // Every check starts as "pass" and earns its weight. Failing a
  // check means subtracting its weight from 100. Hard failures
  // ALSO flag the grade floor as F regardless of the arithmetic.
  let score = 100;
  let hardFailed = false;
  const passedChecks: string[] = [];
  const failedChecks: string[] = [];
  const remediation: RemediationItem[] = [];

  for (const check of applicable) {
    const ok = runCheck(check, ctx);
    if (ok) {
      passedChecks.push(check.code);
      continue;
    }
    failedChecks.push(check.code);
    score -= check.weight;
    if (check.severity === "hard") hardFailed = true;
    remediation.push({
      code: check.code,
      severity: check.severity,
      message:
        REMEDIATION_MESSAGES[check.code] || `Failed check: ${check.code}`,
    });
  }

  score = Math.max(0, Math.min(100, score));
  const grade = toGrade(score, hardFailed);

  return { score, grade, passedChecks, failedChecks, remediation };
}
