import { describe, it, expect, vi, beforeEach } from "vitest";

// classifier-config hits Supabase — stub both helpers. getThreshold returns
// the caller's default unless a test overrides mockHoldAll.
const { mockHoldAll, mockFeatureDisabled } = vi.hoisted(() => ({
  mockHoldAll: vi.fn<() => number | undefined>(() => undefined),
  mockFeatureDisabled: vi.fn(() => Promise.resolve(false)),
}));
vi.mock("@/lib/admin/classifier-config", () => ({
  getThreshold: vi.fn((_classifier: string, _name: string, fallback: number) =>
    Promise.resolve(mockHoldAll() ?? fallback),
  ),
  isFeatureDisabled: () => mockFeatureDisabled(),
}));

import {
  autoModerationReason,
  gateForumContent,
  isAutoModerationReason,
  isCommunityPostingDisabled,
} from "@/lib/community/moderation";

const CLEAN_BODY =
  "I have been comparing a few brokerage platforms for ASX shares and wanted to hear what fees others are actually paying. My current platform charges flat brokerage but the FX spread on US trades seems high.";

describe("gateForumContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHoldAll.mockReturnValue(undefined);
  });

  it("publishes clean discussion content", async () => {
    const result = await gateForumContent({
      kind: "thread",
      title: "What brokerage fees are you actually paying?",
      body: CLEAN_BODY,
    });
    expect(result.action).toBe("publish");
  });

  it("publishes short conversational forum replies", async () => {
    const result = await gateForumContent({ kind: "post", body: "Thanks, that helped a lot!" });
    expect(result.action).toBe("publish");
  });

  it("holds forward-looking return promises (ASIC escalation)", async () => {
    const result = await gateForumContent({
      kind: "post",
      body: "Just buy in now — this strategy is guaranteed to return 15% a year, can't lose.",
    });
    expect(result.action).toBe("hold");
    expect(result.reasons.join(",")).toMatch(/forward_looking|guaranteed/);
  });

  it("holds defamation-risk accusations for human review", async () => {
    const result = await gateForumContent({
      kind: "post",
      body: "This platform scammed me out of my deposit and the directors are criminals who stole my money.",
    });
    expect(result.action).toBe("hold");
  });

  it("rejects explicit scam terminology outright", async () => {
    const result = await gateForumContent({
      kind: "thread",
      title: "Great opportunity",
      body: "Join my pyramid scheme group, it works like a ponzi but legal, message me for the link.",
    });
    expect(result.action).toBe("reject");
  });

  it("holds everything when forum_moderation.hold_all is set (raid mode)", async () => {
    mockHoldAll.mockReturnValue(1);
    const result = await gateForumContent({
      kind: "thread",
      title: "What brokerage fees are you actually paying?",
      body: CLEAN_BODY,
    });
    expect(result.action).toBe("hold");
    expect(result.reasons).toContain("hold_all_active");
  });
});

describe("kill switch + queue-reason helpers", () => {
  it("isCommunityPostingDisabled proxies the automation kill switch", async () => {
    mockFeatureDisabled.mockResolvedValueOnce(true);
    expect(await isCommunityPostingDisabled()).toBe(true);
    expect(await isCommunityPostingDisabled()).toBe(false);
  });

  it("autoModerationReason prefixes and caps at the column limit (500)", () => {
    const reason = autoModerationReason(["a".repeat(600)]);
    expect(reason.startsWith("auto_moderation:")).toBe(true);
    expect(reason.length).toBeLessThanOrEqual(500);
  });

  it("isAutoModerationReason distinguishes system holds from user reports", () => {
    expect(isAutoModerationReason("auto_moderation:spam")).toBe(true);
    expect(isAutoModerationReason("this post is offensive")).toBe(false);
    expect(isAutoModerationReason(null)).toBe(false);
  });
});
