// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ArrivalSequence from "@/components/onboarding/ArrivalSequence";

function stubMatchMedia(reduce: boolean) {
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

describe("ArrivalSequence (D4)", () => {
  it("assembles the home from the user's own answers", () => {
    stubMatchMedia(false);
    render(
      <ArrivalSequence
        name="Maya"
        interests={["etfs", "shares"]}
        experience="beginner"
        goal="growth"
        onDone={() => {}}
      />,
    );
    expect(screen.getByText("Maya, this is yours now.")).toBeTruthy();
    expect(screen.getByText("ETFs · Shares")).toBeTruthy();
    expect(screen.getByText("Beginner · Growth")).toBeTruthy();
    expect(screen.getByText(/every decision stays yours/i)).toBeTruthy();
  });

  it("the CTA and Skip both finish exactly once", () => {
    stubMatchMedia(false);
    const onDone = vi.fn();
    render(
      <ArrivalSequence name={null} interests={[]} experience={null} goal={null} onDone={onDone} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open my home" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("auto-advances after the choreography (motion allowed)", () => {
    vi.useFakeTimers();
    stubMatchMedia(false);
    const onDone = vi.fn();
    render(
      <ArrivalSequence name={null} interests={[]} experience={null} goal={null} onDone={onDone} />,
    );
    vi.advanceTimersByTime(5000);
    expect(onDone).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("never auto-advances under reduced motion — waits for the button", () => {
    vi.useFakeTimers();
    stubMatchMedia(true);
    const onDone = vi.fn();
    render(
      <ArrivalSequence name={null} interests={[]} experience={null} goal={null} onDone={onDone} />,
    );
    vi.advanceTimersByTime(10000);
    expect(onDone).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("handles empty interests with the broad-focus line", () => {
    stubMatchMedia(false);
    render(
      <ArrivalSequence name={null} interests={[]} experience={null} goal={null} onDone={() => {}} />,
    );
    expect(screen.getByText(/we'll follow what you explore/i)).toBeTruthy();
  });
});
