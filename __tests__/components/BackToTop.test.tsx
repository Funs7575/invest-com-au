import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "./setup";
import BackToTop from "@/components/BackToTop";

describe("BackToTop", () => {
  const originalScrollTo = window.scrollTo;

  beforeEach(() => {
    // Reset scroll position + document height
    Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 2800, // 2000px scrollable past viewport
      configurable: true,
    });
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  });

  afterEach(() => {
    window.scrollTo = originalScrollTo;
  });

  it("does not render when scroll position is below the 400px threshold", () => {
    const { container } = render(<BackToTop />);
    // scrollY starts at 0; initial render has visible=false
    expect(container.firstChild).toBeNull();
  });

  it("renders when scroll position crosses the threshold", () => {
    render(<BackToTop />);
    act(() => {
      Object.defineProperty(window, "scrollY", { value: 401, writable: true, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByLabelText("Back to top")).toBeInTheDocument();
  });

  it("calls window.scrollTo({top:0, behavior:'smooth'}) on click", () => {
    render(<BackToTop />);
    act(() => {
      Object.defineProperty(window, "scrollY", { value: 500, writable: true, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    screen.getByLabelText("Back to top").click();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("renders a progress ring (two circles)", () => {
    const { container } = render(<BackToTop />);
    act(() => {
      Object.defineProperty(window, "scrollY", { value: 1000, writable: true, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    const circles = container.querySelectorAll("circle");
    // background circle + progress circle
    expect(circles).toHaveLength(2);
  });

  it("cleans up its scroll listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<BackToTop />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
    removeSpy.mockRestore();
  });

  it("handles a zero-height page (no scroll room) without dividing by zero", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 800, // same as innerHeight → docHeight = 0
      configurable: true,
    });
    render(<BackToTop />);
    act(() => {
      Object.defineProperty(window, "scrollY", { value: 500, writable: true, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    // Should still render at 500px past threshold
    expect(screen.getByLabelText("Back to top")).toBeInTheDocument();
  });
});
