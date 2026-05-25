import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRequireCronAuth, mockRetryFailedOutboundWebhooks } = vi.hoisted(() => ({
  mockRequireCronAuth: vi.fn(),
  mockRetryFailedOutboundWebhooks: vi.fn().mockResolvedValue({ retried: 3, failed: 0 }),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: (req: NextRequest) => mockRequireCronAuth(req),
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: (req: NextRequest) => Promise<NextResponse>) => h,
}));

vi.mock("@/lib/outbound-webhooks", () => ({
  retryFailedOutboundWebhooks: (...a: unknown[]) => mockRetryFailedOutboundWebhooks(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { GET } from "@/app/api/cron/retry-outbound-webhooks/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/cron/retry-outbound-webhooks", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET || "test-secret"}`,
    },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/cron/retry-outbound-webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null);
    mockRetryFailedOutboundWebhooks.mockResolvedValue({ retried: 3, failed: 0 });
  });

  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    expect((await GET(makeGet())).status).toBe(401);
  });

  it("retries failed webhooks and returns stats", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.retried).toBe(3);
    expect(json.failed).toBe(0);
    expect(mockRetryFailedOutboundWebhooks).toHaveBeenCalled();
  });

  it("returns stats even when no webhooks needed retry", async () => {
    mockRetryFailedOutboundWebhooks.mockResolvedValueOnce({ retried: 0, failed: 0 });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.retried).toBe(0);
  });
});
