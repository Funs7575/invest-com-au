import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";
import { fireEvent } from "@testing-library/react";
import SharpenCard from "@/app/get-matched/_components/SharpenCard";
import type { ActionPlanAnswers } from "@/lib/getmatched/types";

/** G7 — sharpen card: offers unanswered questions, fires onAnswer, collapses. */

describe("SharpenCard (G7)", () => {
  it("offers up to 2 unanswered priority questions with chip options", () => {
    render(
      <SharpenCard
        score={62}
        answers={{}}
        busy={false}
        error={null}
        onAnswer={vi.fn()}
      />,
    );
    expect(screen.getByText(/your match is 62%/i)).toBeInTheDocument();
    expect(screen.getByText(/answer 2 more/i)).toBeInTheDocument();
    // Budget chips present (budget is first priority).
    expect(
      screen.getByRole("button", { name: "A$10k – A$100k" }),
    ).toBeInTheDocument();
  });

  it("fires onAnswer with question slug and option value", () => {
    const onAnswer = vi.fn();
    render(
      <SharpenCard
        score={55}
        answers={{ budget_band: "10k_100k", location_state: "NSW" }}
        busy={false}
        error={null}
        onAnswer={onAnswer}
      />,
    );
    // Only timeline is unanswered now.
    fireEvent.click(screen.getByRole("button", { name: /1–3 months/i }));
    expect(onAnswer).toHaveBeenCalledWith("timeline", "1_3_months");
  });

  it("renders nothing when all priority questions are answered (none offered)", () => {
    const answers: ActionPlanAnswers = {
      budget_band: "1m_plus",
      location_state: "VIC",
      timeline: "now",
    };
    const { container } = render(
      <SharpenCard
        score={50}
        answers={answers}
        busy={false}
        error={null}
        onAnswer={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("collapses to a confirmation once offered questions become answered", () => {
    const { rerender } = render(
      <SharpenCard
        score={60}
        answers={{ budget_band: "10k_100k", location_state: "NSW" }}
        busy={false}
        error={null}
        onAnswer={vi.fn()}
      />,
    );
    // Initially offers timeline.
    expect(screen.getByText(/answer 1 more/i)).toBeInTheDocument();
    // After answering, no priority questions remain unanswered.
    rerender(
      <SharpenCard
        score={88}
        answers={{ budget_band: "10k_100k", location_state: "NSW", timeline: "now" }}
        busy={false}
        error={null}
        onAnswer={vi.fn()}
      />,
    );
    expect(screen.getByText(/match sharpened/i)).toBeInTheDocument();
  });
});
