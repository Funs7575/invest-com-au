import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "./setup";
import SocialProofCounter from "@/components/SocialProofCounter";

describe("SocialProofCounter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Pin to a midday local time so the bell-curve baseline is comfortably above the floor.
    // 2026-06-15 13:00 local (dayOfMonth = 15).
    vi.setSystemTime(new Date(2026, 5, 15, 13, 0, 0));
    // Fire-and-forget fetch — resolve with an empty object.
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({} as Response)),
    );
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("calls fetch('/api/track-event', POST) once on mount and does not throw if fetch rejects", async () => {
    // Override fetch to reject — the component must swallow the error.
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.reject(new Error("network down")),
    );

    expect(() => render(<SocialProofCounter />)).not.toThrow();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/track-event");
    expect(init).toMatchObject({ method: "POST" });
  });

  it("renders the inline variant <p> with the deterministic count text after the effect runs", () => {
    render(<SocialProofCounter />);

    // The mount effect sets the count synchronously; render() flushes effects in act().
    expect(
      screen.getByText(/\d+ investors compared platforms today/),
    ).toBeInTheDocument();

    const p = screen.getByText(/investors compared platforms today/);
    expect(p.tagName).toBe("P");
    const match = p.textContent?.match(/(\d+) investors compared platforms today/);
    expect(match).not.toBeNull();
    const count = Number(match![1]);
    expect(count).toBeGreaterThanOrEqual(8);
  });

  it("renders the badge variant text and the live-dot ping span", () => {
    const { container } = render(<SocialProofCounter variant="badge" />);

    expect(
      screen.getByText(/investors comparing today/),
    ).toBeInTheDocument();

    // The animated live dot uses an animate-ping span.
    expect(container.querySelector(".animate-ping")).not.toBeNull();
  });

  it("clamps the rendered count to a floor of >= 8 even when the time-based baseline would be tiny", () => {
    // Pin to just after midnight: sin(~0) -> baseLine clamps to 12; dayOfMonth chosen so variance is most negative.
    // variance = ((dayOfMonth * 7) % 23) - 11. dayOfMonth=22 -> (154 % 23)=16 -> 5. Pick a day giving min.
    // dayOfMonth=21 -> (147 % 23)=9 -> -2; dayOfMonth=20 -> (140 % 23)=2 -> -9; dayOfMonth=27 -> (189 % 23)=4 -> -7.
    // baseLine floor is 12; min variance is -11 -> 12 + (-11) = 1 -> clamped to 8. Find a day with variance -11:
    // need (d*7 % 23) === 0 -> d=23 -> (161 % 23)=0 -> variance -11. baseLine 12 + (-11) = 1 -> floor 8.
    vi.setSystemTime(new Date(2026, 5, 23, 0, 1, 0));

    render(<SocialProofCounter />);

    const p = screen.getByText(/investors compared platforms today/);
    const count = Number(
      p.textContent!.match(/(\d+) investors compared platforms today/)![1],
    );
    expect(count).toBeGreaterThanOrEqual(8);
  });
});
