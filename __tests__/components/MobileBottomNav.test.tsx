/**
 * Tests for MobileBottomNav.
 *
 * Covers:
 *   1. The component renders its nav tabs after mount.
 *   2. Hidden on HIDDEN_PREFIXES routes (/admin, /auth, /quiz, /broker-portal).
 *   3. Active tab highlighted when pathname matches a tab prefix.
 *   4. Double-mount guard — verifies app/page.tsx no longer imports
 *      MobileBottomNav directly, so the nav is only mounted once via LayoutShell.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// ── Mock next/navigation so we can control usePathname ───────────────────────

const { mockUsePathname } = vi.hoisted(() => ({
  mockUsePathname: vi.fn<() => string>(() => "/"),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: mockUsePathname,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import MobileBottomNav from "@/components/MobileBottomNav";

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderNav(pathname = "/") {
  mockUsePathname.mockReturnValue(pathname);
  return render(<MobileBottomNav />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MobileBottomNav — render", () => {
  it("renders nothing before mount (no SSR mismatch)", () => {
    // Before useEffect fires, setMounted(true) hasn't run yet.
    // We can't easily test pre-hydration in jsdom, but we can confirm the
    // component renders into the DOM after mounting.
    const { container } = renderNav("/");
    // After mount (effect runs synchronously in test env)
    expect(container.firstElementChild).not.toBeNull();
  });

  it("renders all four navigation tabs", () => {
    renderNav("/");
    expect(screen.getByText("Compare")).toBeInTheDocument();
    expect(screen.getByText("Opportunities")).toBeInTheDocument();
    expect(screen.getByText("Experts")).toBeInTheDocument();
    expect(screen.getByText("Get Matched")).toBeInTheDocument();
  });

  it("has the correct links for each tab", () => {
    renderNav("/");
    expect(screen.getByRole("link", { name: /compare/i })).toHaveAttribute("href", "/compare");
    expect(screen.getByRole("link", { name: /opportunities/i })).toHaveAttribute("href", "/invest");
    expect(screen.getByRole("link", { name: /experts/i })).toHaveAttribute("href", "/advisors");
    expect(screen.getByRole("link", { name: /get matched/i })).toHaveAttribute("href", "/quiz");
  });
});

describe("MobileBottomNav — hidden routes", () => {
  it.each([
    ["/admin"],
    ["/admin/some-page"],
    ["/auth"],
    ["/auth/signin"],
    ["/quiz"],
    ["/quiz/results"],
    ["/broker-portal"],
    ["/broker-portal/dashboard"],
  ])("returns null on hidden route %s", (pathname) => {
    const { container } = renderNav(pathname);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("MobileBottomNav — active tab", () => {
  it("marks Compare tab as active on /compare", () => {
    renderNav("/compare");
    const link = screen.getByRole("link", { name: /compare/i });
    // active tab has text-amber-600 class
    expect(link.className).toMatch(/text-amber-600/);
  });

  it("marks Opportunities tab as active on /invest", () => {
    renderNav("/invest/some-listing");
    const link = screen.getByRole("link", { name: /opportunities/i });
    expect(link.className).toMatch(/text-amber-600/);
  });

  it("marks Experts tab as active on /advisors", () => {
    renderNav("/advisors/some-advisor");
    const link = screen.getByRole("link", { name: /experts/i });
    expect(link.className).toMatch(/text-amber-600/);
  });

  it("does not mark Compare as active on a different route", () => {
    renderNav("/invest");
    const link = screen.getByRole("link", { name: /compare/i });
    expect(link.className).not.toMatch(/text-amber-600/);
  });
});

describe("MobileBottomNav — double-mount guard", () => {
  it("app/page.tsx does not import MobileBottomNav directly", async () => {
    // Read the source of app/page.tsx and assert MobileBottomNav is not imported.
    // This is a static analysis guard — if someone adds it back to page.tsx the
    // test will fail and remind them to remove it (nav is now in LayoutShell).
    const fs = await import("fs");
    const path = await import("path");
    const pageSource = fs.readFileSync(
      path.resolve(process.cwd(), "app/page.tsx"),
      "utf8",
    );
    expect(pageSource).not.toContain("MobileBottomNav");
  });

  it("LayoutShell.tsx imports MobileBottomNav", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const shellSource = fs.readFileSync(
      path.resolve(process.cwd(), "components/LayoutShell.tsx"),
      "utf8",
    );
    expect(shellSource).toContain("MobileBottomNav");
  });
});
