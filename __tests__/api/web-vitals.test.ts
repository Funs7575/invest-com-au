import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown",
}));

const mockCaptureSample = vi.fn();
const mockClassifyDevice = vi.fn();
const mockIsValidMetric = vi.fn();
vi.mock("@/lib/web-vitals", () => ({
  captureSample: (...args: unknown[]) => mockCaptureSample(...args),
  classifyDevice: (...args: unknown[]) => mockClassifyDevice(...args),
  isValidMetric: (...args: unknown[]) => mockIsValidMetric(...args),
}));

import { POST } from "@/app/api/web-vitals/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(
  body: unknown,
  opts: { ip?: string; ua?: string } = {},
): NextRequest {
  const ip = opts.ip ?? "1.2.3.4";
  const ua = opts.ua ?? "Mozilla/5.0 (test)";
  return new NextRequest("http://localhost/api/web-vitals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      "user-agent": ua,
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  metric: "LCP",
  value: 1234.5,
  page_path: "/some-page",
  session_id: "sess-abc",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/web-vitals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockIsValidMetric.mockReturnValue(true);
    mockClassifyDevice.mockReturnValue("desktop");
    mockCaptureSample.mockResolvedValue({ ok: true });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe("rate_limited");
  });

  it("returns 400 when metric is invalid", async () => {
    mockIsValidMetric.mockReturnValue(false);
    const res = await POST(makePost({ ...VALID_BODY, metric: "BADMETRIC" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_request");
  });

  it("returns 400 when value is missing", async () => {
    const { value: _, ...noValue } = VALID_BODY;
    const res = await POST(makePost(noValue));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_request");
  });

  it("returns 400 when page_path is missing", async () => {
    const { page_path: _, ...noPath } = VALID_BODY;
    const res = await POST(makePost(noPath));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_request");
  });

  it("returns 400 when captureSample returns error", async () => {
    mockCaptureSample.mockResolvedValue({ ok: false, error: "unsupported_metric" });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("unsupported_metric");
  });

  it("returns 200 with ok:true on success", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("passes classified deviceKind to captureSample", async () => {
    mockClassifyDevice.mockReturnValue("mobile");
    await POST(makePost(VALID_BODY));
    const arg = mockCaptureSample.mock.calls[0]![0];
    expect(arg.deviceKind).toBe("mobile");
  });

  it("passes sessionId when provided in body", async () => {
    await POST(makePost({ ...VALID_BODY, session_id: "my-session" }));
    const arg = mockCaptureSample.mock.calls[0]![0];
    expect(arg.sessionId).toBe("my-session");
  });

  it("passes null sessionId when not provided", async () => {
    const { session_id: _, ...noSession } = VALID_BODY;
    await POST(makePost(noSession));
    const arg = mockCaptureSample.mock.calls[0]![0];
    expect(arg.sessionId).toBeNull();
  });

  it("uses request User-Agent header when body.user_agent is absent", async () => {
    const { session_id: _, ...noSession } = VALID_BODY;
    await POST(makePost(noSession, { ua: "custom-ua/1.0" }));
    expect(mockClassifyDevice).toHaveBeenCalledWith("custom-ua/1.0");
  });
});
