import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "./setup";
import { fireEvent } from "@testing-library/react";
import WhatIfPanel from "@/app/get-matched/_components/WhatIfPanel";

/**
 * G4 — what-if panel basics: expand, debounced change emission, reset
 * visibility. Debounce uses fake timers (~400ms).
 */

const baseProps = {
  budget: "10k_100k" as string | null,
  timeline: "now" as string | null,
  help: "compare" as string | null,
  busy: false,
  isWhatIf: false,
  error: null as string | null,
  onChange: vi.fn(),
  onReset: vi.fn(),
};

describe("WhatIfPanel (G4)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    baseProps.onChange = vi.fn();
    baseProps.onReset = vi.fn();
  });
  afterEach(() => {
    act(() => vi.runOnlyPendingTimers());
    vi.useRealTimers();
  });

  function open() {
    fireEvent.click(screen.getByRole("button", { name: /play with your plan/i }));
  }

  it("is collapsed by default and expands on click", () => {
    render(<WhatIfPanel {...baseProps} />);
    expect(screen.queryByText("Budget")).not.toBeInTheDocument();
    open();
    expect(screen.getByText("Budget")).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText("How much help")).toBeInTheDocument();
  });

  it("debounces a control change ~400ms then emits onChange with from/to", () => {
    const onChange = vi.fn();
    render(<WhatIfPanel {...baseProps} onChange={onChange} />);
    open();
    fireEvent.click(screen.getByRole("button", { name: "A$100k–$500k" }));
    // Not fired immediately.
    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(400));
    expect(onChange).toHaveBeenCalledWith("budget", "10k_100k", "100k_500k");
  });

  it("collapses rapid changes into a single trailing emission", () => {
    const onChange = vi.fn();
    render(<WhatIfPanel {...baseProps} onChange={onChange} />);
    open();
    fireEvent.click(screen.getByRole("button", { name: "A$100k–$500k" }));
    act(() => vi.advanceTimersByTime(100));
    fireEvent.click(screen.getByRole("button", { name: "A$500k–$1m" }));
    act(() => vi.advanceTimersByTime(400));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("budget", "10k_100k", "500k_1m");
  });

  it("does not emit when the chosen value equals the current one", () => {
    const onChange = vi.fn();
    render(<WhatIfPanel {...baseProps} budget="10k_100k" onChange={onChange} />);
    open();
    fireEvent.click(screen.getByRole("button", { name: "A$10k–$100k" }));
    act(() => vi.advanceTimersByTime(400));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows Reset only when a what-if result is active", () => {
    const { rerender } = render(<WhatIfPanel {...baseProps} isWhatIf={false} />);
    open();
    expect(
      screen.queryByRole("button", { name: /reset to my answers/i }),
    ).not.toBeInTheDocument();
    rerender(<WhatIfPanel {...baseProps} isWhatIf={true} />);
    const reset = screen.getByRole("button", { name: /reset to my answers/i });
    fireEvent.click(reset);
    expect(baseProps.onReset).toHaveBeenCalledTimes(1);
  });

  it("shows recalculating shimmer label while busy and hides reset", () => {
    render(<WhatIfPanel {...baseProps} busy isWhatIf />);
    open();
    expect(screen.getByText(/recalculating/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /reset to my answers/i }),
    ).not.toBeInTheDocument();
  });

  it("renders an inline error note", () => {
    render(<WhatIfPanel {...baseProps} error="Could not recalculate." />);
    open();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not recalculate.");
  });
});
