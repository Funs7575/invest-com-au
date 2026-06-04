/**
 * @vitest-environment jsdom
 *
 * Auth-ordering regression test for app/account/plans/[id]/page.tsx.
 *
 * The page must run the session check (getUser -> redirect to login) BEFORE it
 * validates the id and calls notFound(). Previously a non-numeric id triggered
 * notFound() ahead of the auth check, so an anonymous visitor with a bad id got
 * a 404 instead of being sent to login with a ?next param.
 *
 * Finding: Campaign 3 P3 — "plans detail page runs id validation/notFound()
 * before the session check" (Tier A).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockGetPlanById, mockRedirect, mockNotFound } = vi.hoisted(
  () => ({
    mockGetUser: vi.fn(),
    mockGetPlanById: vi.fn(),
    mockRedirect: vi.fn((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    }),
    mockNotFound: vi.fn(() => {
      throw new Error("NOT_FOUND");
    }),
  }),
);

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  notFound: mockNotFound,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock("@/lib/getmatched/action-plans", () => ({
  getPlanById: mockGetPlanById,
}));

vi.mock("@/lib/getmatched/templates", () => ({
  getResultTemplate: vi.fn().mockResolvedValue(null),
}));

import MyPlanDetailPage from "@/app/account/plans/[id]/page";

const VIEWER_UUID = "33333333-3333-3333-3333-333333333333";
const OTHER_UUID = "44444444-4444-4444-4444-444444444444";

function renderPage(id: string) {
  return MyPlanDetailPage({ params: Promise.resolve({ id }) });
}

describe("account plans/[id] auth ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    });
    mockNotFound.mockImplementation(() => {
      throw new Error("NOT_FOUND");
    });
  });

  it("redirects anonymous visitors to login even when the id is non-numeric", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(renderPage("not-a-number")).rejects.toThrow(
      "REDIRECT:/auth/login?next=/account/plans/not-a-number",
    );

    expect(mockNotFound).not.toHaveBeenCalled();
    // Must not reach the data layer before authenticating.
    expect(mockGetPlanById).not.toHaveBeenCalled();
  });

  it("redirects anonymous visitors to login for a valid numeric id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(renderPage("42")).rejects.toThrow(
      "REDIRECT:/auth/login?next=/account/plans/42",
    );
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("returns notFound for an authenticated visitor with a non-numeric id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: VIEWER_UUID } } });

    await expect(renderPage("not-a-number")).rejects.toThrow("NOT_FOUND");
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockGetPlanById).not.toHaveBeenCalled();
  });

  it("returns notFound when the plan belongs to a different user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: VIEWER_UUID } } });
    mockGetPlanById.mockResolvedValue({
      id: 42,
      auth_user_id: OTHER_UUID,
      route: null,
      checklist: [],
      help_needed: [],
    });

    await expect(renderPage("42")).rejects.toThrow("NOT_FOUND");
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockGetPlanById).toHaveBeenCalledWith(42);
  });
});
