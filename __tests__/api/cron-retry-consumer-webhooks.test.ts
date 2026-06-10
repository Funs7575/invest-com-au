import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockRetryFailedConsumerWebhooks = vi.fn(
  async (..._a: unknown[]): Promise<{
    groups: number;
    retried: number;
    skipped_succeeded: number;
    skipped_max_attempts: number;
    skipped_no_secret: number;
    skipped_hook_gone: number;
  }> => ({
    groups: 0,
    retried: 0,
    skipped_succeeded: 0,
    skipped_max_attempts: 0,
    skipped_no_secret: 0,
    skipped_hook_gone: 0,
  }),
);
vi.mock("@/lib/consumer-webhook-dispatch", () => ({
  retryFailedConsumerWebhooks: (...args: unknown[]) => mockRetryFailedConsumerWebhooks(...args),
}));

// wrapCronHandler: thin wrapper — call handler and return its response
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: vi.fn(
    (_name: string, handler: (req: NextRequest) => Promise<unknown>) =>
      (req: NextRequest) =>
        handler(req),
  ),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET, runtime, maxDuration } from "@/app/api/cron/retry-consumer-webhooks/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-retry-webhooks-123";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/retry-consumer-webhooks", { headers }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/retry-consumer-webhooks — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 60", () => {
    expect(maxDuration).toBe(60);
  });
});

describe("GET /api/cron/retry-consumer-webhooks — auth guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 500 when CRON_SECRET is not set", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/misconfigured/i);
  });

  it("returns 500 when CRON_SECRET is too short", async () => {
    process.env.CRON_SECRET = "tooshort";
    const res = await GET(authedReq());
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer token", async () => {
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it("returns 401 when authorization header is absent", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });
});

describe("GET /api/cron/retry-consumer-webhooks — empty queue path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    mockRetryFailedConsumerWebhooks.mockResolvedValue({
      groups: 0,
      retried: 0,
      skipped_succeeded: 0,
      skipped_max_attempts: 0,
      skipped_no_secret: 0,
      skipped_hook_gone: 0,
    });
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with ok:true and all-zero stats when queue is empty", async () => {
    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.groups).toBe(0);
    expect(body.retried).toBe(0);
    expect(body.skipped_succeeded).toBe(0);
    expect(body.skipped_max_attempts).toBe(0);
    expect(body.skipped_no_secret).toBe(0);
    expect(body.skipped_hook_gone).toBe(0);
  });

  it("calls retryFailedConsumerWebhooks once", async () => {
    await GET(authedReq());
    expect(mockRetryFailedConsumerWebhooks).toHaveBeenCalledOnce();
  });
});

describe("GET /api/cron/retry-consumer-webhooks — success path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns stats from retryFailedConsumerWebhooks in response body", async () => {
    mockRetryFailedConsumerWebhooks.mockResolvedValue({
      groups: 3,
      retried: 2,
      skipped_succeeded: 0,
      skipped_max_attempts: 1,
      skipped_no_secret: 0,
      skipped_hook_gone: 0,
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.groups).toBe(3);
    expect(body.retried).toBe(2);
    expect(body.skipped_max_attempts).toBe(1);
  });

  it("returns skipped_hook_gone when webhook was deleted or deactivated", async () => {
    mockRetryFailedConsumerWebhooks.mockResolvedValue({
      groups: 2,
      retried: 0,
      skipped_succeeded: 0,
      skipped_max_attempts: 0,
      skipped_no_secret: 0,
      skipped_hook_gone: 2,
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped_hook_gone).toBe(2);
    expect(body.retried).toBe(0);
  });

  it("returns skipped_no_secret when hook has no signing secret", async () => {
    mockRetryFailedConsumerWebhooks.mockResolvedValue({
      groups: 1,
      retried: 0,
      skipped_succeeded: 0,
      skipped_max_attempts: 0,
      skipped_no_secret: 1,
      skipped_hook_gone: 0,
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped_no_secret).toBe(1);
  });

  it("returns mixed stats when some retried, some skipped", async () => {
    mockRetryFailedConsumerWebhooks.mockResolvedValue({
      groups: 5,
      retried: 2,
      skipped_succeeded: 0,
      skipped_max_attempts: 1,
      skipped_no_secret: 1,
      skipped_hook_gone: 1,
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.groups).toBe(5);
    expect(body.retried).toBe(2);
    expect(body.skipped_max_attempts).toBe(1);
    expect(body.skipped_no_secret).toBe(1);
    expect(body.skipped_hook_gone).toBe(1);
  });
});
