import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const requireAdvisorSessionMock = vi.hoisted(() =>
  vi.fn<() => Promise<number | null>>(async () => 3),
);
vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: requireAdvisorSessionMock,
}));

const isOnTeamMock = vi.hoisted(() => vi.fn<() => Promise<boolean>>(async () => false));
vi.mock("@/lib/expert-teams", () => ({ isProfessionalOnTeam: isOnTeamMock }));

const isAllowedMock = vi.hoisted(() => vi.fn<() => Promise<boolean>>(async () => true));
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: isAllowedMock,
  ipKey: () => "ip",
}));

const isBookingV2EnabledMock = vi.hoisted(() => vi.fn<() => Promise<boolean>>(async () => true));
const createProposalAppointmentsMock = vi.hoisted(() =>
  vi.fn<
    () => Promise<{
      ok: boolean;
      error?: string;
      created: { id: number; startsAt: string; endsAt: string }[];
    }>
  >(async () => ({
    ok: true,
    created: [
      { id: 1, startsAt: "2026-06-13T04:00:00.000Z", endsAt: "2026-06-13T04:30:00.000Z" },
      { id: 2, startsAt: "2026-06-13T05:00:00.000Z", endsAt: "2026-06-13T05:30:00.000Z" },
    ],
  })),
);
vi.mock("@/lib/booking-v2", () => ({
  isBookingV2Enabled: isBookingV2EnabledMock,
  createProposalAppointments: createProposalAppointmentsMock,
}));

const sendMessageMock = vi.hoisted(() =>
  vi.fn(async () => ({ id: 99, body: "x", metadata: { kind: "propose_times" } })),
);
vi.mock("@/lib/brief-messages", () => {
  class BriefMessageError extends Error {
    status: number;
    constructor(m: string, s: number) {
      super(m);
      this.status = s;
    }
  }
  return { sendMessage: sendMessageMock, BriefMessageError };
});

// Admin client → brief lookup.
const briefResult = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => briefResult.current),
    })),
  })),
}));

import { POST } from "@/app/api/briefs/[slug]/propose-times/route";

const FUTURE = new Date(Date.now() + 86_400_000).toISOString();

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/briefs/x/propose-times", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}
const ctx = { params: Promise.resolve({ slug: "my-brief" }) };

const ACCEPTED_BRIEF = {
  data: {
    id: 10,
    accepted_at: "2026-06-01T00:00:00Z",
    accepted_by_professional_id: 3,
    accepted_by_team_id: null,
    lead_id: 55,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  requireAdvisorSessionMock.mockResolvedValue(3);
  isOnTeamMock.mockResolvedValue(false);
  isAllowedMock.mockResolvedValue(true);
  isBookingV2EnabledMock.mockResolvedValue(true);
  briefResult.current = ACCEPTED_BRIEF;
  createProposalAppointmentsMock.mockResolvedValue({
    ok: true,
    created: [
      { id: 1, startsAt: FUTURE, endsAt: FUTURE },
      { id: 2, startsAt: FUTURE, endsAt: FUTURE },
    ],
  });
});

describe("POST /api/briefs/[slug]/propose-times", () => {
  it("429s when rate-limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    const res = await POST(postReq({ slots: [{ startsAt: FUTURE, durationMinutes: 30 }] }), ctx);
    expect(res.status).toBe(429);
  });

  it("400s on an invalid body (no slots)", async () => {
    const res = await POST(postReq({ slots: [] }), ctx);
    expect(res.status).toBe(400);
  });

  it("404s when the brief is missing", async () => {
    briefResult.current = { data: null };
    const res = await POST(postReq({ slots: [{ startsAt: FUTURE, durationMinutes: 30 }] }), ctx);
    expect(res.status).toBe(404);
  });

  it("409s when the brief is not accepted", async () => {
    briefResult.current = { data: { ...ACCEPTED_BRIEF.data, accepted_at: null } };
    const res = await POST(postReq({ slots: [{ startsAt: FUTURE, durationMinutes: 30 }] }), ctx);
    expect(res.status).toBe(409);
  });

  it("401s when no advisor session", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(null);
    const res = await POST(postReq({ slots: [{ startsAt: FUTURE, durationMinutes: 30 }] }), ctx);
    expect(res.status).toBe(401);
  });

  it("403s when the advisor is not the accepting pro", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(999);
    const res = await POST(postReq({ slots: [{ startsAt: FUTURE, durationMinutes: 30 }] }), ctx);
    expect(res.status).toBe(403);
  });

  it("403s when the booking_v2 flag is off (fail-closed)", async () => {
    isBookingV2EnabledMock.mockResolvedValueOnce(false);
    const res = await POST(postReq({ slots: [{ startsAt: FUTURE, durationMinutes: 30 }] }), ctx);
    expect(res.status).toBe(403);
    expect(createProposalAppointmentsMock).not.toHaveBeenCalled();
  });

  it("creates the proposal and posts a chat message with the payload", async () => {
    const res = await POST(
      postReq({ slots: [{ startsAt: FUTURE, durationMinutes: 30 }, { startsAt: FUTURE, durationMinutes: 30 }] }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(createProposalAppointmentsMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    const sendCalls = sendMessageMock.mock.calls as unknown as Array<
      [{ metadata: { kind: string; appointmentIds: number[] } }]
    >;
    const sendArgs = sendCalls[0]![0];
    expect(sendArgs.metadata.kind).toBe("propose_times");
    expect(sendArgs.metadata.appointmentIds).toEqual([1, 2]);
  });
});
