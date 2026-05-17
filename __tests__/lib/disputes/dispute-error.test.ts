import { describe, it, expect } from "vitest";
import {
  DISPUTE_REASON_MAX,
  DISPUTE_REASON_MIN,
  DISPUTE_STALE_DAYS,
  DisputeError,
} from "@/lib/disputes";

describe("dispute constants", () => {
  it("reason min/max are sensible and within the DB CHECK ceiling", () => {
    expect(DISPUTE_REASON_MIN).toBeGreaterThanOrEqual(20);
    expect(DISPUTE_REASON_MAX).toBeLessThanOrEqual(4000);
    expect(DISPUTE_REASON_MIN).toBeLessThan(DISPUTE_REASON_MAX);
  });

  it("stale window is a positive number of days", () => {
    expect(DISPUTE_STALE_DAYS).toBeGreaterThan(0);
  });
});

describe("DisputeError", () => {
  it("preserves message and status on construction", () => {
    const e = new DisputeError("brief_not_found", 404);
    expect(e.message).toBe("brief_not_found");
    expect(e.status).toBe(404);
    expect(e.name).toBe("DisputeError");
  });

  it("is throwable and instanceof-checkable", () => {
    try {
      throw new DisputeError("not_party", 403);
    } catch (err) {
      expect(err).toBeInstanceOf(DisputeError);
      expect((err as DisputeError).status).toBe(403);
    }
  });
});
