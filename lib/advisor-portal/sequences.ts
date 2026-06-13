/**
 * Adviser Follow-Up Autopilot — pure domain logic for lead sequences.
 *
 * Deliberately I/O-free (no Supabase, no Resend, no `lib/supabase/*`): this
 * module is value-imported by BOTH the send-engine cron and a client
 * component (the sequence editor's live preview), so it must stay safe for the
 * browser bundle per the CLAUDE.md CLIENT-BUNDLE rule. Sanitisation /
 * suppression / sending all happen at the call sites that own those rails.
 *
 * Email safety (CLAUDE.md EMAIL SAFETY): adviser-authored content is PLAIN TEXT
 * only — never raw HTML. Merge fields are limited to a small fixed allowlist
 * (lead first name, adviser name, adviser firm). Rendering escapes every HTML
 * entity first, then converts newlines to <br>, so an adviser cannot inject
 * markup or script no matter what they type. The send engine additionally runs
 * the result through `lib/sanitize-html.ts` as belt-and-braces defence.
 */

// Hard caps — also enforced by CHECK constraints in the migration. Imported
// from the shared constants module so client + server + migration stay aligned,
// then re-exported for callers that import them from here. (Import, not a bare
// `export … from`, so the values are also in local scope for validateSteps.)
import {
  MAX_STEPS_PER_SEQUENCE,
  MAX_SUBJECT_LEN,
  MAX_BODY_LEN,
  MAX_SEQUENCE_NAME_LEN,
  MAX_DAY_OFFSET,
} from "@/lib/advisor-portal/crm-constants";

export {
  MAX_STEPS_PER_SEQUENCE,
  MAX_SUBJECT_LEN,
  MAX_BODY_LEN,
  MAX_SEQUENCE_NAME_LEN,
  MAX_DAY_OFFSET,
};

/** Anti-spam hard caps (CLAUDE.md EMAIL SAFETY). */
export const MAX_SENDS_PER_LEAD_PER_DAY = 1;

/**
 * The ONLY merge fields an adviser may use. Anything else in `{{ ... }}` is
 * left as the literal token text (never resolved, never leaked). Keys are
 * matched case-insensitively and tolerant of surrounding whitespace.
 */
export const MERGE_FIELDS = [
  "lead_first_name",
  "adviser_name",
  "adviser_firm",
] as const;

export type MergeField = (typeof MERGE_FIELDS)[number];

export interface MergeContext {
  /** Lead's first name (already split from the full name). May be empty. */
  leadFirstName: string;
  /** Adviser's display name. */
  adviserName: string;
  /** Adviser's firm name, or empty when they have none. */
  adviserFirm: string;
}

/** Match `{{ field }}` with optional inner whitespace. Global + case-insensitive. */
const MERGE_TOKEN_RE = /\{\{\s*([a-z_]+)\s*\}\}/gi;

/** First word of a person's name — the only safe slice for greetings. */
export function firstName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? "";
}

/**
 * Resolve allowlisted `{{ merge_field }}` tokens against the context. Unknown
 * tokens are returned verbatim (so a typo shows as `{{ whoops }}` rather than
 * silently vanishing or — worse — resolving to something unexpected). Operates
 * on RAW text; HTML-escaping happens later in `renderBodyHtml`, so a merge
 * value that itself contains `<` is still neutralised.
 */
export function resolveMergeFields(text: string, ctx: MergeContext): string {
  return text.replace(MERGE_TOKEN_RE, (whole, rawKey: string) => {
    const key = rawKey.toLowerCase() as MergeField;
    switch (key) {
      case "lead_first_name":
        // Fall back to a neutral greeting target when the name is unknown so
        // "Hi {{lead_first_name}}," never renders as "Hi ,".
        return ctx.leadFirstName || "there";
      case "adviser_name":
        return ctx.adviserName;
      case "adviser_firm":
        return ctx.adviserFirm;
      default:
        return whole; // unknown token → leave literal
    }
  });
}

/** Escape the five HTML-significant characters. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Render the rendered SUBJECT line: merge fields resolved, then collapsed to a
 * single line (subjects must not contain newlines) and trimmed. Subjects are
 * injected as text, not HTML, by the mailer, so no escaping here.
 */
export function renderSubject(rawSubject: string, ctx: MergeContext): string {
  return resolveMergeFields(rawSubject, ctx).replace(/\s*[\r\n]+\s*/g, " ").trim();
}

