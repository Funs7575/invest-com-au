import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import SocialProofBar from "@/components/SocialProofBar";

describe("SocialProofBar", () => {
  it("exposes the trust-signals region via role=status + aria-label", () => {
    render(<SocialProofBar />);
    expect(
      screen.getByRole("status", { name: "Trust signals" }),
    ).toBeInTheDocument();
  });

  it("renders all three trust claims", () => {
    render(<SocialProofBar />);
    expect(screen.getByText(/70\+ ASIC-regulated platforms/)).toBeInTheDocument();
    expect(screen.getByText(/Independent ratings/)).toBeInTheDocument();
    expect(screen.getByText(/Fees verified daily/)).toBeInTheDocument();
  });

  it("renders the 'no pay-to-play' phrasing as part of the independent-ratings line", () => {
    render(<SocialProofBar />);
    expect(
      screen.getByText(/Independent ratings — no pay-to-play/),
    ).toBeInTheDocument();
  });
});
