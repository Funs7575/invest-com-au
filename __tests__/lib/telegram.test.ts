import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import {
  getTelegramBotToken,
  isTelegramConfigured,
  verifyTelegramWebhookSecret,
  escapeMarkdownV2,
  formatRateAlertMessage,
  dispatchTelegramAlerts,
} from "@/lib/telegram";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getTelegramBotToken", () => {
  it("returns null when TELEGRAM_BOT_TOKEN is unset", () => {
    // Use empty string per CI-stub caveat: the CI env: block may set a value.
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    expect(getTelegramBotToken()).toBeNull();
  });

  it("returns null for whitespace-only tokens (trimmed)", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "        ");
    expect(getTelegramBotToken()).toBeNull();
  });

  it("returns null for tokens shorter than 10 chars after trimming", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "  123456  ");
    expect(getTelegramBotToken()).toBeNull();
  });

  it("returns the trimmed token when it is at least 10 chars", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "  123456:abcdef  ");
    expect(getTelegramBotToken()).toBe("123456:abcdef");
  });
});

describe("isTelegramConfigured", () => {
  it("is false when no token is set", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    expect(isTelegramConfigured()).toBe(false);
  });

  it("is true when a valid token is set (delegates to getTelegramBotToken)", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123456:valid-token");
    expect(isTelegramConfigured()).toBe(true);
  });
});

describe("verifyTelegramWebhookSecret", () => {
  it("returns false when TELEGRAM_WEBHOOK_SECRET is unset", () => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "");
    expect(verifyTelegramWebhookSecret("anything")).toBe(false);
    expect(verifyTelegramWebhookSecret(null)).toBe(false);
  });

  it("returns false when the header does not exactly match the secret", () => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "s3cr3t-value");
    expect(verifyTelegramWebhookSecret("wrong")).toBe(false);
    expect(verifyTelegramWebhookSecret(null)).toBe(false);
    // Trailing whitespace difference must not match (strict equality).
    expect(verifyTelegramWebhookSecret("s3cr3t-value ")).toBe(false);
  });

  it("returns true on strict equality with the configured secret", () => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "s3cr3t-value");
    expect(verifyTelegramWebhookSecret("s3cr3t-value")).toBe(true);
  });
});

describe("escapeMarkdownV2", () => {
  it("returns empty string for empty input", () => {
    expect(escapeMarkdownV2("")).toBe("");
  });

  it("passes through text with no special characters unchanged", () => {
    expect(escapeMarkdownV2("BetaShares A200")).toBe("BetaShares A200");
  });

  it("escapes each special character individually", () => {
    const specials = [
      "_",
      "*",
      "[",
      "]",
      "(",
      ")",
      "~",
      "`",
      ">",
      "#",
      "+",
      "-",
      "=",
      "|",
      "{",
      "}",
      ".",
      "!",
    ];
    for (const c of specials) {
      expect(escapeMarkdownV2(c)).toBe(`\\${c}`);
    }
  });

  it("escapes a literal backslash to a double backslash", () => {
    expect(escapeMarkdownV2("\\")).toBe("\\\\");
  });

  it("escapes all special characters in a single pass", () => {
    expect(escapeMarkdownV2("_*[]()~`>#+-=|{}.!")).toBe(
      "\\_\\*\\[\\]\\(\\)\\~\\`\\>\\#\\+\\-\\=\\|\\{\\}\\.\\!",
    );
  });

  it("escapes a mixed real-world string", () => {
    expect(escapeMarkdownV2("50% - rate (1.2)!")).toBe(
      "50% \\- rate \\(1\\.2\\)\\!",
    );
  });
});

describe("formatRateAlertMessage", () => {
  it("uses the up arrow for direction 'above'", () => {
    const msg = formatRateAlertMessage({
      metricLabel: "yield",
      direction: "above",
      oldRatePct: "4.0%",
      newRatePct: "4.5%",
      productName: "BetaShares A200",
      deepLinkUrl: "https://invest.com.au/x",
    });
    expect(msg.startsWith("📈")).toBe(true);
  });

  it("uses the down arrow for direction 'below'", () => {
    const msg = formatRateAlertMessage({
      metricLabel: "yield",
      direction: "below",
      oldRatePct: "4.5%",
      newRatePct: "4.0%",
      productName: "BetaShares A200",
      deepLinkUrl: "https://invest.com.au/x",
    });
    expect(msg.startsWith("📉")).toBe(true);
  });

  it("escapes special characters in the product name (parens)", () => {
    const msg = formatRateAlertMessage({
      metricLabel: "yield",
      direction: "above",
      oldRatePct: "4.0%",
      newRatePct: "4.5%",
      productName: "BetaShares (A200)",
      deepLinkUrl: "https://invest.com.au/x",
    });
    expect(msg).toContain("BetaShares \\(A200\\)");
  });

  it("passes metric, old/new rate and url through escapeMarkdownV2 and renders the View link", () => {
    const msg = formatRateAlertMessage({
      metricLabel: "12-mo return",
      direction: "above",
      oldRatePct: "4.0%",
      newRatePct: "4.5%",
      productName: "Fund",
      deepLinkUrl: "https://invest.com.au/etf?id=1.2",
    });
    // metricLabel escaped (the hyphen).
    expect(msg).toContain("12\\-mo return");
    // old/new escaped (the dots).
    expect(msg).toContain("4\\.0%");
    expect(msg).toContain("*4\\.5%*");
    // The View link with an escaped url (the dots and ? are escaped where special).
    expect(msg).toContain("[View →](https://invest\\.com\\.au/etf?id\\=1\\.2)");
  });
});

describe("dispatchTelegramAlerts", () => {
  it("is a no-op when there are no recipients (does not call fetch)", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123456:valid-token");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await dispatchTelegramAlerts([], "hi");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("is a no-op when Telegram is not configured (does not call fetch)", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await dispatchTelegramAlerts(
      [{ chatId: 1, email: "a@b.com" }],
      "hi",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
