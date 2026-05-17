/**
 * Pure helpers shared between /api/concierge (server) and unit tests.
 *
 * - buildConciergeSystemPrompt(retrieved) — composes the system
 *   prompt with retrieval context + link-rendering instructions.
 * - extractCitedSlugs(reply) — regexes the Claude reply for
 *   /advisor/{slug} and /advisors/compare?add={slug} hrefs.
 * - validateNoHallucinations(reply, retrieved) — returns the slugs
 *   the model cited that AREN'T in retrieved context. Empty array =
 *   clean reply.
 *
 * Pure on purpose: no I/O, no Anthropic SDK, no Supabase. Lets
 * unit tests cover the prompt + guardrail without a live model.
 */

export interface ConciergeRetrievedDoc {
  document_type: string;
  document_id: string;
  title: string;
  body_excerpt: string;
  score: number;
}

export const CONCIERGE_BASE_SYSTEM_PROMPT = `You are the invest.com.au investment concierge.
You help Australians find the right investment platforms, advisors,
and opportunities. You have access to Australia's leading comparison
platform.

Guidelines:
- Keep responses concise. Aim for 3-6 sentences per turn with actionable
  links where possible.
- Always include at least one relevant internal link when you mention a
  comparison, tool, or hub. Format: [Compare brokers](/compare).
- When you mention a SPECIFIC ADVISOR by name, always render it as a
  link to their profile, e.g. [Casey Lin](/advisor/casey-lin), AND
  offer to add them to a side-by-side compare via
  [Add Casey Lin to compare](/advisors/compare?add=casey-lin).
- When you mention a SPECIFIC BROKER by name, render it as a link to
  their page, e.g. [CommSec](/broker/commsec).
- Only mention advisors and brokers that appear in the RETRIEVED
  CONTEXT below. Do not invent names, slugs, or fee figures.
- If the retrieved context doesn't cover the question, say so plainly
  and suggest a tool or hub the user can explore.
- Never give personal financial advice. Recommend seeking a licensed
  AFSL-authorised adviser for personal situations.
- Never state a broker is "best" universally; frame recommendations as
  "best for X" scenarios and point to /best-for when appropriate.
- For SMSF questions, point to /smsf. For foreign investors, point to
  /foreign-investment. For funds, /invest/funds. For the energy sector,
  /invest/oil-gas / /invest/uranium / /invest/hydrogen.
- For users searching for a financial advisor, point to /find-advisor
  (the structured wizard) and /advisors (faceted directory with
  individual, firm, and expert-team filters).
- Decline questions about specific stocks or crypto trades — say we
  cover platforms and educational context only.

Platform: invest.com.au.`;

/**
 * Returns the full system prompt with retrieval context appended.
 * If `retrieved` is empty the prompt still ships, with an explicit
 * "(no context retrieved)" line so the model knows not to invent.
 */
export function buildConciergeSystemPrompt(retrieved: ConciergeRetrievedDoc[]): string {
  const block =
    retrieved.length === 0
      ? "(no context retrieved)"
      : retrieved
          .map(
            (d, i) =>
              `[${i + 1}] ${d.document_type} — ${d.title} (slug: ${d.document_id})\n${d.body_excerpt}`,
          )
          .join("\n\n");
  return `${CONCIERGE_BASE_SYSTEM_PROMPT}\n\nRETRIEVED CONTEXT:\n${block}`;
}

/**
 * Pulls the slugs the model cited from a markdown-flavoured reply.
 * Returns one entry per (linkType, slug) pair. Tracks both
 * `/advisor/{slug}`, `/advisors/compare?add={slug}` and
 * `/broker/{slug}`. Pure regex over the reply text.
 */
export function extractCitedSlugs(
  reply: string,
): Array<{ kind: "advisor" | "advisor_compare" | "broker"; slug: string }> {
  const out: Array<{ kind: "advisor" | "advisor_compare" | "broker"; slug: string }> = [];
  if (!reply) return out;
  // /advisors/compare?add=<slug>  (matched first; greedier prefix)
  const compareRe = /\/advisors\/compare\?add=([a-z0-9][a-z0-9-]{0,80})/gi;
  // /advisor/<slug>
  const advisorRe = /\/advisor\/([a-z0-9][a-z0-9-]{0,80})/gi;
  // /broker/<slug>
  const brokerRe = /\/broker\/([a-z0-9][a-z0-9-]{0,80})/gi;
  let m: RegExpExecArray | null;
  while ((m = compareRe.exec(reply)) !== null) {
    out.push({ kind: "advisor_compare", slug: m[1]!.toLowerCase() });
  }
  while ((m = advisorRe.exec(reply)) !== null) {
    out.push({ kind: "advisor", slug: m[1]!.toLowerCase() });
  }
  while ((m = brokerRe.exec(reply)) !== null) {
    out.push({ kind: "broker", slug: m[1]!.toLowerCase() });
  }
  return out;
}

/**
 * Returns the citations whose slug doesn't appear in the retrieved
 * context. Empty array = clean reply.
 *
 * Match rule: an `advisor` or `advisor_compare` slug must match a
 * retrieved doc with document_type='advisor' and document_id=slug.
 * A `broker` slug must match document_type='broker'. Anything else
 * is treated as hallucinated.
 *
 * Pre-launch we'll *log* hallucinations rather than refuse — gives
 * us a real-world signal for how often Claude invents names. If
 * the rate is non-trivial we promote to refuse + retry.
 */
export function validateNoHallucinations(
  reply: string,
  retrieved: ConciergeRetrievedDoc[],
): Array<{ kind: "advisor" | "advisor_compare" | "broker"; slug: string }> {
  const cited = extractCitedSlugs(reply);
  if (cited.length === 0) return [];
  const advisorSlugs = new Set(
    retrieved.filter((d) => d.document_type === "advisor").map((d) => d.document_id.toLowerCase()),
  );
  const brokerSlugs = new Set(
    retrieved.filter((d) => d.document_type === "broker").map((d) => d.document_id.toLowerCase()),
  );
  return cited.filter((c) => {
    if (c.kind === "broker") return !brokerSlugs.has(c.slug);
    return !advisorSlugs.has(c.slug);
  });
}
