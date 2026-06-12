// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { mockTrackEvent } = vi.hoisted(() => ({ mockTrackEvent: vi.fn() }));
vi.mock("@/lib/tracking", () => ({ trackEvent: mockTrackEvent }));

import SinceYouWereHere from "@/components/SinceYouWereHere";

const DAY = 24 * 60 * 60 * 1000;

function seedMemory(entries: { slug: string; name: string; asx: number | null; ts: number }[]) {
  window.localStorage.setItem("iv_fee_memory", JSON.stringify(entries));
}

function stubFees(brokers: { slug: string; name: string; asx_fee_value: number | null }[]) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ brokers }),
  }) as unknown as typeof fetch;
}

describe("SinceYouWereHere (Northstar D10)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockTrackEvent.mockClear();
  });

  it("reports a factual fee change on a previously-viewed broker", async () => {
    seedMemory([{ slug: "stake", name: "Stake", asx: 10, ts: Date.now() - 2 * DAY }]);
    stubFees([{ slug: "stake", name: "Stake", asx_fee_value: 5 }]);
    render(<SinceYouWereHere />);
    await waitFor(() => expect(screen.getByText(/Since you were here/i)).toBeTruthy());
    expect(screen.getByText("$10")).toBeTruthy();
    expect(screen.getByText("$5")).toBeTruthy();
    expect(mockTrackEvent).toHaveBeenCalledWith("delta_strip_shown", { changes: 1 });
  });

  it("renders nothing when nothing changed — the memory never invents news", async () => {
    seedMemory([{ slug: "stake", name: "Stake", asx: 10, ts: Date.now() - 2 * DAY }]);
    stubFees([{ slug: "stake", name: "Stake", asx_fee_value: 10 }]);
    const { container } = render(<SinceYouWereHere />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it("ignores views younger than a day (no fetch at all)", () => {
    seedMemory([{ slug: "stake", name: "Stake", asx: 10, ts: Date.now() - 60_000 }]);
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const { container } = render(<SinceYouWereHere />);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(container.firstChild).toBeNull();
  });

  it("dismiss re-baselines the stored value so a change shows once", async () => {
    seedMemory([{ slug: "stake", name: "Stake", asx: 10, ts: Date.now() - 2 * DAY }]);
    stubFees([{ slug: "stake", name: "Stake", asx_fee_value: 5 }]);
    render(<SinceYouWereHere />);
    await waitFor(() => expect(screen.getByText(/Since you were here/i)).toBeTruthy());
    screen.getByRole("button", { name: "Dismiss" }).click();
    await waitFor(() => expect(screen.queryByText(/Since you were here/i)).toBeNull());
    const stored = JSON.parse(window.localStorage.getItem("iv_fee_memory") ?? "[]") as {
      asx: number;
    }[];
    expect(stored[0]?.asx).toBe(5);
  });
});
