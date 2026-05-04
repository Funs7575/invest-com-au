/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAffiliateLink, getBenefitCta, formatPercent, renderStars, AFFILIATE_REL, trackClick, trackEvent, trackPageDuration } from "@/lib/tracking";

vi.mock("@/lib/session", () => ({
  getSessionId: vi.fn(() => "test-session-id"),
}));
import type { Broker } from "@/lib/types";

function makeBroker(overrides: Partial<Broker> = {}): Broker {
  return {
    id: 1,
    name: "TestBroker",
    slug: "testbroker",
    affiliate_url: null,
    asx_fee: "$5",
    asx_fee_value: 5,
    us_fee: null,
    us_fee_value: null,
    fx_rate: null,
    inactivity_fee: null,
    rating: 4.5,
    deal: false,
    deal_text: null,
    deal_terms: null,
    deal_expiry: null,
    cta_text: null,
    benefit_cta: null,
    is_crypto: false,
    chess_sponsored: true,
    regulated_by: "ASIC",
    year_founded: 2010,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
    ...overrides,
  } as Broker;
}

describe("AFFILIATE_REL", () => {
  it("includes nofollow and sponsored", () => {
    expect(AFFILIATE_REL).toContain("nofollow");
    expect(AFFILIATE_REL).toContain("sponsored");
    expect(AFFILIATE_REL).toContain("noopener");
    expect(AFFILIATE_REL).toContain("noreferrer");
  });
});

describe("getAffiliateLink", () => {
  it("returns /go/{slug} when affiliate_url exists", () => {
    const broker = makeBroker({ slug: "stake", affiliate_url: "https://stake.com.au" });
    expect(getAffiliateLink(broker)).toBe("/go/stake");
  });

  it("returns /broker/{slug} when no affiliate_url", () => {
    const broker = makeBroker({ slug: "commsec", affiliate_url: undefined });
    expect(getAffiliateLink(broker)).toBe("/broker/commsec");
  });

  it("returns /broker/ for empty string affiliate_url", () => {
    const broker = makeBroker({ slug: "test", affiliate_url: "" });
    expect(getAffiliateLink(broker)).toBe("/broker/test");
  });
});

describe("getBenefitCta", () => {
  it("returns benefit_cta if set", () => {
    const broker = makeBroker({ benefit_cta: "Custom CTA" });
    expect(getBenefitCta(broker, "compare")).toBe("Custom CTA");
  });

  it("returns cta_text if set and no benefit_cta", () => {
    const broker = makeBroker({ cta_text: "Custom Text" });
    expect(getBenefitCta(broker, "compare")).toBe("Custom Text");
  });

  it("returns deal-specific CTA when broker has a deal", () => {
    const broker = makeBroker({ deal: true, deal_text: "Free trades for 30 days", name: "Stake", affiliate_url: "https://example.com" });
    expect(getBenefitCta(broker, "compare")).toBe("Claim Stake Deal");
  });

  it("returns $0 brokerage CTA for compare context", () => {
    const broker = makeBroker({ asx_fee_value: 0, affiliate_url: "https://example.com" });
    expect(getBenefitCta(broker, "compare")).toBe("Trade $0 Brokerage →");
  });

  it("returns low fee CTA for cheap brokers in compare", () => {
    const broker = makeBroker({ asx_fee_value: 3, asx_fee: "$3", affiliate_url: "https://example.com" });
    expect(getBenefitCta(broker, "compare")).toBe("Trade from $3 →");
  });

  it("returns default for compare with normal fees", () => {
    const broker = makeBroker({ asx_fee_value: 10, affiliate_url: "https://example.com" });
    expect(getBenefitCta(broker, "compare")).toBe("Open Free Account →");
  });

  it("returns calculator-specific CTA for $0 brokerage", () => {
    const broker = makeBroker({ asx_fee_value: 0, affiliate_url: "https://example.com" });
    expect(getBenefitCta(broker, "calculator")).toBe("Try $0 Brokerage →");
  });

  it("returns quiz-specific default CTA", () => {
    const broker = makeBroker({ affiliate_url: "https://example.com" });
    expect(getBenefitCta(broker, "quiz")).toBe("Get Started Free →");
  });

  it("returns review CTA when no affiliate_url", () => {
    const broker = makeBroker({ affiliate_url: undefined });
    expect(getBenefitCta(broker, "review")).toBe("Read Full Review →");
  });

  it("returns informational view CTA for non-review when no affiliate_url", () => {
    const broker = makeBroker({
      affiliate_url: undefined,
      name: "TestBroker",
    });
    expect(getBenefitCta(broker, "compare")).toBe("View TestBroker →");
  });

  it("deal with deal_text returns 'Claim ${name} Deal' default", () => {
    const broker = makeBroker({
      deal: true,
      deal_text: "Win cash",
      name: "TestBroker",
      affiliate_url: "https://example.com",
    });
    expect(getBenefitCta(broker, "review")).toBe("Claim TestBroker Deal");
  });

  it("review without deal returns Open ${name} Account", () => {
    const broker = makeBroker({
      name: "TestBroker",
      affiliate_url: "https://example.com",
    });
    expect(getBenefitCta(broker, "review")).toBe(
      "Open TestBroker Account →",
    );
  });

  it("calculator returns Try ${name} Free for non-zero fees", () => {
    const broker = makeBroker({
      name: "TestBroker",
      asx_fee_value: 10,
      affiliate_url: "https://example.com",
    });
    expect(getBenefitCta(broker, "calculator")).toBe("Try TestBroker Free →");
  });

  it("versus returns the standard Open Free Account default", () => {
    const broker = makeBroker({ affiliate_url: "https://example.com" });
    expect(getBenefitCta(broker, "versus")).toBe("Open Free Account →");
  });

  it("respects deal flag set without deal_text (falls through)", () => {
    const broker = makeBroker({
      deal: true,
      deal_text: undefined,
      asx_fee_value: 0,
      affiliate_url: "https://example.com",
    });
    // No deal_text means the deal branch is skipped — falls through to context default
    expect(getBenefitCta(broker, "compare")).toBe("Trade $0 Brokerage →");
  });
});

