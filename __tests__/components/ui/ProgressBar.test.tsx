import { describe, expect, it } from "vitest";

import { ProgressBar } from "@/components/ui/ProgressBar";

import { render, screen } from "../setup";

function getFillWidth(): string {
  const bar = screen.getByRole("progressbar");
  const fill = bar.firstElementChild as HTMLElement | null;
  return fill?.style.width ?? "";
}

describe("ProgressBar", () => {
  it("renders 50% for step 2 of 4 with correct label and aria attributes", () => {
    render(<ProgressBar currentStep={2} totalSteps={4} />);

    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "2");
    expect(bar).toHaveAttribute("aria-valuemin", "1");
    expect(bar).toHaveAttribute("aria-valuemax", "4");
    expect(bar).toHaveAttribute("aria-label", "Step 2 of 4");

    expect(getFillWidth()).toBe("50%");
    // First test in the file absorbs jsdom + React module-warmup; give it head-room
    // under concurrent CI/swarm load. Assertions are unchanged.
  }, 20000);

  it("rounds 33.33% down to 33% for step 1 of 3 (label + fill width)", () => {
    render(<ProgressBar currentStep={1} totalSteps={3} />);

    expect(screen.getByText("33%")).toBeInTheDocument();
    expect(getFillWidth()).toBe("33%");
  });

  it("hides the label row when showLabel=false but still renders the progressbar with aria", () => {
    render(<ProgressBar currentStep={2} totalSteps={4} showLabel={false} />);

    expect(screen.queryByText("Step 2 of 4")).toBeNull();
    expect(screen.queryByText("50%")).toBeNull();

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "2");
    expect(bar).toHaveAttribute("aria-valuemax", "4");
    expect(bar).toHaveAttribute("aria-label", "Step 2 of 4");
    expect(getFillWidth()).toBe("50%");
  });

  it("appends className to the root element", () => {
    const { container } = render(
      <ProgressBar currentStep={1} totalSteps={4} className="my-custom-class" />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass("my-custom-class");
    expect(root).toHaveClass("space-y-2");
  });

  it("renders 100% when currentStep equals totalSteps", () => {
    render(<ProgressBar currentStep={4} totalSteps={4} />);

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(getFillWidth()).toBe("100%");

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "4");
    expect(bar).toHaveAttribute("aria-valuemax", "4");
  });
});
