import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { render, screen, userEvent } from "./setup";
import QuizQuestionScreen from "@/app/quiz/_components/QuizQuestionScreen";

function renderMulti(overrides: Record<string, unknown> = {}) {
  const onMultiAnswer = vi.fn();
  const props = {
    step: 0,
    questions: [
      {
        question_text: "Who will you need?",
        options: [
          { key: "mortgage-broker", label: "Mortgage broker" },
          { key: "tax-agent", label: "Tax agent" },
          { key: "not-sure", label: "I'm not sure" },
        ],
      },
    ],
    selectedKey: null,
    animating: false,
    fetchError: null,
    resumePrompt: false,
    multiSelect: true,
    selectedKeys: [] as string[],
    onMultiAnswer,
    onAnswer: vi.fn(),
    onBack: vi.fn(),
    onResume: vi.fn(),
    onStartOver: vi.fn(),
    questionHeadingRef: createRef<HTMLHeadingElement>(),
    ...overrides,
  };
  render(<QuizQuestionScreen {...props} />);
  return { onMultiAnswer };
}

describe("QuizQuestionScreen — multi-select needs", () => {
  it("submits the toggled set via Continue", async () => {
    const user = userEvent.setup();
    const { onMultiAnswer } = renderMulti();
    await user.click(screen.getByRole("checkbox", { name: /Mortgage broker/i }));
    await user.click(screen.getByRole("checkbox", { name: /Tax agent/i }));
    await user.click(screen.getByRole("button", { name: /Continue/i }));
    expect(onMultiAnswer).toHaveBeenCalledWith(["mortgage-broker", "tax-agent"]);
  });

  it("'I'm not sure' is mutually exclusive with concrete needs", async () => {
    const user = userEvent.setup();
    const { onMultiAnswer } = renderMulti();
    await user.click(screen.getByRole("checkbox", { name: /Mortgage broker/i }));
    await user.click(screen.getByRole("checkbox", { name: /not sure/i }));
    await user.click(screen.getByRole("button", { name: /Continue/i }));
    expect(onMultiAnswer).toHaveBeenCalledWith(["not-sure"]);
  });

  it("pre-selects from selectedKeys and submits that set", async () => {
    const user = userEvent.setup();
    const { onMultiAnswer } = renderMulti({ selectedKeys: ["tax-agent"] });
    await user.click(screen.getByRole("button", { name: /Continue/i }));
    expect(onMultiAnswer).toHaveBeenCalledWith(["tax-agent"]);
  });

  it("disables Continue with an empty selection", () => {
    renderMulti({ selectedKeys: [] });
    expect(screen.getByRole("button", { name: /Continue/i })).toBeDisabled();
  });
});
