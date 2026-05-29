import { describe, it, expect } from "vitest";
import { classifyAiReferrer, classifyAiCrawler } from "@/lib/geo/ai-referrer";

describe("classifyAiReferrer", () => {
  it("matches ChatGPT from a full URL", () => {
    expect(classifyAiReferrer("https://chatgpt.com/c/abc123")).toEqual({
      source: "chatgpt",
      label: "ChatGPT",
      vendor: "OpenAI",
      kind: "assistant",
    });
  });

  it("matches a bare host with no scheme", () => {
    expect(classifyAiReferrer("perplexity.ai")?.source).toBe("perplexity");
  });

  it("matches a subdomain via the host-suffix rule", () => {
    expect(classifyAiReferrer("https://www.perplexity.ai/search?q=etf")?.source).toBe("perplexity");
    expect(classifyAiReferrer("https://www.chatgpt.com/")?.source).toBe("chatgpt");
  });

  it("lowercases the host before matching", () => {
    expect(classifyAiReferrer("https://ChatGPT.com")?.source).toBe("chatgpt");
  });

  it("maps Bard and Gemini to the same source", () => {
    expect(classifyAiReferrer("https://gemini.google.com/app")?.source).toBe("gemini");
    expect(classifyAiReferrer("https://bard.google.com/")?.source).toBe("gemini");
  });

  it("maps both xAI hosts to grok", () => {
    expect(classifyAiReferrer("https://grok.com")?.source).toBe("grok");
    expect(classifyAiReferrer("https://x.ai")?.source).toBe("grok");
  });

  it("tags answer engines distinctly from assistants", () => {
    expect(classifyAiReferrer("https://perplexity.ai")?.kind).toBe("answer_engine");
    expect(classifyAiReferrer("https://claude.ai")?.kind).toBe("assistant");
  });

  it("does not match plain Google or Bing (AI Overviews / Bing chat share the search host)", () => {
    expect(classifyAiReferrer("https://www.google.com/search?q=best+etf")).toBeNull();
    expect(classifyAiReferrer("https://www.bing.com/search?q=etf")).toBeNull();
  });

  it("does not false-positive on a host that merely ends with a known name", () => {
    expect(classifyAiReferrer("https://notchatgpt.com")).toBeNull();
  });

  it("returns null for same-origin, empty, and malformed referrers", () => {
    expect(classifyAiReferrer("https://invest.com.au/glossary/etf")).toBeNull();
    expect(classifyAiReferrer("")).toBeNull();
    expect(classifyAiReferrer(null)).toBeNull();
    expect(classifyAiReferrer(undefined)).toBeNull();
    expect(classifyAiReferrer("not a url ###")).toBeNull();
  });
});

describe("classifyAiCrawler", () => {
  it("identifies GPTBot as training traffic", () => {
    const ua =
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot";
    expect(classifyAiCrawler(ua)).toEqual({ bot: "GPTBot", vendor: "OpenAI", purpose: "training" });
  });

  it("distinguishes user-fetch bots from training crawlers for the same vendor", () => {
    expect(classifyAiCrawler("Mozilla/5.0 ... ChatGPT-User/1.0; +https://openai.com/bot")?.purpose).toBe(
      "user_fetch",
    );
    expect(classifyAiCrawler("Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)")?.purpose).toBe(
      "training",
    );
    expect(classifyAiCrawler("Mozilla/5.0 (compatible; Claude-User/1.0)")?.bot).toBe("Claude-User");
  });

  it("identifies the major search/answer crawlers", () => {
    expect(classifyAiCrawler("Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)")?.vendor).toBe("Perplexity");
    expect(classifyAiCrawler("Mozilla/5.0 (compatible; Google-Extended)")?.vendor).toBe("Google");
    expect(classifyAiCrawler("CCBot/2.0 (https://commoncrawl.org/faq/)")?.vendor).toBe("Common Crawl");
  });

  it("returns null for ordinary browsers and empty input", () => {
    const chrome =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(classifyAiCrawler(chrome)).toBeNull();
    expect(classifyAiCrawler("")).toBeNull();
    expect(classifyAiCrawler(null)).toBeNull();
    expect(classifyAiCrawler(undefined)).toBeNull();
  });
});
