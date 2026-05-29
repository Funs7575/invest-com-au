/**
 * Detection of generative-AI traffic for GEO (generative-engine optimisation)
 * measurement.
 *
 * Two distinct surfaces:
 *  - `classifyAiReferrer` — a human who clicked a citation inside an AI
 *    assistant / answer engine, detected from `document.referrer`.
 *  - `classifyAiCrawler` — an AI vendor's bot fetching a page, detected from
 *    the request `User-Agent`.
 *
 * Kept pure and dependency-free so it runs unchanged in the browser, an edge
 * route, or a Node route, and can be unit-tested in isolation.
 */

export interface AiReferrerMatch {
  /** Stable machine key, safe to use directly as an analytics property. */
  source: string;
  /** Human-readable label for dashboards. */
  label: string;
  vendor: string;
  /** Conversational assistant vs answer/search engine. */
  kind: "assistant" | "answer_engine";
}

interface ReferrerRule extends AiReferrerMatch {
  /** Matched against the extracted hostname. */
  host: RegExp;
}

// `(^|\.)x$` matches the bare apex and any subdomain of `x`, but never a host
// that merely ends in `x` (e.g. `notchatgpt.com`). Ordered most-specific first.
//
// google.com and bing.com are intentionally absent: AI Overviews and Bing chat
// answers share the hostname of ordinary search, so the referrer can't
// distinguish an AI citation from a blue-link click. Those are measured via the
// GSC impressions-vs-clicks divergence, not here.
const REFERRER_RULES: ReferrerRule[] = [
  { host: /(^|\.)chatgpt\.com$/, source: "chatgpt", label: "ChatGPT", vendor: "OpenAI", kind: "assistant" },
  { host: /(^|\.)chat\.openai\.com$/, source: "chatgpt", label: "ChatGPT", vendor: "OpenAI", kind: "assistant" },
  { host: /(^|\.)perplexity\.ai$/, source: "perplexity", label: "Perplexity", vendor: "Perplexity", kind: "answer_engine" },
  { host: /(^|\.)gemini\.google\.com$/, source: "gemini", label: "Gemini", vendor: "Google", kind: "assistant" },
  { host: /(^|\.)bard\.google\.com$/, source: "gemini", label: "Gemini (Bard)", vendor: "Google", kind: "assistant" },
  { host: /(^|\.)claude\.ai$/, source: "claude", label: "Claude", vendor: "Anthropic", kind: "assistant" },
  { host: /(^|\.)copilot\.microsoft\.com$/, source: "copilot", label: "Microsoft Copilot", vendor: "Microsoft", kind: "assistant" },
  { host: /(^|\.)you\.com$/, source: "you", label: "You.com", vendor: "You.com", kind: "answer_engine" },
  { host: /(^|\.)poe\.com$/, source: "poe", label: "Poe", vendor: "Quora", kind: "assistant" },
  { host: /(^|\.)phind\.com$/, source: "phind", label: "Phind", vendor: "Phind", kind: "answer_engine" },
  { host: /(^|\.)meta\.ai$/, source: "meta_ai", label: "Meta AI", vendor: "Meta", kind: "assistant" },
  { host: /(^|\.)deepseek\.com$/, source: "deepseek", label: "DeepSeek", vendor: "DeepSeek", kind: "assistant" },
  { host: /(^|\.)mistral\.ai$/, source: "mistral", label: "Le Chat (Mistral)", vendor: "Mistral", kind: "assistant" },
  { host: /(^|\.)grok\.com$/, source: "grok", label: "Grok", vendor: "xAI", kind: "assistant" },
  { host: /(^|\.)x\.ai$/, source: "grok", label: "Grok", vendor: "xAI", kind: "assistant" },
];

function extractHost(referrer: string): string | null {
  const raw = referrer.trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    // Bare host with no scheme, e.g. "chatgpt.com" or "chatgpt.com/foo?x=1".
    const host = raw.replace(/^\/\//, "").split("/")[0]?.split("?")[0]?.toLowerCase();
    return host && host.includes(".") ? host : null;
  }
}

