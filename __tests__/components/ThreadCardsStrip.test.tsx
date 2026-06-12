import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import ThreadCardsStrip, {
  selectThreadCards,
  type ThreadAnswers,
} from "@/app/quiz/_components/ThreadCardsStrip";

describe("selectThreadCards", () => {
  it("returns zero cards for a minimal non-DIY simple-small profile", () => {
    const cards = selectThreadCards({
      goal: "grow",
      mode: "help", // not diy/unsure
      complexity: "simple",
      amount: "small",
      priority: "fees",
    });
    expect(cards).toHaveLength(0);
  });

  it("includes 'super' card when goal is super", () => {
    const cards = selectThreadCards({ goal: "super" });
    expect(cards.some((c) => c.key === "super")).toBe(true);
  });

  it("includes 'super' card on a high amount even for non-retirement goal", () => {
    const cards = selectThreadCards({ goal: "grow", amount: "whale" });
    expect(cards.some((c) => c.key === "super")).toBe(true);
  });

  it("includes 'savings' card when mode is diy", () => {
    const cards = selectThreadCards({ mode: "diy" });
    expect(cards.some((c) => c.key === "savings")).toBe(true);
  });

  it("includes 'savings' card on meaningful amount even when mode is help", () => {
    const cards = selectThreadCards({ mode: "help", amount: "medium" });
    expect(cards.some((c) => c.key === "savings")).toBe(true);
  });

  it("includes 'tax' card when complexity is complex", () => {
    const cards = selectThreadCards({ complexity: "complex" });
    const tax = cards.find((c) => c.key === "tax");
    expect(tax).toBeDefined();
    expect(tax?.heading).toBe("Get tax help");
    expect(tax?.href).toBe("/advisors/tax-agents");
  });

  it("re-frames 'tax' card as SMSF help when goal is super", () => {
    const cards = selectThreadCards({ goal: "super" });
    const tax = cards.find((c) => c.key === "tax");
    expect(tax).toBeDefined();
    expect(tax?.heading).toBe("Get SMSF help");
    expect(tax?.href).toBe("/advisors/smsf-accountants");
  });

  it("includes 'advisor' card when mode is unsure", () => {
    const cards = selectThreadCards({ mode: "unsure" });
    expect(cards.some((c) => c.key === "advisor")).toBe(true);
  });

  it("does not include 'advisor' card when mode is diy", () => {
    const cards = selectThreadCards({ mode: "diy", goal: "grow" });
    expect(cards.some((c) => c.key === "advisor")).toBe(false);
  });

  it("caps the strip at 4 cards", () => {
    // Pile on every condition we can simultaneously
    const cards = selectThreadCards({
      goal: "super", // super + tax(SMSF)
      mode: "unsure", // advisor
      complexity: "complex", // tax (already added)
      amount: "whale", // super (already added)
      priority: "safety", // super (already added)
    });
    expect(cards.length).toBeLessThanOrEqual(4);
  });

  it("never includes a 'broker' card (delegated to leaderboard below)", () => {
    const cards = selectThreadCards({
      goal: "super",
      mode: "diy",
      complexity: "complex",
      amount: "whale",
    });
    expect(cards.some((c) => c.key === "broker")).toBe(false);
  });
});

describe("ThreadCardsStrip", () => {
  it("renders nothing when no cards qualify", () => {
    const answers: ThreadAnswers = {
      goal: "grow",
      mode: "help",
      complexity: "simple",
      amount: "small",
      priority: "fees",
    };
    const { container } = render(<ThreadCardsStrip answers={answers} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the section heading and at least one card when conditions match", () => {
    render(<ThreadCardsStrip answers={{ goal: "super" }} />);
    expect(screen.getByText("Your investing stack")).toBeInTheDocument();
    expect(
      screen.getByText("A great setup is more than just a broker"),
    ).toBeInTheDocument();
    // Super card should be present
    expect(screen.getByText("Sort your super")).toBeInTheDocument();
  });

  it("renders SMSF copy variant for goal=super", () => {
    render(<ThreadCardsStrip answers={{ goal: "super" }} />);
    expect(screen.getByText("Get SMSF help")).toBeInTheDocument();
  });

  it("renders tax copy variant when complexity is complex", () => {
    render(<ThreadCardsStrip answers={{ complexity: "complex" }} />);
    expect(screen.getByText("Get tax help")).toBeInTheDocument();
  });

  it("renders the advisor card for mode=unsure", () => {
    render(<ThreadCardsStrip answers={{ mode: "unsure" }} />);
    expect(screen.getByText("Talk to an advisor")).toBeInTheDocument();
  });

  it("links each card to the expected route", () => {
    render(
      <ThreadCardsStrip
        answers={{ mode: "diy", complexity: "complex", goal: "crypto" }}
      />,
    );
    // savings
    const savings = screen.getByText("See savings rates").closest("a");
    expect(savings).toHaveAttribute("href", "/savings");
    // tax (non-SMSF variant since goal=crypto)
    const tax = screen.getByText("Find an accountant").closest("a");
    expect(tax).toHaveAttribute("href", "/advisors/tax-agents");
  });
});
