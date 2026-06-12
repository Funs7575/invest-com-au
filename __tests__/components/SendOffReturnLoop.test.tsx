// @vitest-environment jsdom
/* eslint-disable @next/next/no-html-link-for-pages -- the component under
   test is a delegated DOM click listener; the fixtures must be raw anchors */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const { mockTrackEvent, mockShowToast, mockCelebrateMilestone, mockPathname } = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
  mockShowToast: vi.fn(),
  mockCelebrateMilestone: vi.fn(),
  mockPathname: { value: "/" },
}));

vi.mock("@/lib/tracking", () => ({ trackEvent: mockTrackEvent }));
vi.mock("@/components/Toast", () => ({ showToast: mockShowToast }));
vi.mock("@/lib/celebrate", () => ({ celebrateMilestone: mockCelebrateMilestone }));
vi.mock("next/navigation", () => ({ usePathname: () => mockPathname.value }));

import SendOffReturnLoop from "@/components/SendOffReturnLoop";

const STAMP_KEY = "iv_last_outbound";

describe("SendOffReturnLoop (D3)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockTrackEvent.mockClear();
    mockShowToast.mockClear();
    mockCelebrateMilestone.mockClear();
    mockPathname.value = "/";
    vi.useRealTimers();
  });

  it("acknowledges a /go/ click and stamps the departure", () => {
    render(
      <div>
        <SendOffReturnLoop />
        <a href="/go/stake">Open account</a>
      </div>,
    );
    fireEvent.click(screen.getByText("Open account"));
    expect(mockShowToast).toHaveBeenCalledWith(
      "Off to Stake — your comparison stays right here",
      "info",
      3000,
    );
    const stamp = JSON.parse(window.localStorage.getItem(STAMP_KEY) ?? "{}");
    expect(stamp.slug).toBe("stake");
    expect(mockTrackEvent).toHaveBeenCalledWith("sendoff_shown", { broker: "stake" });
  });

  it("ignores non-affiliate links", () => {
    render(
      <div>
        <SendOffReturnLoop />
        <a href="/broker/stake">Review</a>
      </div>,
    );
    fireEvent.click(screen.getByText("Review"));
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(STAMP_KEY)).toBeNull();
  });

  it("asks how it went on return ≥1h later, and 'opened' celebrates the decision", () => {
    vi.useFakeTimers();
    window.localStorage.setItem(
      STAMP_KEY,
      JSON.stringify({ slug: "stake", ts: Date.now() - 2 * 60 * 60 * 1000 }),
    );
    render(<SendOffReturnLoop />);
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(screen.getByText("How did it go with Stake?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Opened an account" }));
    expect(mockCelebrateMilestone).toHaveBeenCalledWith("decided_broker");
    expect(mockTrackEvent).toHaveBeenCalledWith("return_after_go_answered", {
      broker: "stake",
      answer: "opened",
    });
    const stamp = JSON.parse(window.localStorage.getItem(STAMP_KEY) ?? "{}");
    expect(stamp.answered).toBe(true);
  });

  it("stays silent within the first hour (they may just be tab-switching)", () => {
    vi.useFakeTimers();
    window.localStorage.setItem(
      STAMP_KEY,
      JSON.stringify({ slug: "stake", ts: Date.now() - 5 * 60 * 1000 }),
    );
    render(<SendOffReturnLoop />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText(/How did it go/)).toBeNull();
  });

  it("never re-asks after an answer", () => {
    vi.useFakeTimers();
    window.localStorage.setItem(
      STAMP_KEY,
      JSON.stringify({ slug: "stake", ts: Date.now() - 2 * 60 * 60 * 1000, answered: true }),
    );
    render(<SendOffReturnLoop />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText(/How did it go/)).toBeNull();
  });

  it("only prompts on / and /compare", () => {
    vi.useFakeTimers();
    mockPathname.value = "/articles";
    window.localStorage.setItem(
      STAMP_KEY,
      JSON.stringify({ slug: "stake", ts: Date.now() - 2 * 60 * 60 * 1000 }),
    );
    render(<SendOffReturnLoop />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText(/How did it go/)).toBeNull();
  });
});
