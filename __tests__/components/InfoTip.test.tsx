import { describe, it, expect } from "vitest";
import { fireEvent } from "@testing-library/react";
import { render, screen, act } from "./setup";
import InfoTip from "@/components/InfoTip";

/**
 * InfoTip is the ⓘ icon next to form labels across the calculators
 * and quiz flows. The trigger is a button so keyboard + SR users can
 * activate it; the tooltip content is the prop. Hover, click, and
 * outside-click close are all important behaviours to pin.
 */
describe("InfoTip", () => {
  it("renders the trigger button with aria-label='More info'", () => {
    render(<InfoTip text="Hello tip" />);
    expect(screen.getByRole("button", { name: "More info" })).toBeInTheDocument();
  });

  it("tooltip text is hidden initially", () => {
    render(<InfoTip text="Hello tip" />);
    expect(screen.queryByText("Hello tip")).not.toBeInTheDocument();
  });

  it("opens on mouseEnter", () => {
    render(<InfoTip text="Hello tip" />);
    const trigger = screen.getByRole("button", { name: "More info" });
    fireEvent.mouseEnter(trigger);
    expect(screen.getByText("Hello tip")).toBeInTheDocument();
  });

  it("closes on mouseLeave", () => {
    render(<InfoTip text="Hello tip" />);
    const trigger = screen.getByRole("button", { name: "More info" });
    fireEvent.mouseEnter(trigger);
    expect(screen.getByText("Hello tip")).toBeInTheDocument();
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByText("Hello tip")).not.toBeInTheDocument();
  });

  it("clicking outside while the tooltip is open closes it", () => {
    render(
      <div>
        <InfoTip text="Hello tip" />
        <button>outside</button>
      </div>,
    );
    const trigger = screen.getByRole("button", { name: "More info" });
    fireEvent.mouseEnter(trigger);
    expect(screen.getByText("Hello tip")).toBeInTheDocument();

    // Outside-click closes via the document mousedown handler.
    act(() => {
      document.body.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true }),
      );
    });
    expect(screen.queryByText("Hello tip")).not.toBeInTheDocument();
  });

  it("applies the supplied className to the outer wrapper", () => {
    const { container } = render(
      <InfoTip text="x" className="marker-class" />,
    );
    expect(container.firstElementChild).toHaveClass("marker-class");
  });
});
