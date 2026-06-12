// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

const { mockTrackEvent } = vi.hoisted(() => ({ mockTrackEvent: vi.fn() }));
vi.mock("@/lib/tracking", () => ({ trackEvent: mockTrackEvent }));
vi.mock("@/lib/hooks/useUser", () => ({ useUser: () => ({ user: null, loading: false }) }));

import ShortlistReadySheet from "@/components/ShortlistReadySheet";
import { SHORTLIST_READY_EVENT } from "@/components/ShortlistButton";

describe("ShortlistReadySheet (D2)", () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
  });

  it("renders nothing until the ready event fires", () => {
    render(<ShortlistReadySheet />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens with the compare CTA pointing at the saved slugs", () => {
    render(<ShortlistReadySheet />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(SHORTLIST_READY_EVENT, { detail: ["stake", "commsec", "pearler"] }),
      );
    });
    expect(screen.getByRole("dialog", { name: "Three's a shortlist" })).toBeTruthy();
    const cta = screen.getByRole("link", { name: "Compare your 3" });
    expect(cta.getAttribute("href")).toBe("/shortlist/compare?brokers=stake,commsec,pearler");
    expect(mockTrackEvent).toHaveBeenCalledWith("shortlist_ready_shown", { count: 3 });
  });

  it("offers the anonymous keep-it line (signed-out)", () => {
    render(<ShortlistReadySheet />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(SHORTLIST_READY_EVENT, { detail: ["a", "b", "c"] }),
      );
    });
    expect(screen.getByText(/free account keeps this shortlist/i)).toBeTruthy();
  });

  it("dismisses via Keep browsing", () => {
    render(<ShortlistReadySheet />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(SHORTLIST_READY_EVENT, { detail: ["a", "b", "c"] }),
      );
    });
    act(() => {
      screen.getByRole("button", { name: "Keep browsing" }).click();
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ignores malformed events", () => {
    render(<ShortlistReadySheet />);
    act(() => {
      window.dispatchEvent(new CustomEvent(SHORTLIST_READY_EVENT, { detail: "junk" }));
      window.dispatchEvent(new CustomEvent(SHORTLIST_READY_EVENT, { detail: ["one", "two"] }));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
