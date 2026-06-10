import { describe, it, expect } from "vitest";
import { render, screen } from "../setup";

import BriefHowItWorksRail from "@/components/briefs/BriefHowItWorksRail";

describe("BriefHowItWorksRail", () => {
  it("shows the live pro count when supply is above the floor", () => {
    render(<BriefHowItWorksRail proSupply={180} />);
    expect(screen.getByText(/180 verified pros ready/i)).toBeInTheDocument();
  });

  it("falls back to qualitative copy below the floor (and on null)", () => {
    render(<BriefHowItWorksRail proSupply={5} />);
    expect(screen.getByText(/verified pros across australia/i)).toBeInTheDocument();
  });

  it("renders the three how-it-works steps and trust guarantees", () => {
    render(<BriefHowItWorksRail proSupply={null} />);
    expect(screen.getByText(/tell us what you need/i)).toBeInTheDocument();
    expect(screen.getByText(/verified pros respond/i)).toBeInTheDocument();
    expect(screen.getByText(/compare & choose/i)).toBeInTheDocument();
    expect(screen.getByText(/verified pros only/i)).toBeInTheDocument();
    expect(screen.getByText(/masked until you choose/i)).toBeInTheDocument();
  });
});
