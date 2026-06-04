/**
 * @vitest-environment jsdom
 *
 * Smoke tests for /smsf/page.tsx.
 *
 * NOTE: this page was migrated off the HubPage HOC template to a bespoke,
 * static SMSF guide page (`SmsfPage`, synchronous — no Supabase fetch). These
 * tests assert the current page's real content; the HubPage template itself is
 * still validated via the dividends hub test.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { render, screen } from "../components/setup";
import SmsfPage from "@/app/smsf/page";

describe("SmsfPage", () => {
  it("renders the SMSF breadcrumb", () => {
    render(<SmsfPage />);
    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveTextContent("Home");
    expect(nav).toHaveTextContent("SMSF");
  });

  it("renders the SMSF hero headline + intro", () => {
    render(<SmsfPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /self-managed super funds/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/private superannuation trust/i)).toBeInTheDocument();
  });

  it("renders the hero CTAs to setup + auditors", () => {
    render(<SmsfPage />);
    expect(
      screen.getByRole("link", { name: /how to set up an smsf/i }),
    ).toHaveAttribute("href", "/smsf/setup");
    expect(
      screen.getByRole("link", { name: /find an smsf auditor/i }),
    ).toHaveAttribute("href", "/smsf/auditors");
  });

  it('renders the "What is an SMSF?" section', () => {
    render(<SmsfPage />);
    expect(
      screen.getByRole("heading", { name: /what is an smsf\?/i }),
    ).toBeInTheDocument();
  });

  it("renders the deep-dives section intro", () => {
    render(<SmsfPage />);
    expect(
      screen.getByText(/deep-dives into the decisions and rules/i),
    ).toBeInTheDocument();
  });

  it("renders the general-advice compliance warning", () => {
    render(<SmsfPage />);
    expect(screen.getByText(/general in nature/i)).toBeInTheDocument();
  });

  it("links every topic card to a real /smsf/* route (no dead links)", () => {
    render(<SmsfPage />);
    const cardLinks = screen
      .getAllByRole("link", { name: /read guide/i })
      .map((a) => a.getAttribute("href"))
      .filter((href): href is string => Boolean(href));

    expect(cardLinks.length).toBeGreaterThan(0);

    for (const href of cardLinks) {
      expect(href.startsWith("/smsf/")).toBe(true);
      const slug = href.replace(/^\/smsf\//, "");
      const routeFile = join(process.cwd(), "app", "smsf", slug, "page.tsx");
      expect(existsSync(routeFile), `${href} should resolve to ${routeFile}`).toBe(true);
    }
  });

  it("emits BreadcrumbList + FAQPage JSON-LD", () => {
    const { container } = render(<SmsfPage />);
    const scripts = Array.from(
      container.querySelectorAll('script[type="application/ld+json"]'),
    ).map((s) => s.innerHTML);
    expect(scripts.some((j) => j.includes('"BreadcrumbList"'))).toBe(true);
    expect(scripts.some((j) => j.includes('"FAQPage"'))).toBe(true);
  });
});
