import { describe, it, expect } from "vitest";
import { render, screen, userEvent } from "./setup";
import LeadScoreBadge from "@/components/LeadScoreBadge";

describe("LeadScoreBadge", () => {
  describe("tier branching", () => {
    it("renders a Hot Lead for score >= 70", () => {
      render(<LeadScoreBadge score={85} />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute(
        "title",
        expect.stringContaining("Hot Lead"),
      );
      expect(button).toHaveAttribute(
        "title",
        expect.stringContaining("Respond within 1 hour"),
      );
      expect(screen.getByText("Hot Lead")).toBeInTheDocument();
      expect(screen.getByText("85")).toBeInTheDocument();
    });

    it("renders a Warm Lead for 40 <= score < 70", () => {
      render(<LeadScoreBadge score={55} />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("title", expect.stringContaining("Warm Lead"));
      expect(button).toHaveAttribute(
        "title",
        expect.stringContaining("Respond within 24 hours"),
      );
      expect(screen.getByText("Warm Lead")).toBeInTheDocument();
    });

    it("renders a Cool Lead for score < 40", () => {
      render(<LeadScoreBadge score={20} />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("title", expect.stringContaining("Cool Lead"));
      expect(button).toHaveAttribute(
        "title",
        expect.stringContaining("Follow up when convenient"),
      );
      expect(screen.getByText("Cool Lead")).toBeInTheDocument();
    });
  });

  describe("tier boundary exactness", () => {
    it("score = 70 is Hot", () => {
      render(<LeadScoreBadge score={70} />);
      expect(screen.getByText("Hot Lead")).toBeInTheDocument();
    });

    it("score = 69 is Warm", () => {
      render(<LeadScoreBadge score={69} />);
      expect(screen.getByText("Warm Lead")).toBeInTheDocument();
    });

    it("score = 40 is Warm", () => {
      render(<LeadScoreBadge score={40} />);
      expect(screen.getByText("Warm Lead")).toBeInTheDocument();
    });

    it("score = 39 is Cool", () => {
      render(<LeadScoreBadge score={39} />);
      expect(screen.getByText("Cool Lead")).toBeInTheDocument();
    });
  });

  describe("expand / collapse breakdown", () => {
    it("does not expand in compact mode and shows no chevron caret", async () => {
      const user = userEvent.setup();
      render(
        <LeadScoreBadge score={80} compact signals={{ phone_provided: 10 }} />,
      );
      const button = screen.getByRole("button");
      // No chevron caret (▼ / ▲) in compact mode
      expect(button.textContent).not.toContain("▼");
      expect(button.textContent).not.toContain("▲");
      await user.click(button);
      expect(screen.queryByText("Score Breakdown")).not.toBeInTheDocument();
    });

    it("toggles the breakdown open and closed on click (non-compact with signals)", async () => {
      const user = userEvent.setup();
      render(
        <LeadScoreBadge
          score={80}
          signals={{ phone_provided: 10 }}
          tier="premium"
        />,
      );
      const button = screen.getByRole("button");
      // Chevron present (collapsed -> ▼)
      expect(button.textContent).toContain("▼");

      // Initially collapsed
      expect(screen.queryByText("Score Breakdown")).not.toBeInTheDocument();

      // Open
      await user.click(button);
      expect(screen.getByText("Score Breakdown")).toBeInTheDocument();
      // Mapped signal label + value via SIGNAL_LABELS
      expect(screen.getByText("Has phone number")).toBeInTheDocument();
      expect(screen.getByText("+10")).toBeInTheDocument();
      // Chevron flips to ▲ when expanded
      expect(button.textContent).toContain("▲");

      // Close again
      await user.click(button);
      expect(screen.queryByText("Score Breakdown")).not.toBeInTheDocument();
    });

    it("falls back to an underscores-replaced label for an unknown signal key", async () => {
      const user = userEvent.setup();
      render(
        <LeadScoreBadge score={75} signals={{ custom_lead_signal: 5 }} />,
      );
      await user.click(screen.getByRole("button"));
      expect(screen.getByText("custom lead signal")).toBeInTheDocument();
      expect(screen.getByText("+5")).toBeInTheDocument();
    });

    it("renders ✓ instead of +N for a non-number signal value", async () => {
      const user = userEvent.setup();
      render(
        // @ts-expect-error — intentionally passing a non-number value to exercise the fallback branch
        <LeadScoreBadge score={75} signals={{ phone_provided: true }} />,
      );
      await user.click(screen.getByRole("button"));
      expect(screen.getByText("+✓")).toBeInTheDocument();
    });

    it("shows no chevron and never opens a panel when there are no signals", async () => {
      const user = userEvent.setup();
      render(<LeadScoreBadge score={80} />);
      const button = screen.getByRole("button");
      expect(button.textContent).not.toContain("▼");
      expect(button.textContent).not.toContain("▲");
      await user.click(button);
      expect(screen.queryByText("Score Breakdown")).not.toBeInTheDocument();
    });
  });
});
