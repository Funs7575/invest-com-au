import { describe, it, expect } from "vitest";
import { fireEvent } from "@testing-library/react";
import { render, screen } from "./setup";
import JargonTooltip from "@/components/JargonTooltip";

describe("JargonTooltip", () => {
  it("renders the term verbatim when no glossary definition exists", () => {
    render(<JargonTooltip term="NOT_A_REAL_TERM" />);
    expect(screen.getByText("NOT_A_REAL_TERM")).toBeInTheDocument();
    // No tooltip arrow / dotted underline when there's no definition.
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("renders children instead of the term when both are supplied (no-def branch)", () => {
    render(
      <JargonTooltip term="NOT_A_REAL_TERM">Custom Label</JargonTooltip>,
    );
    expect(screen.getByText("Custom Label")).toBeInTheDocument();
    expect(screen.queryByText("NOT_A_REAL_TERM")).not.toBeInTheDocument();
  });

  it("renders the term with the ⓘ icon when the term IS in the glossary (e.g. 'ASX')", () => {
    const { container } = render(<JargonTooltip term="ASX" />);
    expect(screen.getByText("ASX")).toBeInTheDocument();
    // The component wraps the term in a span with an SVG icon when
    // a definition exists.
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("hover opens the tooltip with the glossary definition", () => {
    render(<JargonTooltip term="ASX" />);
    const wrapper = screen.getByText("ASX").parentElement?.parentElement;
    expect(wrapper).not.toBeNull();
    fireEvent.mouseEnter(wrapper!);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("mouseLeave closes the tooltip", () => {
    render(<JargonTooltip term="ASX" />);
    const wrapper = screen.getByText("ASX").parentElement?.parentElement;
    fireEvent.mouseEnter(wrapper!);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.mouseLeave(wrapper!);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
