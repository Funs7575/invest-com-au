import { describe, it, expect } from "vitest";
import { fireEvent } from "@testing-library/react";
import { render, screen } from "./setup";
import Footer from "@/components/Footer";

const SECTION_TITLES = [
  "Browse Opportunities",
  "Compare Platforms",
  "Find Experts & Property",
  "Property",
  "Learn",
  "Company",
];

describe("Footer — mobile collapsible link sections", () => {
  it("renders every section heading as a tappable, collapsed-by-default control", () => {
    render(<Footer />);
    for (const title of SECTION_TITLES) {
      // Exact-string name match so "Property" doesn't collide with
      // "Find Experts & Property".
      const btn = screen.getByRole("button", { name: title });
      expect(btn).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("expands a section's links when its heading is tapped", () => {
    render(<Footer />);
    const browse = screen.getByRole("button", { name: "Browse Opportunities" });
    fireEvent.click(browse);
    expect(browse).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps all links in the DOM regardless of open state (crawlable + desktop-visible)", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: "All Opportunities" })).toHaveAttribute("href", "/invest");
    expect(screen.getByRole("link", { name: "ETF Hub" })).toHaveAttribute("href", "/etfs");
    expect(screen.getByRole("link", { name: "Advisor Directory" })).toHaveAttribute("href", "/advisors");
    expect(screen.getByRole("link", { name: "Glossary" })).toHaveAttribute("href", "/glossary");
    expect(screen.getByRole("link", { name: "About Us" })).toHaveAttribute("href", "/about");
  });

  it("toggles each section independently", () => {
    render(<Footer />);
    const compare = screen.getByRole("button", { name: "Compare Platforms" });
    const property = screen.getByRole("button", { name: "Property" });
    fireEvent.click(compare);
    expect(compare).toHaveAttribute("aria-expanded", "true");
    expect(property).toHaveAttribute("aria-expanded", "false");
  });

  it("still renders the persistent general-advice warning and ASIC registration", () => {
    render(<Footer />);
    expect(screen.getByText("General Advice Warning")).toBeInTheDocument();
    expect(screen.getByText(/Registered with ASIC/i)).toBeInTheDocument();
  });
});
