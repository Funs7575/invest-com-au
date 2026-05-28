/**
 * @vitest-environment jsdom
 *
 * Smoke tests for /smsf/page.tsx — custom guide layout (rebuilt from HubPage HOC).
 * Verifies hero, breadcrumb JSON-LD, FAQ JSON-LD, topic cards, and compliance.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "../components/setup";
import SmsfPage from "@/app/smsf/page";

describe("SmsfHubPage", () => {
  it("renders the h1 SMSF headline", () => {
    render(SmsfPage());
    expect(
      screen.getByRole("heading", { level: 1, name: /Self-Managed Super Funds/i })
    ).toBeInTheDocument();
  });

  it("renders breadcrumb JSON-LD with BreadcrumbList type", () => {
    render(SmsfPage());
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const breadcrumbScript = Array.from(scripts).find((s) => {
      try {
        return JSON.parse(s.innerHTML)["@type"] === "BreadcrumbList";
      } catch {
        return false;
      }
    });
    expect(breadcrumbScript).toBeDefined();
    const ld = JSON.parse(breadcrumbScript!.innerHTML);
    const names = ld.itemListElement.map((item: { name: string }) => item.name);
    expect(names).toContain("Home");
    expect(names).toContain("SMSF");
  });

  it("renders FAQPage JSON-LD", () => {
    render(SmsfPage());
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const faqScript = Array.from(scripts).find((s) => {
      try {
        return JSON.parse(s.innerHTML)["@type"] === "FAQPage";
      } catch {
        return false;
      }
    });
    expect(faqScript).toBeDefined();
  });

  it("renders the nav breadcrumb with Home link", () => {
    render(SmsfPage());
    expect(
      screen.getByRole("navigation", { name: /breadcrumb/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
  });

  it("renders hero CTA links", () => {
    render(SmsfPage());
    expect(
      screen.getByRole("link", { name: /how to set up an smsf/i })
    ).toHaveAttribute("href", "/smsf/setup");
    expect(
      screen.getByRole("link", { name: /find an smsf auditor/i })
    ).toHaveAttribute("href", "/smsf/auditors");
  });

  it("renders the SMSF costs heading and cost table rows", () => {
    render(SmsfPage());
    expect(
      screen.getByRole("heading", { level: 2, name: /SMSF costs/i })
    ).toBeInTheDocument();
    expect(screen.getByText("ATO supervisory levy")).toBeInTheDocument();
  });

  it("renders SMSF statistics cards", () => {
    render(SmsfPage());
    expect(screen.getByText("Up to 6")).toBeInTheDocument();
    expect(screen.getByText("~620,000")).toBeInTheDocument();
    expect(screen.getByText("$200K+")).toBeInTheDocument();
  });

  it("renders all eight SMSF topic cards", () => {
    render(SmsfPage());
    expect(screen.getByText("SMSF Setup")).toBeInTheDocument();
    expect(screen.getByText("SMSF Property")).toBeInTheDocument();
    expect(screen.getByText("SMSF Borrowing (LRBA)")).toBeInTheDocument();
    expect(screen.getByText("SMSF Crypto")).toBeInTheDocument();
    expect(screen.getByText("SMSF Wind-Up")).toBeInTheDocument();
    expect(screen.getByText("Investment Strategy")).toBeInTheDocument();
    expect(screen.getByText("SMSF Insurance")).toBeInTheDocument();
    expect(screen.getByText("SMSF Audits")).toBeInTheDocument();
  });

  it("renders the FAQ section with at least one question", () => {
    render(SmsfPage());
    expect(
      screen.getByRole("heading", { level: 2, name: /Frequently asked questions/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText("How much super do I need to set up an SMSF?")
    ).toBeInTheDocument();
  });

  it("renders the general advice warning", () => {
    render(SmsfPage());
    expect(screen.getByText(/general in nature/i)).toBeInTheDocument();
  });

  it("renders the LRBA section link", () => {
    render(SmsfPage());
    expect(
      screen.getByRole("link", { name: /full lrba guide/i })
    ).toHaveAttribute("href", "/smsf/borrowing");
  });
});
