import { describe, it, expect, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
import { render, screen, userEvent } from "../setup";
import RangeSlider from "@/components/directory/RangeSlider";

describe("RangeSlider", () => {
  it("renders label, current value (formatted), and min/max bounds", () => {
    render(
      <RangeSlider
        label="Max MER"
        min={0.03}
        max={2.0}
        step={0.01}
        value={1.0}
        onChange={() => {}}
        formatValue={(v) => `${v.toFixed(2)}%`}
      />,
    );
    expect(screen.getByText("Max MER")).toBeInTheDocument();
    // formatted current value should be present
    expect(screen.getByText("1.00%")).toBeInTheDocument();
    // min and max labels too
    expect(screen.getByText("0.03%")).toBeInTheDocument();
    expect(screen.getByText("2.00%")).toBeInTheDocument();
  });

  it("fires onChange with a number when the slider moves", () => {
    const onChange = vi.fn();
    render(
      <RangeSlider
        label="Radius"
        min={0}
        max={100}
        value={25}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("slider"), { target: { value: "50" } });
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it("snaps to preset value when preset chip is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RangeSlider
        label="Radius"
        min={0}
        max={200}
        value={25}
        onChange={onChange}
        presets={[
          { label: "10km", value: 10 },
          { label: "50km", value: 50 },
          { label: "Any", value: 0 },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "50km" }));
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it("marks the matching preset chip with aria-pressed=true", () => {
    render(
      <RangeSlider
        label="Radius"
        min={0}
        max={200}
        value={50}
        onChange={() => {}}
        presets={[
          { label: "10km", value: 10 },
          { label: "50km", value: 50 },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "50km" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "10km" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
