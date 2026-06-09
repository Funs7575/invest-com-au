import { describe, it, expect } from "vitest";
import { render, screen } from "../setup";

import BriefStrengthMeter from "@/components/briefs/BriefStrengthMeter";
import type { BriefStrength } from "@/lib/briefs/brief-strength";

const weak: BriefStrength = {
  score: 20,
  tier: "weak",
  label: "Needs more detail",
  tips: [
    { id: "description", text: "Add a sentence or two about your situation." },
    { id: "budget", text: "Set a budget band." },
  ],
};

const great: BriefStrength = {
  score: 95,
  tier: "great",
  label: "Excellent — pros love this",
  tips: [],
};

describe("BriefStrengthMeter", () => {
  it("renders the tier label and an accessible meter value", () => {
    render(<BriefStrengthMeter strength={weak} />);
    expect(screen.getByText("Needs more detail")).toBeInTheDocument();
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "20");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
  });

  it("surfaces coaching tips for a weak brief", () => {
    render(<BriefStrengthMeter strength={weak} />);
    expect(screen.getByText(/add a sentence or two/i)).toBeInTheDocument();
  });

  it("shows a celebratory message (and no tips) when great", () => {
    render(<BriefStrengthMeter strength={great} />);
    expect(screen.getByText(/this brief gives pros what they need/i)).toBeInTheDocument();
    expect(screen.queryByText(/set a budget band/i)).not.toBeInTheDocument();
  });
});
