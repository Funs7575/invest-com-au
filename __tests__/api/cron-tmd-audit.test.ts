import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));
vi.mock("@/lib/cron-run-log", () => ({ wrapCronHandler: (_n: string, h: unknown) => h }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn(() => null) }));
vi.mock("@/lib/admin", () => ({ ADMIN_EMAIL: "admin@example.com" }));

const mockGetCurrentTmd = vi.fn();
vi.mock("@/lib/tmds", () => ({ getCurrentTmd: (...a: unknown[]) => mockGetCurrentTmd(...a) }));

const mockSendEmail = vi.fn((..._a: unknown[]) => Promise.resolve({ ok: true }));
vi.mock("@/lib/resend", () => ({ sendEmail: (...a: unknown[]) => mockSendEmail(...a) }));

interface Res { data?: unknown; error?: { message: string } | null }
const fromQueue: Res[] = [];
let fromIdx = 0;
function makeChain() {
  const res = fromQueue[fromIdx++] ?? { data: null };
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "upsert", "update"]) c[m] = vi.fn(() => c);
  c.then = (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
  return c;
}
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => makeChain() }),
}));

import { GET } from "@/app/api/cron/tmd-audit/route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/tmd-audit") as unknown as NextRequest;
}

describe("GET /api/cron/tmd-audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromQueue.length = 0;
    fromIdx = 0;
  });

  it("emails a compliance alert when an active product has no current TMD", async () => {
    fromQueue.push({ data: [{ slug: "stake", name: "Stake", status: "active" }] }); // brokers
    fromQueue.push({ data: null }); // data_integrity_issues upsert
    mockGetCurrentTmd.mockResolvedValue(null); // missing/expired
    const res = await GET(makeReq());
    const json = (await res.json()) as { missing_count: number };
    expect(json.missing_count).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "admin@example.com", bypassSuppression: true }),
    );
  });

  it("does not alert when every active product has a current TMD", async () => {
    fromQueue.push({ data: [{ slug: "stake", name: "Stake", status: "active" }] }); // brokers
    fromQueue.push({ data: null }); // clear-issue update
    mockGetCurrentTmd.mockResolvedValue({ id: 1, version: 2 });
    const res = await GET(makeReq());
    const json = (await res.json()) as { missing_count: number };
    expect(json.missing_count).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
