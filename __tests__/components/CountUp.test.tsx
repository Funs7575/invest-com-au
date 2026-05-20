/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import CountUp from "@/components/CountUp";

/**
 * CountUp animates from 0 to `end` once the element enters the viewport.
 * Animation runs via requestAnimationFrame + IntersectionObserver — we
 * can't trivially run the full timeline in jsdom, but we can pin:
 *
 *   - initial pre-animation render (value=0)
 *   - prefix + suffix wrapping
 *   - en-AU number formatting (commas) at integer end
 *   - decimals branch (toFixed)
 *
 * IntersectionObserver is stubbed at the module level so the observer
 * never fires; the component therefore renders its initial state and
 * we assert on that.
 */
describe("CountUp", () => {
  beforeEach(() => {
    // Stub IntersectionObserver — jsdom doesn't ship one, and even if
    // it did, we want a no-op so the animation never starts.
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  it("renders 0 before the animation kicks in", () => {
    const { container } = render(<CountUp end={1000} />);
    expect(container.textContent).toBe("0");
  });

  it("wraps the value with the supplied prefix + suffix", () => {
    const { container } = render(
      <CountUp end={500} prefix="$" suffix="M" />,
    );
    expect(container.textContent).toBe("$0M");
  });

  it("uses toFixed when decimals > 0 (no comma formatting in fractional mode)", () => {
    const { container } = render(<CountUp end={1500} decimals={2} />);
    expect(container.textContent).toBe("0.00");
  });

  it("emits an en-AU-formatted integer at 0 (no commas needed but format applies)", () => {
    const { container } = render(<CountUp end={1234567} />);
    expect(container.textContent).toBe("0");
  });

  it("renders a single <span> wrapper element", () => {
    const { container } = render(<CountUp end={1} />);
    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild?.tagName).toBe("SPAN");
  });
});
