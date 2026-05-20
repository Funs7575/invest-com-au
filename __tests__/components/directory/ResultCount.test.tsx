import { describe, it, expect } from "vitest";
import { render, screen } from "../setup";
import ResultCount from "@/components/directory/ResultCount";

describe("ResultCount — single-line mode", () => {
  it("renders total + default noun 'listings'", () => {
    const { container } = render(<ResultCount total={42} />);
    expect(container.textContent).toContain("42");
    expect(container.textContent).toContain("listings");
  });

  it("uses a custom noun when supplied", () => {
    const { container } = render(<ResultCount total={3} noun="advisors" />);
    expect(container.textContent).toContain("3");
    expect(container.textContent).toContain("advisors");
  });

  it("wraps in an aria-live=polite region for screen readers", () => {
    const { container } = render(<ResultCount total={1} />);
    expect(container.firstElementChild).toHaveAttribute("aria-live", "polite");
  });
});

describe("ResultCount — pill mode", () => {
  it("renders one pill per entry with count + label", () => {
    render(
      <ResultCount
        total={159}
        pills={[
          { tone: "live", count: 159, label: "live opportunities" },
          { tone: "info", count: 84, label: "FIRB-eligible", icon: "globe" },
          { tone: "good", count: 6, label: "SIV-complying", icon: "shield-check" },
        ]}
      />,
    );
    expect(screen.getByText(/159/)).toBeInTheDocument();
    expect(screen.getByText(/live opportunities/)).toBeInTheDocument();
    expect(screen.getByText(/84/)).toBeInTheDocument();
    expect(screen.getByText(/FIRB-eligible/)).toBeInTheDocument();
    expect(screen.getByText(/6/)).toBeInTheDocument();
    expect(screen.getByText(/SIV-complying/)).toBeInTheDocument();
  });

  it("still wraps in aria-live=polite when in pill mode", () => {
    const { container } = render(
      <ResultCount
        total={1}
        pills={[{ tone: "neutral", count: 1, label: "x" }]}
      />,
    );
    expect(container.firstElementChild).toHaveAttribute("aria-live", "polite");
  });
});
