// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressRing from "@/components/ui/ProgressRing";

describe("ProgressRing", () => {
  it("renders as an image with the accessible label", () => {
    render(<ProgressRing value={60} label="Profile 60% complete" />);
    expect(screen.getByRole("img", { name: "Profile 60% complete" })).toBeTruthy();
  });

  it("renders the centre slot", () => {
    render(
      <ProgressRing value={42} label="Progress">
        <span>42%</span>
      </ProgressRing>,
    );
    expect(screen.getByText("42%")).toBeTruthy();
  });

  it("clamps out-of-range values without crashing", () => {
    const { rerender } = render(<ProgressRing value={150} label="Over" />);
    rerender(<ProgressRing value={-20} label="Under" />);
    expect(screen.getByRole("img", { name: "Under" })).toBeTruthy();
  });
});
