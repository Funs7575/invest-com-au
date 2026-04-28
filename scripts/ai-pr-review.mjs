#!/usr/bin/env node
/**
 * AI-on-AI PR review.
 *
 * Posts a structured Claude-authored code review on every open PR. Replaces
 * the bulk of what a part-time human reviewer would catch — Next.js gotchas
 * (the `_dispatch` private-folder bug), N+1 queries, RLS policy logic,
 * subtle TS widening, single-source-of-truth violations, doc rot.
 *
 * Triggered by .github/workflows/ai-review.yml on pull_request open/sync.
 *
 * Required env:
 *   ANTHROPIC_API_KEY        — Claude API key (Vercel/GH secret)
 *   GITHUB_TOKEN             — to fetch the diff and post the comment
 *   GITHUB_REPOSITORY        — owner/repo (auto-set by GH Actions)
 *   GITHUB_EVENT_PATH        — path to the event JSON (auto-set)
 *
 * Optional env:
 *   AI_REVIEW_MODEL          — default "claude-opus-4-7"; set "claude-sonnet-4-6" for ~3x cheaper
 *   AI_REVIEW_MAX_DIFF_KB    — default 200; skip review if diff exceeds this
 *
 * Cost: ~$0.50–$3 per review at default model. Toggle to Sonnet for ~$0.20–$1.
 */

import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const MODEL = process.env.AI_REVIEW_MODEL ?? "claude-opus-4-7";
const MAX_DIFF_KB = parseInt(process.env.AI_REVIEW_MAX_DIFF_KB ?? "200", 10);

const REPO = process.env.GITHUB_REPOSITORY;
const TOKEN = process.env.GITHUB_TOKEN;
const EVENT_PATH = process.env.GITHUB_EVENT_PATH;

if (!REPO || !TOKEN || !EVENT_PATH) {
  console.error("Missing required GitHub Actions env vars.");
  process.exit(1);
}

const event = JSON.parse(readFileSync(EVENT_PATH, "utf8"));
const PR_NUMBER = event.pull_request?.number;
const BASE_SHA = event.pull_request?.base?.sha;
const HEAD_SHA = event.pull_request?.head?.sha;

if (!PR_NUMBER || !BASE_SHA || !HEAD_SHA) {
  console.error("Not a pull_request event with required fields.");
  process.exit(0);
}

const diff = execSync(`git diff ${BASE_SHA}...${HEAD_SHA}`, {
  encoding: "utf8",
  maxBuffer: 50 * 1024 * 1024,
});
const diffKb = Math.round(Buffer.byteLength(diff, "utf8") / 1024);

if (diffKb > MAX_DIFF_KB) {
  console.log(`Diff is ${diffKb}KB (limit ${MAX_DIFF_KB}KB) — skipping review.`);
  process.exit(0);
}
if (diff.trim().length === 0) {
  console.log("Empty diff — nothing to review.");
  process.exit(0);
}

const claudeMd = safeRead("CLAUDE.md");
const enterpriseStandard = safeRead("docs/audits/ENTERPRISE_STANDARD.md");

