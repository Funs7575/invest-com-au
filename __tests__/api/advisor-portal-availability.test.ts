import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const requireAdvisorSessionMock = vi.hoisted(() =>
  vi.fn<() => Promise<number | null>>(async () => 7),
);
vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: requireAdvisorSessionMock,
}));

const isBookingV2EnabledMock = vi.hoisted(() => vi.fn<() => Promise<boolean>>(async () => true));
const listWeeklyTemplateMock = vi.hoisted(() =>
  vi.fn<() => Promise<unknown[]>>(async () => []),
);
const replaceWeeklyTemplateMock = vi.hoisted(() =>
  vi.fn<() => Promise<{ ok: boolean; count?: number; error?: string }>>(async () => ({
    ok: true,
    count: 1,
  })),
);
vi.mock("@/lib/booking-v2", () => ({
  isBookingV2Enabled: isBookingV2EnabledMock,
  listWeeklyTemplate: listWeeklyTemplateMock,
  replaceWeeklyTemplate: replaceWeeklyTemplateMock,
}));

const isRateLimitedMock = vi.hoisted(() =>
  vi.fn<() => Promise<boolean>>(async () => false),
);
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: isRateLimitedMock }));

// Admin client → professionals.email lookup for the flag key.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: { email: "a@b.com" } })),
    })),
  })),
}));

import { GET, PUT } from "@/app/api/advisor-portal/availability/route";

function putReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-portal/availability", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.1.1.1" },
  });
}
function getReq(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-portal/availability");
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdvisorSessionMock.mockResolvedValue(7);
  isBookingV2EnabledMock.mockResolvedValue(true);
  listWeeklyTemplateMock.mockResolvedValue([]);
  replaceWeeklyTemplateMock.mockResolvedValue({ ok: true, count: 1 });
  isRateLimitedMock.mockResolvedValue(false);
});

describe("GET /api/advisor-portal/availability", () => {
  it("401s when not authenticated", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(null);
    expect((await GET(getReq())).status).toBe(401);
  });

  it("reports enabled:false when the flag is off (dormant)", async () => {
    isBookingV2EnabledMock.mockResolvedValueOnce(false);
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.enabled).toBe(false);
    expect(json.rows).toEqual([]);
    // Must not read the template when disabled.
    expect(listWeeklyTemplateMock).not.toHaveBeenCalled();
  });

  it("returns the template when enabled", async () => {
    isBookingV2EnabledMock.mockResolvedValueOnce(true);
    listWeeklyTemplateMock.mockResolvedValueOnce([
      {
        id: 1,
        professional_id: 7,
        day_of_week: 1,
        start_time: "09:00:00",
        end_time: "17:00:00",
        slot_duration_minutes: 30,
        is_active: true,
      },
    ]);
    const res = await GET(getReq());
    const json = await res.json();
    expect(json.enabled).toBe(true);
    expect(json.rows).toHaveLength(1);
    expect(json.rows[0].dayOfWeek).toBe(1);
  });
});

describe("PUT /api/advisor-portal/availability", () => {
  it("401s when not authenticated", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(null);
    const res = await PUT(putReq({ rows: [] }));
    expect(res.status).toBe(401);
  });

  it("400s on an invalid time format (Zod)", async () => {
    const res = await PUT(
      putReq({ rows: [{ dayOfWeek: 1, startTime: "9am", endTime: "5pm", slotDurationMinutes: 30 }] }),
    );
    expect(res.status).toBe(400);
    expect(replaceWeeklyTemplateMock).not.toHaveBeenCalled();
  });

  it("403s when the flag is off (write blocked)", async () => {
    isBookingV2EnabledMock.mockResolvedValueOnce(false);
    const res = await PUT(putReq({ rows: [] }));
    expect(res.status).toBe(403);
    expect(replaceWeeklyTemplateMock).not.toHaveBeenCalled();
  });

  it("429s when rate-limited", async () => {
    isRateLimitedMock.mockResolvedValueOnce(true);
    const res = await PUT(putReq({ rows: [] }));
    expect(res.status).toBe(429);
  });

  it("saves a valid template", async () => {
    const res = await PUT(
      putReq({
        rows: [
          { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30, isActive: true },
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(replaceWeeklyTemplateMock).toHaveBeenCalledTimes(1);
  });

  it("maps a lib validation error to 400", async () => {
    replaceWeeklyTemplateMock.mockResolvedValueOnce({ ok: false, error: "invalid_time_range" });
    const res = await PUT(
      putReq({ rows: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30 }] }),
    );
    expect(res.status).toBe(400);
  });
});