export function classifyAiReferrer(referrer: string | null | undefined): AiReferrerMatch | null {
  if (!referrer) return null;
  const host = extractHost(referrer);
  if (!host) return null;
  for (const rule of REFERRER_RULES) {
    if (rule.host.test(host)) {
      return { source: rule.source, label: rule.label, vendor: rule.vendor, kind: rule.kind };
    }
  }
  return null;
}

export interface AiCrawlerMatch {
  bot: string;
  vendor: string;
  /** Operator's declared use of the fetch, per each vendor's published docs. */
  purpose: "training" | "search" | "user_fetch" | "unknown";
}

interface CrawlerRule extends AiCrawlerMatch {
  /** Matched case-insensitively against the raw User-Agent. */
  token: RegExp;
}

// Token order matters where one bot's name is a substring of another's; the
// distinct OpenAI/Anthropic/Perplexity tokens below don't overlap, but keep
// the most-specific token first if you add an overlapping one.
const CRAWLER_RULES: CrawlerRule[] = [
  { token: /GPTBot/i, bot: "GPTBot", vendor: "OpenAI", purpose: "training" },
  { token: /OAI-SearchBot/i, bot: "OAI-SearchBot", vendor: "OpenAI", purpose: "search" },
  { token: /ChatGPT-User/i, bot: "ChatGPT-User", vendor: "OpenAI", purpose: "user_fetch" },
  { token: /ClaudeBot/i, bot: "ClaudeBot", vendor: "Anthropic", purpose: "training" },
  { token: /Claude-SearchBot/i, bot: "Claude-SearchBot", vendor: "Anthropic", purpose: "search" },
  { token: /Claude-User/i, bot: "Claude-User", vendor: "Anthropic", purpose: "user_fetch" },
  { token: /anthropic-ai/i, bot: "anthropic-ai", vendor: "Anthropic", purpose: "training" },
  { token: /PerplexityBot/i, bot: "PerplexityBot", vendor: "Perplexity", purpose: "search" },
  { token: /Perplexity-User/i, bot: "Perplexity-User", vendor: "Perplexity", purpose: "user_fetch" },
  { token: /Google-Extended/i, bot: "Google-Extended", vendor: "Google", purpose: "training" },
  { token: /GoogleOther/i, bot: "GoogleOther", vendor: "Google", purpose: "unknown" },
  { token: /Applebot-Extended/i, bot: "Applebot-Extended", vendor: "Apple", purpose: "training" },
  { token: /Bytespider/i, bot: "Bytespider", vendor: "ByteDance", purpose: "training" },
  { token: /Amazonbot/i, bot: "Amazonbot", vendor: "Amazon", purpose: "unknown" },
  { token: /Meta-ExternalAgent/i, bot: "Meta-ExternalAgent", vendor: "Meta", purpose: "training" },
  { token: /CCBot/i, bot: "CCBot", vendor: "Common Crawl", purpose: "training" },
  { token: /cohere-(ai|training-data-crawler)/i, bot: "cohere-ai", vendor: "Cohere", purpose: "training" },
  { token: /DuckAssistBot/i, bot: "DuckAssistBot", vendor: "DuckDuckGo", purpose: "search" },
  { token: /YouBot/i, bot: "YouBot", vendor: "You.com", purpose: "search" },
  { token: /Diffbot/i, bot: "Diffbot", vendor: "Diffbot", purpose: "training" },
  { token: /Timpibot/i, bot: "Timpibot", vendor: "Timpi", purpose: "search" },
  { token: /ImagesiftBot/i, bot: "ImagesiftBot", vendor: "ImageSift", purpose: "training" },
];

export function classifyAiCrawler(userAgent: string | null | undefined): AiCrawlerMatch | null {
  if (!userAgent) return null;
  for (const rule of CRAWLER_RULES) {
    if (rule.token.test(userAgent)) {
      return { bot: rule.bot, vendor: rule.vendor, purpose: rule.purpose };
    }
  }
  return null;
}
