// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockShowToast, mockShowRichToast, mockTrackEvent } = vi.hoisted(() => ({
  mockShowToast: vi.fn(),
  mockShowRichToast: vi.fn(),
  mockTrackEvent: vi.fn(),
}));

vi.mock("@/components/Toast", () => ({
  showToast: mockShowToast,
  showRichToast: mockShowRichToast,
}));
vi.mock("@/lib/tracking", () => ({ trackEvent: mockTrackEvent }));

import { celebrateMilestone, celebrateSave } from "@/lib/celebrate";

describe("celebrate", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockShowToast.mockClear();
    mockShowRichToast.mockClear();
    mockTrackEvent.mockClear();
  });

  it("celebrateMilestone fires the rich toast + analytics once, then goes silent", () => {
    expect(celebrateMilestone("first_compare")).toBe(true);
    expect(mockShowRichToast).toHaveBeenCalledTimes(1);
    expect(mockShowRichToast.mock.calls[0]?.[0]).toMatchObject({
      title: "Your first side-by-side",
    });
    expect(mockTrackEvent).toHaveBeenCalledWith("milestone_unlocked", {
      milestone: "first_compare",
    });

    expect(celebrateMilestone("first_compare")).toBe(false);
    expect(mockShowRichToast).toHaveBeenCalledTimes(1);
  });

  it("first save ever gets the milestone moment with the my-saves action", () => {
    celebrateSave({ saved: true, label: "Stake" });
    expect(mockShowRichToast).toHaveBeenCalledTimes(1);
    expect(mockShowRichToast.mock.calls[0]?.[0]).toMatchObject({
      actionHref: "/account/my-saves",
      milestone: true,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith("save_first", {});
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("subsequent saves get the light toast with the label", () => {
    celebrateSave({ saved: true, label: "Stake" });
    celebrateSave({ saved: true, label: "CommSec" });
    expect(mockShowRichToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith("Saved — CommSec");
  });

  it("removal is acknowledged lightly and never counts as a milestone", () => {
    celebrateSave({ saved: false, label: "Stake" });
    expect(mockShowToast).toHaveBeenCalledWith("Removed Stake");
    expect(mockShowRichToast).not.toHaveBeenCalled();
  });
});
