// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/session", () => ({
  getSessionId: vi.fn(() => "sess-abc"),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { trackClick, trackEvent, trackPageDuration } from "@/lib/tracking";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ── trackClick ────────────────────────────────────────────────────────────────

describe("trackClick — sendBeacon path", () => {
  it("uses sendBeacon when available and returns true — fetch is not called", () => {
    const beaconSpy = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    trackClick("stake", "Stake", "compare", "/brokers");

    expect(beaconSpy).toHaveBeenCalledOnce();
    expect(beaconSpy).toHaveBeenCalledWith("/api/track-click", expect.any(Blob));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("trackClick — fetch fallback path", () => {
  it("calls fetch when sendBeacon returns false", () => {
    vi.spyOn(navigator, "sendBeacon").mockReturnValue(false);
    const mockFetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({}) }),
    );
    vi.stubGlobal("fetch", mockFetch);

    trackClick("stake", "Stake", "compare", "/brokers");

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/track-click",
      expect.objectContaining({ method: "POST", keepalive: true }),
    );
  });

  it("includes all payload fields in fetch body", () => {
    vi.spyOn(navigator, "sendBeacon").mockReturnValue(false);
    const mockFetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({}) }),
    );
    vi.stubGlobal("fetch", mockFetch);

    trackClick("stake", "Stake", "compare", "/brokers", "layer1", "sc1", "hero", {
      userId: "u-1",
      abTestId: "t-1",
      abVariant: "b",
    });

    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(call[1].body as string);
    expect(body.broker_slug).toBe("stake");
    expect(body.broker_name).toBe("Stake");
    expect(body.source).toBe("compare");
    expect(body.page).toBe("/brokers");
    expect(body.layer).toBe("layer1");
    expect(body.scenario).toBe("sc1");
    expect(body.placement_type).toBe("hero");
    expect(body.user_id).toBe("u-1");
    expect(body.ab_test_id).toBe("t-1");
    expect(body.ab_variant).toBe("b");
    expect(body.session_id).toBe("sess-abc");
  });

  it("stores click_id in window when fetch response includes it", async () => {
    vi.spyOn(navigator, "sendBeacon").mockReturnValue(false);
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ click_id: "click-xyz" }),
        }),
      ),
    );

    trackClick("stake", "Stake", "compare", "/brokers");
    await new Promise((r) => setTimeout(r, 20));

    expect(
      (window as unknown as Record<string, unknown>).__inv_last_click_id,
    ).toBe("click-xyz");
  });
});

// ── trackEvent ────────────────────────────────────────────────────────────────

describe("trackEvent", () => {
  it("posts to /api/track-event with correct payload", () => {
    const mockFetch = vi.fn(() => Promise.resolve({ ok: true }));
    vi.stubGlobal("fetch", mockFetch);

    trackEvent("page_view", { broker: "stake" }, "/brokers");

    expect(mockFetch).toHaveBeenCalledOnce();
    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe("/api/track-event");
    expect(call[1].method).toBe("POST");
    const body = JSON.parse(call[1].body as string);
    expect(body.event_type).toBe("page_view");
    expect(body.event_data).toEqual({ broker: "stake" });
    expect(body.page).toBe("/brokers");
    expect(body.session_id).toBe("sess-abc");
  });

  it("defaults event_data to empty object when omitted", () => {
    const mockFetch = vi.fn(() => Promise.resolve({ ok: true }));
    vi.stubGlobal("fetch", mockFetch);

    trackEvent("click");

    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(call[1].body as string);
    expect(body.event_data).toEqual({});
  });

  it("does not throw on fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network down"))),
    );

    expect(() => trackEvent("test_event")).not.toThrow();
    await new Promise((r) => setTimeout(r, 20));
  });
});

// ── trackPageDuration ─────────────────────────────────────────────────────────

describe("trackPageDuration", () => {
  it("registers visibilitychange and pagehide listeners", () => {
    const docSpy = vi.spyOn(document, "addEventListener");
    const winSpy = vi.spyOn(window, "addEventListener");

    trackPageDuration("/brokers");

    expect(docSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(winSpy).toHaveBeenCalledWith("pagehide", expect.any(Function));
  });

  it("sends beacon after page is hidden for ≥2 seconds", () => {
    vi.useFakeTimers();
    const beaconSpy = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });

    trackPageDuration("/test-page");
    vi.advanceTimersByTime(3000);

    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(beaconSpy).toHaveBeenCalledOnce();
    expect(beaconSpy).toHaveBeenCalledWith(
      "/api/track-event",
      expect.stringContaining('"event_type":"page_duration"'),
    );
    const call = beaconSpy.mock.calls[0] as [string, string];
    const payload = JSON.parse(call[1]);
    expect(payload.page).toBe("/test-page");
    expect(payload.metadata.duration_seconds).toBe(3);
  });

  it("does not send beacon for bounce (<2 seconds)", () => {
    vi.useFakeTimers();
    const beaconSpy = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);

    trackPageDuration("/bounce-page");
    vi.advanceTimersByTime(1000);

    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(beaconSpy).not.toHaveBeenCalled();
  });

  it("sends beacon at most once (pagehide after visibilitychange is a no-op)", () => {
    vi.useFakeTimers();
    const beaconSpy = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      writable: true,
      configurable: true,
    });

    trackPageDuration("/test-page");
    vi.advanceTimersByTime(5000);

    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pagehide"));

    expect(beaconSpy).toHaveBeenCalledOnce();
  });
});
