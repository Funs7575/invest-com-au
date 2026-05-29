/**
 * @vitest-environment jsdom
 *
 * Smoke tests for /smsf/page.tsx.
 *
 * The page was rebuilt from the HubPage HOC into a standalone long-form guide:
 * a synchronous server component with no Supabase fetch. These tests validate
 * the rebuilt structure — hero, the core explainer sections, the eight SMSF
 * topic cards, the FAQ + JSON-LD (BreadcrumbList + FAQPage), and the mandatory
 * general-advice warning.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "../components/setup";
import SmsfPage from "@/app/smsf/page";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

function ldBlocks(): Array<Record<string, unknown>> {
  return Array.from(
    document.querySelectorAll('script[type="application/ld+json"]'),
  ).map((s) => JSON.parse(s.innerHTML) as Record<string, unknown>);
}

describe("SmsfPage", () => {
  it("renders the SMSF hero headline", () => {
    render(<SmsfPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /Self-Managed Super Funds/i }),
    ).toBeInTheDocument();
  });

  it("renders the core explainer section headings", () => {
    render(<SmsfPage />);
    expect(screen.getByText("What is an SMSF?")).toBeInTheDocument();
    expect(screen.getByText("SMSF costs")).toBeInTheDocument();
    expect(screen.getByText("What an SMSF can invest in")).toBeInTheDocument();
    expect(screen.getByText("What an SMSF cannot do")).toBeInTheDocument();
    expect(screen.getByText("Trustee responsibilities")).toBeInTheDocument();
  });

  it("renders all eight SMSF topic cards with correct hrefs", () => {
    render(<SmsfPage />);
    const cards: Array<[string, string]> = [
      ["SMSF Setup", "/smsf/setup"],
      ["SMSF Property", "/smsf/property"],
      ["SMSF Borrowing (LRBA)", "/smsf/borrowing"],
      ["SMSF Crypto", "/smsf/crypto"],
      ["SMSF Wind-Up", "/smsf/wind-up"],
      ["Investment Strategy", "/smsf/investment-strategy"],
      ["SMSF Insurance", "/smsf/insurance"],
      ["SMSF Audits", "/smsf/auditors"],
    ];
    for (const [title, href] of cards) {
      expect(screen.getByText(title)).toBeInTheDocument();
      expect(document.querySelector(`a[href="${href}"]`)).not.toBeNull();
    }
  });

  it("renders BreadcrumbList + FAQPage JSON-LD", () => {
    render(<SmsfPage />);
    const types = ldBlocks().map((b) => b["@type"]);
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("FAQPage");
  });

  it("renders the FAQ questions", () => {
    render(<SmsfPage />);
    expect(
      screen.getByText("How much super do I need to set up an SMSF?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("What are the annual costs of running an SMSF?"),
    ).toBeInTheDocument();
  });

  it("renders the mandatory general-advice warning", () => {
    render(<SmsfPage />);
    expect(screen.getByText(GENERAL_ADVICE_WARNING)).toBeInTheDocument();
  });

  it("renders both hero CTAs", () => {
    render(<SmsfPage />);
    expect(
      screen.getByRole("link", { name: /how to set up an smsf/i }),
    ).toHaveAttribute("href", "/smsf/setup");
    expect(
      screen.getByRole("link", { name: /find an smsf auditor/i }),
    ).toHaveAttribute("href", "/smsf/auditors");
  });
});