/**
 * Render the BODY to safe HTML: resolve merge fields, HTML-escape the whole
 * thing, then turn newlines into <br>. The escape-before-linebreak order is
 * what makes adviser-authored plain text inert — any `<`, `>`, `&`, quote, or
 * apostrophe the adviser typed (or that arrived via a merge value) is encoded
 * before a single tag is introduced.
 */
export function renderBodyHtml(rawBody: string, ctx: MergeContext): string {
  const resolved = resolveMergeFields(rawBody, ctx);
  const escaped = escapeHtml(resolved);
  // Normalise CRLF/CR to LF first so we don't emit double <br>.
  return escaped.replace(/\r\n?/g, "\n").replace(/\n/g, "<br>");
}

/** Plain-text body for the `text` part of the email (deliverability + a11y). */
export function renderBodyText(rawBody: string, ctx: MergeContext): string {
  return resolveMergeFields(rawBody, ctx).replace(/\r\n?/g, "\n");
}

export interface SequenceStepInput {
  day_offset: number;
  subject: string;
  body: string;
}

export type StepValidationError =
  | { ok: false; reason: "too_many_steps" }
  | { ok: false; reason: "empty" }
  | { ok: false; reason: "bad_day_offset"; index: number }
  | { ok: false; reason: "subject_too_long"; index: number }
  | { ok: false; reason: "subject_empty"; index: number }
  | { ok: false; reason: "body_too_long"; index: number }
  | { ok: false; reason: "body_empty"; index: number };

export type StepValidationResult =
  | { ok: true; steps: SequenceStepInput[] }
  | StepValidationError;

/**
 * Validate a proposed set of steps for a sequence. Enforces: 1..3 steps, each
 * with a 0..30 day offset, a 1..150-char subject and a 1..2000-char body.
 * Returns the normalised steps (trimmed subject, body left intact bar a trim of
 * trailing whitespace) on success. Pure — the API route maps the failure
 * reason to a 400.
 */
export function validateSteps(steps: readonly SequenceStepInput[]): StepValidationResult {
  if (steps.length === 0) return { ok: false, reason: "empty" };
  if (steps.length > MAX_STEPS_PER_SEQUENCE) {
    return { ok: false, reason: "too_many_steps" };
  }

  const normalised: SequenceStepInput[] = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step) return { ok: false, reason: "empty" };

    if (
      !Number.isInteger(step.day_offset) ||
      step.day_offset < 0 ||
      step.day_offset > MAX_DAY_OFFSET
    ) {
      return { ok: false, reason: "bad_day_offset", index: i };
    }

    const subject = step.subject.trim();
    if (subject.length === 0) return { ok: false, reason: "subject_empty", index: i };
    if (subject.length > MAX_SUBJECT_LEN) {
      return { ok: false, reason: "subject_too_long", index: i };
    }

    const body = step.body.trim();
    if (body.length === 0) return { ok: false, reason: "body_empty", index: i };
    if (body.length > MAX_BODY_LEN) {
      return { ok: false, reason: "body_too_long", index: i };
    }

    normalised.push({ day_offset: step.day_offset, subject, body });
  }

  return { ok: true, steps: normalised };
}

/**
 * Default seed templates offered (client-side) when an adviser creates their
 * first sequence. They can adapt every field. General-information tone — no
 * personal-advice or recommendation language (compliance lean lane).
 */
export const SEED_SEQUENCE_TEMPLATES: ReadonlyArray<{
  name: string;
  steps: SequenceStepInput[];
}> = [
  {
    name: "New enquiry follow-up",
    steps: [
      {
        day_offset: 0,
        subject: "Thanks for getting in touch",
        body:
          "Hi {{lead_first_name}},\n\n" +
          "Thanks for your enquiry — I'd be glad to help you explore your options. " +
          "Is there a good time this week for a quick introductory call?\n\n" +
          "Best,\n{{adviser_name}}\n{{adviser_firm}}",
      },
      {
        day_offset: 2,
        subject: "Following up on your enquiry",
        body:
          "Hi {{lead_first_name}},\n\n" +
          "Just checking in to see whether you'd like to set up a time to chat. " +
          "Happy to work around your schedule.\n\n" +
          "Kind regards,\n{{adviser_name}}",
      },
      {
        day_offset: 7,
        subject: "Still here when you're ready",
        body:
          "Hi {{lead_first_name}},\n\n" +
          "No rush at all — I'll leave the door open. If now isn't the right time, " +
          "feel free to reach out whenever suits.\n\n" +
          "All the best,\n{{adviser_name}}\n{{adviser_firm}}",
      },
    ],
  },
];
