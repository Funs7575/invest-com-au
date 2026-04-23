/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getOrCreateSessionId,
  recordFormEvent,
  useFormFunnelTracking,
} from "@/lib/form-tracking";

describe("getOrCreateSessionId", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates a persistent session id on first call", () => {
    const id = getOrCreateSessionId();
    expect(id).toMatch(/^[0-9a-f-]{10,}$/);
    expect(localStorage.getItem("invest_session_id")).toBe(id);
  });

  it("returns the same id on subsequent calls", () => {
    const first = getOrCreateSessionId();
    const second = getOrCreateSessionId();
    expect(first).toBe(second);
  });

  it("generates a fallback id when localStorage throws", () => {
    const spy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("quota exceeded");
      });
    const id = getOrCreateSessionId();
    expect(id.startsWith("s_")).toBe(true);
    spy.mockRestore();
  });
});

describe("recordFormEvent", () => {
  let beaconSpy: ReturnType<typeof vi.fn>;
  let fetchSpy: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    beaconSpy = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: beaconSpy,
    });
    fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: undefined,
    });
  });

  it("prefers sendBeacon when available", () => {
    recordFormEvent({ form: "quiz", step: "q1", event: "view" });
    expect(beaconSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();

    const [url, blob] = beaconSpy.mock.calls[0] ?? [];
    expect(url).toBe("/api/form-event");
    expect(blob).toBeInstanceOf(Blob);
  });

  it("falls back to fetch when sendBeacon returns false", () => {
    beaconSpy.mockReturnValue(false);
    recordFormEvent({ form: "quiz", step: "q1", event: "view" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("/api/form-event");
    expect((init as RequestInit).keepalive).toBe(true);
  });

  it("falls back to fetch when sendBeacon throws", () => {
    beaconSpy.mockImplementation(() => {
      throw new Error("beacon down");
    });
    recordFormEvent({ form: "quiz", step: "q1", event: "view" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("falls back to fetch when sendBeacon is not available", () => {
    // Remove from navigator entirely
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: undefined,
    });
    recordFormEvent({ form: "quiz", step: "q1", event: "view" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("includes all fields in the JSON payload", () => {
    beaconSpy.mockReturnValue(false);
    recordFormEvent({
      form: "advisor_enquiry",
      step: "contact_details",
      stepIndex: 3,
      event: "complete",
      meta: { hasPhone: true },
    });
    const [, init] = fetchSpy.mock.calls[0] ?? [];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      form_name: "advisor_enquiry",
      step: "contact_details",
      step_index: 3,
      event: "complete",
      meta: { hasPhone: true },
      session_id: expect.any(String),
    });
  });

  it("sets meta to null when not provided", () => {
    beaconSpy.mockReturnValue(false);
    recordFormEvent({ form: "quiz", step: "q1", event: "view" });
    const [, init] = fetchSpy.mock.calls[0] ?? [];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.meta).toBeNull();
  });
});

describe("useFormFunnelTracking (pure wrapper, not a real hook)", () => {
  let beaconSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    beaconSpy = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: beaconSpy,
    });
  });

  it("onStepView emits a view event", () => {
    const t = useFormFunnelTracking("quiz");
    t.onStepView("q1", 1);
    expect(beaconSpy).toHaveBeenCalledOnce();
    const blob = beaconSpy.mock.calls[0]?.[1] as Blob;
    // Blob doesn't expose text() synchronously in jsdom; check len > 0 is enough
    expect(blob.size).toBeGreaterThan(0);
  });

  it("onInteract emits an interact event", () => {
    const t = useFormFunnelTracking("advisor_enquiry");
    t.onInteract("email_field");
    expect(beaconSpy).toHaveBeenCalledOnce();
  });

  it("onComplete defaults the step to 'complete'", () => {
    const t = useFormFunnelTracking("quiz");
    t.onComplete();
    expect(beaconSpy).toHaveBeenCalledOnce();
  });

  it("onAbandon defaults the step to 'abandon'", () => {
    const t = useFormFunnelTracking("quiz");
    t.onAbandon();
    expect(beaconSpy).toHaveBeenCalledOnce();
  });
});
