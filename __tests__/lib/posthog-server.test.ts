import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockCapture = vi.fn();
const mockIdentify = vi.fn();
const mockShutdown = vi.fn().mockResolvedValue(undefined);

vi.mock("posthog-node", () => ({
  PostHog: vi.fn().mockImplementation(() => ({
    capture: mockCapture,
    identify: mockIdentify,
    shutdown: mockShutdown,
  })),
}));

import { captureServerEvent, identifyUser } from "@/lib/posthog/server";
import { PostHog } from "posthog-node";

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("lib/posthog/server — captureServerEvent", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...OLD_ENV, POSTHOG_API_KEY: "phc_test_key" };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("does nothing when POSTHOG_API_KEY is not set", async () => {
    delete process.env.POSTHOG_API_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    await captureServerEvent("user-1", "quiz_started", { quiz_type: "advisor_match", source_page: "/quiz" });
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it("calls ph.capture with correct distinctId, event and properties", async () => {
    await captureServerEvent("user-123", "quiz_started", { quiz_type: "advisor_match", source_page: "/quiz" });
    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: "user-123",
      event: "quiz_started",
      properties: { quiz_type: "advisor_match", source_page: "/quiz" },
    });
  });

  it("calls ph.shutdown after capture", async () => {
    await captureServerEvent("user-456", "quiz_started", { quiz_type: "advisor_match", source_page: "/quiz" });
    expect(mockShutdown).toHaveBeenCalled();
  });

  it("initialises PostHog with the API key", async () => {
    await captureServerEvent("user-789", "quiz_started", { quiz_type: "advisor_match", source_page: "/quiz" });
    expect(PostHog).toHaveBeenCalledWith("phc_test_key", expect.objectContaining({ flushAt: 1 }));
  });
});

describe("lib/posthog/server — identifyUser", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...OLD_ENV, POSTHOG_API_KEY: "phc_test_key" };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("does nothing when POSTHOG_API_KEY is not set", async () => {
    delete process.env.POSTHOG_API_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    await identifyUser("user-123", { email: "user@example.com" });
    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it("calls ph.identify with distinctId and properties", async () => {
    await identifyUser("user-456", { email: "a@example.com" });
    expect(mockIdentify).toHaveBeenCalledWith({
      distinctId: "user-456",
      properties: { email: "a@example.com" },
    });
  });

  it("calls ph.identify with undefined properties when none provided", async () => {
    await identifyUser("user-789");
    expect(mockIdentify).toHaveBeenCalledWith({
      distinctId: "user-789",
      properties: undefined,
    });
  });

  it("calls ph.shutdown after identify", async () => {
    await identifyUser("user-abc", { email: "b@example.com" });
    expect(mockShutdown).toHaveBeenCalled();
  });
});