describe("formatPercent", () => {
  it("formats with default 2 decimals", () => {
    expect(formatPercent(0.5)).toBe("0.50%");
  });

  it("formats with custom decimals", () => {
    expect(formatPercent(1.234, 1)).toBe("1.2%");
  });

  it("formats whole numbers", () => {
    expect(formatPercent(5, 0)).toBe("5%");
  });
});

describe("renderStars", () => {
  it("renders 5 full stars", () => {
    expect(renderStars(5)).toBe("★★★★★");
  });

  it("renders 0 stars", () => {
    expect(renderStars(0)).toBe("☆☆☆☆☆");
  });

  it("renders half star at 2.5", () => {
    expect(renderStars(2.5)).toBe("★★½☆☆");
  });

  it("renders 4 full + 1 empty at 4.3", () => {
    expect(renderStars(4.3)).toBe("★★★★☆");
  });

  it("renders 4 full + half at 4.7", () => {
    expect(renderStars(4.7)).toBe("★★★★½");
  });
});

// ─── Browser-API functions ────────────────────────────────────────────────────

describe("trackClick", () => {
  const originalFetch = globalThis.fetch;
  let beaconSpy: ReturnType<typeof vi.fn>;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    beaconSpy = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: beaconSpy,
    });
    fetchSpy = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ click_id: "abc123" }) }),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: undefined,
    });
    delete (window as unknown as Record<string, unknown>).__inv_last_click_id;
  });

  it("uses sendBeacon when available and it returns true", () => {
    trackClick("stake", "Stake", "compare", "/share-trading");
    expect(beaconSpy).toHaveBeenCalledOnce();
    expect(beaconSpy.mock.calls[0]![0]).toBe("/api/track-click");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("payload includes all expected fields", () => {
    trackClick("stake", "Stake", "compare", "/share-trading", "hero", "best-asx", "card", {
      userId: "u1",
      abTestId: "t1",
      abVariant: "v1",
    });
    const blob: Blob = beaconSpy.mock.calls[0]![1] as Blob;
    return blob.text().then((text) => {
      const payload = JSON.parse(text);
      expect(payload.broker_slug).toBe("stake");
      expect(payload.broker_name).toBe("Stake");
      expect(payload.source).toBe("compare");
      expect(payload.page).toBe("/share-trading");
      expect(payload.layer).toBe("hero");
      expect(payload.scenario).toBe("best-asx");
      expect(payload.placement_type).toBe("card");
      expect(payload.session_id).toBe("test-session-id");
      expect(payload.user_id).toBe("u1");
      expect(payload.ab_test_id).toBe("t1");
      expect(payload.ab_variant).toBe("v1");
    });
  });

  it("falls back to fetch when sendBeacon returns false", () => {
    beaconSpy.mockReturnValue(false);
    trackClick("stake", "Stake", "compare", "/");
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0]![0]).toBe("/api/track-click");
  });

  it("falls back to fetch when sendBeacon throws", () => {
    beaconSpy.mockImplementation(() => {
      throw new Error("beacon error");
    });
    trackClick("stake", "Stake", "compare", "/");
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("falls back to fetch when sendBeacon is not available", () => {
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: undefined,
    });
    trackClick("stake", "Stake", "compare", "/");
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("sets window.__inv_last_click_id on fetch success with click_id", async () => {
    beaconSpy.mockReturnValue(false);
    trackClick("stake", "Stake", "compare", "/");
    await vi.waitFor(() =>
      expect((window as unknown as Record<string, string>).__inv_last_click_id).toBe("abc123"),
    );
  });

  it("does not set window.__inv_last_click_id when response has no click_id", async () => {
    beaconSpy.mockReturnValue(false);
    fetchSpy.mockResolvedValue({ json: () => Promise.resolve({}) });
    trackClick("stake", "Stake", "compare", "/");
    await new Promise((r) => setTimeout(r, 10));
    expect((window as unknown as Record<string, unknown>).__inv_last_click_id).toBeUndefined();
  });

  it("silently swallows fetch rejection", async () => {
    beaconSpy.mockReturnValue(false);
    fetchSpy.mockRejectedValue(new Error("network error"));
    expect(() => trackClick("stake", "Stake", "compare", "/")).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
  });

  it("nulls out optional fields when options not provided", () => {
    trackClick("stake", "Stake", "compare", "/");
    const blob: Blob = beaconSpy.mock.calls[0]![1] as Blob;
    return blob.text().then((text) => {
      const payload = JSON.parse(text);
      expect(payload.user_id).toBeNull();
      expect(payload.ab_test_id).toBeNull();
      expect(payload.ab_variant).toBeNull();
    });
  });
});

