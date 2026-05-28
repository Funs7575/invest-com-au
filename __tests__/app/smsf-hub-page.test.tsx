/**
 * @vitest-environment jsdom
 *
 * Smoke tests for /smsf/page.tsx — static SMSF guide page.
 * Verifies key content renders: heading, FAQ items, JSON-LD, navigation links.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../components/setup";
import SmsfPage from "@/app/smsf/page";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  })),
}));

describe("SmsfPage", () => {
  it("renders without crashing", () => {
    render(<SmsfPage />);
    expect(document.body).toBeTruthy();
  });

  it("renders the page heading", () => {
    render(<SmsfPage />);
    const headings = screen.getAllByText(/Self-Managed Super|SMSF/i);
    expect(headings.length).toBeGreaterThan(0);
  });

  it("renders FAQ section with at least one question", () => {
    render(<SmsfPage />);
    expect(
      screen.getByText(/How much super do I need/i)
    ).toBeInTheDocument();
  });

  it("renders a FAQ JSON-LD script", () => {
    render(<SmsfPage />);
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const faqScript = Array.from(scripts).find((s) =>
      s.innerHTML.includes("FAQPage")
    );
    expect(faqScript).toBeTruthy();
  });

  it("renders a BreadcrumbList JSON-LD script", () => {
    render(<SmsfPage />);
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const breadcrumbScript = Array.from(scripts).find((s) =>
      s.innerHTML.includes("BreadcrumbList")
    );
    expect(breadcrumbScript).toBeTruthy();
  });

  it("renders a link to the SMSF setup sub-page", () => {
    render(<SmsfPage />);
    const links = screen.getAllByRole("link");
    const setupLink = links.find((l) => l.getAttribute("href")?.includes("/smsf/setup"));
    expect(setupLink).toBeTruthy();
  });

  it("renders the general advice warning", () => {
    render(<SmsfPage />);
    expect(screen.getByText(/general in nature/i)).toBeInTheDocument();
  });
});
