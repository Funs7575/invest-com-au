import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(async () => ({ data: { user: { id: "user-1" } as { id: string } | null } })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(),
  })),
}));

const { mockLoad, mockSave } = vi.hoisted(() => ({
  mockLoad: vi.fn(async () => ({ state: "NSW", age: 40 })),
  mockSave: vi.fn(async () => true),
}));
vi.mock("@/lib/money-profile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/money-profile")>();
  return {
    ...actual,
    loadMoneyProfileForUser: mockLoad,
    saveMoneyMeta: mockSave,
  };
});

import { GET, PATCH } from "@/app/api/account/money-profile/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/account/money-profile", {
    method: body === undefined ? "GET" : "PATCH",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/account/money-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockLoad.mockResolvedValue({ state: "NSW", age: 40 });
    mockSave.mockResolvedValue(true);
  });

  it("GET requires auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns profile + coverage", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile).toMatchObject({ state: "NSW", age: 40 });
    expect(json.coverage).toBeTruthy();
  });

  it("PATCH requires auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PATCH(makeReq({ age: 41 }));
    expect(res.status).toBe(401);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("PATCH rejects out-of-range values", async () => {
    const res = await PATCH(makeReq({ age: 12 }));
    expect(res.status).toBe(400);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("PATCH rejects an unknown state", async () => {
    const res = await PATCH(makeReq({ state: "ZZ" }));
    expect(res.status).toBe(400);
  });

  it("PATCH saves, normalising '' to null and skipping undefined keys", async () => {
    const res = await PATCH(makeReq({ state: "", age: 41 }));
    expect(res.status).toBe(200);
    expect(mockSave).toHaveBeenCalledWith("user-1", { state: null, age: 41 });
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("PATCH surfaces save failures as 500", async () => {
    mockSave.mockResolvedValue(false);
    const res = await PATCH(makeReq({ age: 41 }));
    expect(res.status).toBe(500);
  });
});