describe("trackEvent", () => {
  const originalFetch = globalThis.fetch;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(() => Promise.resolve({ ok: true }));
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls fetch with correct endpoint and payload", () => {
    trackEvent("page_view", { section: "hero" }, "/share-trading");
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/track-event");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body as string);
    expect(body.event_type).toBe("page_view");
    expect(body.event_data).toEqual({ section: "hero" });
    expect(body.page).toBe("/share-trading");
    expect(body.session_id).toBe("test-session-id");
  });

  it("uses window.location.pathname when page not provided", () => {
    // jsdom sets window.location.pathname to "/" by default
    trackEvent("cta_click");
    const [, opts] = fetchSpy.mock.calls[0]! as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    expect(body.page).toBe("/");
  });

  it("defaults eventData to empty object when not provided", () => {
    trackEvent("signup", undefined, "/auth");
    const [, opts] = fetchSpy.mock.calls[0]! as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    expect(body.event_data).toEqual({});
  });

  it("silently swallows fetch rejection (logs warn)", async () => {
    fetchSpy.mockRejectedValue(new Error("network down"));
    expect(() => trackEvent("test_event", {}, "/")).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
  });
});

describe("trackPageDuration", () => {
  let visibilitySpy: ReturnType<typeof vi.spyOn>;
  let pageSpy: ReturnType<typeof vi.spyOn>;
  let beaconSpy: ReturnType<typeof vi.fn>;
  let visibilityCallback: (() => void) | null = null;
  let pagehideCallback: (() => void) | null = null;

  beforeEach(() => {
    beaconSpy = vi.fn();
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: beaconSpy,
    });
    visibilityCallback = null;
    pagehideCallback = null;

    visibilitySpy = vi.spyOn(document, "addEventListener").mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === "visibilitychange") visibilityCallback = listener as () => void;
      },
    );
    pageSpy = vi.spyOn(window, "addEventListener").mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === "pagehide") pagehideCallback = listener as () => void;
      },
    );
  });

  afterEach(() => {
    visibilitySpy.mockRestore();
    pageSpy.mockRestore();
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: undefined,
    });
    vi.useRealTimers();
  });

  it("registers visibilitychange and pagehide listeners", () => {
    trackPageDuration("/test");
    expect(visibilitySpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(pageSpy).toHaveBeenCalledWith("pagehide", expect.any(Function));
  });

  it("sends beacon via pagehide after sufficient duration", () => {
    vi.useFakeTimers();
    const startTime = Date.now();
    trackPageDuration("/test-page");
    vi.advanceTimersByTime(5000);
    // Trigger pagehide at +5s
    vi.spyOn(Date, "now").mockReturnValue(startTime + 5000);
    pagehideCallback?.();
    expect(beaconSpy).toHaveBeenCalledOnce();
    expect(beaconSpy.mock.calls[0]![0]).toBe("/api/track-event");
    const body = JSON.parse(beaconSpy.mock.calls[0]![1] as string);
    expect(body.event_type).toBe("page_duration");
    expect(body.page).toBe("/test-page");
    expect(body.metadata.duration_seconds).toBe(5);
  });

  it("does not send beacon for duration < 2s (bounce)", () => {
    vi.useFakeTimers();
    const startTime = Date.now();
    trackPageDuration("/test");
    vi.spyOn(Date, "now").mockReturnValue(startTime + 1000);
    pagehideCallback?.();
    expect(beaconSpy).not.toHaveBeenCalled();
  });

  it("does not send beacon for duration > 3600s (stale tab)", () => {
    vi.useFakeTimers();
    const startTime = Date.now();
    trackPageDuration("/test");
    vi.spyOn(Date, "now").mockReturnValue(startTime + 3700 * 1000);
    pagehideCallback?.();
    expect(beaconSpy).not.toHaveBeenCalled();
  });

  it("is idempotent — second call after first send is a no-op", () => {
    vi.useFakeTimers();
    const startTime = Date.now();
    trackPageDuration("/test");
    vi.spyOn(Date, "now").mockReturnValue(startTime + 10000);
    pagehideCallback?.();
    pagehideCallback?.();
    expect(beaconSpy).toHaveBeenCalledOnce();
  });

  it("sends beacon on visibilitychange → hidden", () => {
    vi.useFakeTimers();
    const startTime = Date.now();
    trackPageDuration("/test");
    vi.spyOn(Date, "now").mockReturnValue(startTime + 8000);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    visibilityCallback?.();
    expect(beaconSpy).toHaveBeenCalledOnce();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });
});
