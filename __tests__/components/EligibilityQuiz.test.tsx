/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EligibilityQuiz, {
  type QuizQuestion,
  type QuizAnswers,
} from "@/components/EligibilityQuiz";

const QUESTIONS: QuizQuestion[] = [
  {
    id: "industry",
    question: "What is your industry?",
    options: [
      { value: "tech", label: "Technology" },
      { value: "finance", label: "Finance" },
    ],
  },
  {
    id: "size",
    question: "How many employees?",
    options: [
      { value: "small", label: "1–10" },
      { value: "large", label: "11+" },
    ],
  },
  {
    id: "stage",
    question: "What stage are you at?",
    options: [
      { value: "early", label: "Early" },
      { value: "growth", label: "Growth" },
    ],
  },
];

function renderQuiz(props?: Partial<Parameters<typeof EligibilityQuiz>[0]>) {
  const renderResults = vi.fn((_answers: QuizAnswers, reset: () => void) => (
    <div>
      <span data-testid="results-view">Results</span>
      <button onClick={reset} data-testid="reset-btn">
        Start over
      </button>
    </div>
  ));
  render(
    <EligibilityQuiz
      questions={QUESTIONS}
      renderResults={renderResults}
      {...props}
    />
  );
  return { renderResults };
}

describe("EligibilityQuiz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the quiz container", () => {
    renderQuiz();
    expect(screen.getByTestId("eligibility-quiz")).toBeInTheDocument();
  });

  it("shows the first question on mount", () => {
    renderQuiz();
    expect(screen.getByTestId("eligibility-quiz-question")).toHaveTextContent(
      "What is your industry?"
    );
  });

  it("renders all options for the first question", () => {
    renderQuiz();
    expect(screen.getByTestId("eligibility-quiz-option-tech")).toHaveTextContent(
      "Technology"
    );
    expect(
      screen.getByTestId("eligibility-quiz-option-finance")
    ).toHaveTextContent("Finance");
  });

  it("shows step 1 of N in the meta heading", () => {
    renderQuiz();
    expect(screen.getByTestId("eligibility-quiz-meta")).toHaveTextContent(
      "1 of 3"
    );
  });

  it("shows 0% progress on the first question", () => {
    renderQuiz();
    expect(
      screen.getByTestId("eligibility-quiz-progress-label")
    ).toHaveTextContent("0%");
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0"
    );
  });

  it("does not show back button on first step", () => {
    renderQuiz();
    expect(
      screen.queryByTestId("eligibility-quiz-back")
    ).not.toBeInTheDocument();
  });

  it("advances to the next question after selecting an option", async () => {
    const user = userEvent.setup();
    renderQuiz();
    await user.click(screen.getByTestId("eligibility-quiz-option-tech"));
    expect(screen.getByTestId("eligibility-quiz-question")).toHaveTextContent(
      "How many employees?"
    );
  });

  it("shows the back button after advancing past step 1", async () => {
    const user = userEvent.setup();
    renderQuiz();
    await user.click(screen.getByTestId("eligibility-quiz-option-tech"));
    expect(screen.getByTestId("eligibility-quiz-back")).toBeInTheDocument();
  });

  it("navigates back to the previous question", async () => {
    const user = userEvent.setup();
    renderQuiz();
    await user.click(screen.getByTestId("eligibility-quiz-option-tech"));
    await user.click(screen.getByTestId("eligibility-quiz-back"));
    expect(screen.getByTestId("eligibility-quiz-question")).toHaveTextContent(
      "What is your industry?"
    );
  });

  it("updates the progress percentage as steps advance", async () => {
    const user = userEvent.setup();
    renderQuiz();
    // step 0 → 0%
    expect(screen.getByTestId("eligibility-quiz-progress-label")).toHaveTextContent("0%");
    await user.click(screen.getByTestId("eligibility-quiz-option-tech"));
    // step 1 → 33%
    expect(screen.getByTestId("eligibility-quiz-progress-label")).toHaveTextContent("33%");
    await user.click(screen.getByTestId("eligibility-quiz-option-small"));
    // step 2 → 67%
    expect(screen.getByTestId("eligibility-quiz-progress-label")).toHaveTextContent("67%");
  });

  it("uses the custom heading prop", () => {
    renderQuiz({ heading: "R&D Tax Quiz" });
    expect(screen.getByTestId("eligibility-quiz-meta")).toHaveTextContent(
      "R&D Tax Quiz"
    );
  });

  it("calls renderResults with collected answers after the last question", async () => {
    const user = userEvent.setup();
    const { renderResults } = renderQuiz();
    await user.click(screen.getByTestId("eligibility-quiz-option-tech"));
    await user.click(screen.getByTestId("eligibility-quiz-option-small"));
    await user.click(screen.getByTestId("eligibility-quiz-option-early"));
    expect(renderResults).toHaveBeenCalledOnce();
    expect(renderResults).toHaveBeenCalledWith(
      { industry: "tech", size: "small", stage: "early" },
      expect.any(Function)
    );
  });

  it("renders results view after all questions answered", async () => {
    const user = userEvent.setup();
    renderQuiz();
    await user.click(screen.getByTestId("eligibility-quiz-option-tech"));
    await user.click(screen.getByTestId("eligibility-quiz-option-small"));
    await user.click(screen.getByTestId("eligibility-quiz-option-early"));
    expect(screen.getByTestId("eligibility-quiz-results")).toBeInTheDocument();
    expect(screen.getByTestId("results-view")).toBeInTheDocument();
  });

  it("reset from renderResults returns to step 1 with cleared answers", async () => {
    const user = userEvent.setup();
    renderQuiz();
    await user.click(screen.getByTestId("eligibility-quiz-option-tech"));
    await user.click(screen.getByTestId("eligibility-quiz-option-small"));
    await user.click(screen.getByTestId("eligibility-quiz-option-early"));
    await user.click(screen.getByTestId("reset-btn"));
    expect(screen.getByTestId("eligibility-quiz")).toBeInTheDocument();
    expect(screen.getByTestId("eligibility-quiz-question")).toHaveTextContent(
      "What is your industry?"
    );
    expect(
      screen.queryByTestId("eligibility-quiz-results")
    ).not.toBeInTheDocument();
  });
});
