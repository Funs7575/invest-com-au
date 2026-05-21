import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import FhbSavingsMatch from "@/components/first-home-buyer/FhbSavingsMatch";
import { firstHomeBuyerSavingsUrl } from "@/lib/first-home-buyer/savings-match";

describe("FhbSavingsMatch", () => {
  it("links to the attributed high-interest-savings directory", () => {
    render(<FhbSavingsMatch />);
    const link = screen.getByRole("link", {
      name: /compare all high-interest savings accounts/i,
    });
    expect(link).toHaveAttribute("href", firstHomeBuyerSavingsUrl());
  });

  it("explains the FHSS-vs-cash deposit split and the $250k guarantee", () => {
    render(<FhbSavingsMatch />);
    expect(screen.getByText(/FHSS scheme/i)).toBeInTheDocument();
    expect(screen.getByText(/\$250,000/)).toBeInTheDocument();
  });

  it("carries the general advice warning", () => {
    render(<FhbSavingsMatch />);
    expect(screen.getByText(/general advice warning/i)).toBeInTheDocument();
  });
});
