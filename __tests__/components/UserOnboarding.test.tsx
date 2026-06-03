import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import UserOnboarding from "@/components/UserOnboarding";

// Mutable nav holder so each test can set the current pathname. Wrapped in
// vi.hoisted so it's available inside the hoisted vi.mock factory.
const { nav } = vi.hoisted(() => ({ nav: { pathname: "/" } }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

const HEADLINE = /Find Your Perfect Broker/i;

describe("UserOnboarding — homepage-only, delayed welcome", () => {
  beforeEach(() => {
    localStorage.clear();
    nav.pathname = "/";
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does NOT auto-open on a deep-link / content page", () => {
    nav.pathname = "/advisors";
    render(<UserOnboarding />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText(HEADLINE)).toBeNull();
  });

  it("stays hidden on the homepage until the delay elapses, then opens", () => {
    nav.pathname = "/";
    render(<UserOnboarding />);
    // Hidden immediately — the hero should land first.
    expect(screen.queryByText(HEADLINE)).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1300);
    });
    expect(screen.queryByText(HEADLINE)).not.toBeNull();
  });

  it("does NOT open if the visitor has already seen it", () => {
    localStorage.setItem("user_onboarding_seen", "true");
    nav.pathname = "/";
    render(<UserOnboarding />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText(HEADLINE)).toBeNull();
  });
});
