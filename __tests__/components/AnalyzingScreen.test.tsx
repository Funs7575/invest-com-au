import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "./setup";
import AnalyzingScreen from "@/app/get-matched/_components/AnalyzingScreen";

/** Toggle prefers-reduced-motion for a given test. */
function setReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

describe("AnalyzingScreen (G1 — real analyzing moment)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setReducedMotion(false);
  });
  afterEach(() => {
    act(() => vi.runOnlyPendingTimers());
    vi.useRealTimers();
  });

  it("renders all five generic engine stages when no result data", () => {
    render(<AnalyzingScreen onComplete={vi.fn()} />);
    expect(screen.getByText("Reading your answers")).toBeInTheDocument();
    expect(screen.getByText("Scoring platforms on your signals")).toBeInTheDocument();
    expect(screen.getByText("Ranking verified professionals")).toBeInTheDocument();
    expect(screen.getByText("Checking live supply")).toBeInTheDocument();
    expect(screen.getByText("Composing your plan")).toBeInTheDocument();
  });

  it("uses an aria-live polite region for the stage list", () => {
    const { container } = render(<AnalyzingScreen onComplete={vi.fn()} />);
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it("shows REAL counts when result data is supplied", () => {
    render(
      <AnalyzingScreen
        onComplete={vi.fn()}
        result={{
          top_matches: [
            { kind: "broker" },
            { kind: "broker" },
            { kind: "broker" },
          ],
          listing_matches: [{}, {}],
          match_explainer: { score: 88 },
        }}
      />,
    );
    expect(screen.getByText("Scored 3 platforms on your signals")).toBeInTheDocument();
    expect(screen.getByText("Found 2 matching listings")).toBeInTheDocument();
  });

  it("singularises counts of one", () => {
    render(
      <AnalyzingScreen
        onComplete={vi.fn()}
        result={{
          top_matches: [{ kind: "advisor" }],
          listing_matches: [{}],
          match_explainer: { score: 70 },
        }}
      />,
    );
    expect(screen.getByText("Ranked 1 verified professional")).toBeInTheDocument();
    expect(screen.getByText("Found 1 matching listing")).toBeInTheDocument();
  });

  it("fires onComplete after the ~2.6s dwell completes", () => {
    const onComplete = vi.fn();
    render(<AnalyzingScreen onComplete={onComplete} />);
    expect(onComplete).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("counts the score up to the target once stages finish", () => {
    render(
      <AnalyzingScreen
        onComplete={vi.fn()}
        result={{ top_matches: [], match_explainer: { score: 84 } }}
      />,
    );
    // Advance through all stages then the count-up ramp.
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByText("84")).toBeInTheDocument();
  });
});

describe("AnalyzingScreen — prefers-reduced-motion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setReducedMotion(true);
  });
  afterEach(() => {
    act(() => vi.runOnlyPendingTimers());
    vi.useRealTimers();
  });

  it("renders the list statically and fires onComplete after a short delay", () => {
    const onComplete = vi.fn();
    render(<AnalyzingScreen onComplete={onComplete} />);
    // All stages still rendered.
    expect(screen.getByText("Reading your answers")).toBeInTheDocument();
    expect(screen.getByText("Composing your plan")).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("shows the final score immediately without ramping", () => {
    act(() => {
      render(
        <AnalyzingScreen
          onComplete={vi.fn()}
          result={{ top_matches: [], match_explainer: { score: 91 } }}
        />,
      );
    });
    expect(screen.getByText("91")).toBeInTheDocument();
  });
});