function safeRead(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

const systemPrompt = `You are reviewing a pull request for invest-com-au, a pre-launch
Australian investment-advice platform built with Next.js 16, Supabase, Stripe,
and Vercel cron. Your job is to catch the kind of issues that would otherwise
require a human senior reviewer.

Audit the diff against these dimensions, in priority order:

1. **Critical bugs** — runtime errors, null-safety, race conditions, broken
   auth, RLS policy logic errors, Stripe webhook idempotency holes.
2. **Next.js / Supabase / Vercel gotchas** — folders prefixed with \`_\` are
   private (won't register as routes); CHECK constraint values; cron-pin lag;
   Edge runtime limitations; \`noUncheckedIndexedAccess\` violations.
3. **Single-source-of-truth violations** — hand-rolled compliance copy
   instead of \`lib/compliance.ts\`; new affiliate URL builders instead of
   \`lib/tracking.ts\`; fresh JSON-LD instead of \`lib/schema-markup.ts\`.
4. **Compliance / privacy** — PII handling, GDPR/AU Privacy Act endpoints,
   founder anonymity (CL-09), AFSL/AFCA disclosures, dated claims wrapped
   in \`<DatedStatBadge>\`.
5. **Security** — XSS via \`dangerouslySetInnerHTML\` without
   \`sanitizeHtml\`, CORS regressions, missing \`requireCronAuth\`,
   service-role escapes outside \`lib/supabase/admin.ts\`.
6. **Test coverage** — new API route without \`__tests__/api/<name>.test.ts\`,
   new user-data table without RLS isolation test.

The repo's CLAUDE.md and ENTERPRISE_STANDARD.md (provided below) are the
binding conventions. Any deviation from them is a finding.

Output format — strict:

## Verdict
One of: APPROVE / APPROVE_WITH_NITS / REQUEST_CHANGES / NEEDS_HUMAN_REVIEW

## Summary
2-3 sentences explaining the verdict.

## Findings
For each issue, in priority order:
- **[severity]** \`path/to/file.ts:line\` — concise problem description.
  Suggested fix: one-line fix.

Severity is one of: CRITICAL / HIGH / MEDIUM / LOW / NIT.
If there are zero findings, write "No findings — clean diff." under Findings.

## Notes for human reviewer
Anything ambiguous you couldn't decide on, e.g. taste-level architectural
choices that need a human's judgement. One sentence each. Skip this section
if there's nothing.

Be terse. Don't pad. Don't praise. The user wants signal, not validation.`;

const userMessage = [
  {
    type: "text",
    text: `# Repo conventions (CLAUDE.md)\n\n${claudeMd}\n\n---\n\n# Enterprise rubric (ENTERPRISE_STANDARD.md)\n\n${enterpriseStandard}`,
    cache_control: { type: "ephemeral" },
  },
  {
    type: "text",
    text: `# PR #${PR_NUMBER} diff (${diffKb}KB)\n\n\`\`\`diff\n${diff}\n\`\`\``,
  },
];

const client = new Anthropic();

console.log(`Calling ${MODEL} for review of PR #${PR_NUMBER} (${diffKb}KB diff)...`);

const stream = client.messages.stream({
  model: MODEL,
  max_tokens: 16000,
  thinking: { type: "adaptive" },
  system: systemPrompt,
  messages: [{ role: "user", content: userMessage }],
});

for await (const _ of stream) { /* drain */ }
const response = await stream.finalMessage();

const reviewText = response.content
  .filter((b) => b.type === "text")
  .map((b) => b.text)
  .join("\n\n");

const verdictMatch = reviewText.match(/## Verdict\s*\n\s*(\S+)/);
const verdict = verdictMatch?.[1] ?? "NEEDS_HUMAN_REVIEW";

console.log(`Verdict: ${verdict}`);
console.log(
  `Tokens: ${response.usage.input_tokens} in (${response.usage.cache_read_input_tokens} cached) / ${response.usage.output_tokens} out`,
);

const stickyMarker = "<!-- ai-pr-review -->";
const body = `${stickyMarker}
## AI code review (${MODEL})

${reviewText}

---
<sub>Generated by \`scripts/ai-pr-review.mjs\`. Skip with \`[skip-ai-review]\` in PR title.</sub>`;

await postOrUpdateComment(REPO, PR_NUMBER, TOKEN, body, stickyMarker);

if (verdict === "REQUEST_CHANGES") {
  console.log("Verdict is REQUEST_CHANGES — exiting non-zero to fail the check.");
  process.exit(1);
}

async function postOrUpdateComment(repo, prNumber, token, body, marker) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "invest-com-au-ai-review",
  };

  const listUrl = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments?per_page=100`;
  const existing = await fetch(listUrl, { headers }).then((r) => r.json());
  const sticky = existing.find?.((c) => c.body?.startsWith(marker));

  if (sticky) {
    const r = await fetch(sticky.url, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (!r.ok) throw new Error(`Update failed: ${r.status} ${await r.text()}`);
    console.log(`Updated sticky comment ${sticky.id}`);
  } else {
    const postUrl = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`;
    const r = await fetch(postUrl, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (!r.ok) throw new Error(`Post failed: ${r.status} ${await r.text()}`);
    console.log("Posted new sticky comment.");
  }
}
