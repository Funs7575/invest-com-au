import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent } from "./setup";
import StarRatingInput from "@/components/StarRatingInput";

describe("StarRatingInput", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it("renders 5 star buttons", () => {
    render(<StarRatingInput value={0} onChange={onChange} />);

    const stars = screen.getAllByRole("radio");
    expect(stars).toHaveLength(5);
  });

  it("renders with correct aria-label for each star", () => {
    render(<StarRatingInput value={0} onChange={onChange} />);

    expect(screen.getByLabelText("1 star")).toBeInTheDocument();
    expect(screen.getByLabelText("2 stars")).toBeInTheDocument();
    expect(screen.getByLabelText("3 stars")).toBeInTheDocument();
    expect(screen.getByLabelText("4 stars")).toBeInTheDocument();
    expect(screen.getByLabelText("5 stars")).toBeInTheDocument();
  });

  it("renders radiogroup with label", () => {
    render(<StarRatingInput value={3} onChange={onChange} />);

    expect(screen.getByRole("radiogroup")).toHaveAttribute(
      "aria-label",
      "Star rating"
    );
  });

  it("marks the correct star as checked via aria-checked", () => {
    render(<StarRatingInput value={3} onChange={onChange} />);

    const stars = screen.getAllByRole("radio");
    // Only star 3 (index 2) should be aria-checked=true
    expect(stars[0]).toHaveAttribute("aria-checked", "false");
    expect(stars[1]).toHaveAttribute("aria-checked", "false");
    expect(stars[2]).toHaveAttribute("aria-checked", "true");
    expect(stars[3]).toHaveAttribute("aria-checked", "false");
    expect(stars[4]).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange with correct value when a star is clicked", async () => {
    const user = userEvent.setup();
    render(<StarRatingInput value={0} onChange={onChange} />);

    const star4 = screen.getByLabelText("4 stars");
    await user.click(star4);

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("calls onChange with 1 when first star is clicked", async () => {
    const user = userEvent.setup();
    render(<StarRatingInput value={0} onChange={onChange} />);

    await user.click(screen.getByLabelText("1 star"));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("calls onChange with 5 when last star is clicked", async () => {
    const user = userEvent.setup();
    render(<StarRatingInput value={0} onChange={onChange} />);

    await user.click(screen.getByLabelText("5 stars"));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("handles value of 0 (no stars selected)", () => {
    render(<StarRatingInput value={0} onChange={onChange} />);

    const stars = screen.getAllByRole("radio");
    // All should be unchecked
    stars.forEach((star) => {
      expect(star).toHaveAttribute("aria-checked", "false");
    });
  });

  it("handles value of 5 (all stars selected)", () => {
    render(<StarRatingInput value={5} onChange={onChange} />);

    const stars = screen.getAllByRole("radio");
    // Only star 5 has aria-checked=true
    expect(stars[4]).toHaveAttribute("aria-checked", "true");
  });

  it("fills stars visually up to the current value", () => {
    const { container } = render(
      <StarRatingInput value={3} onChange={onChange} />
    );

    // Stars 1-3 should be filled (fill="#f59e0b"), stars 4-5 unfilled (fill="none")
    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(5);

    // Stars 1-3 filled
    for (let i = 0; i < 3; i++) {
      const path = svgs[i].querySelector("path");
      expect(path?.getAttribute("fill")).toBe("#f59e0b");
    }
    // Stars 4-5 unfilled
    for (let i = 3; i < 5; i++) {
      const path = svgs[i].querySelector("path");
      expect(path?.getAttribute("fill")).toBe("none");
    }
  });

  it("navigates with ArrowRight key to increase rating", async () => {
    const user = userEvent.setup();
    render(<StarRatingInput value={3} onChange={onChange} />);

    const star3 = screen.getByLabelText("3 stars");
    star3.focus();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("navigates with ArrowLeft key to decrease rating", async () => {
    const user = userEvent.setup();
    render(<StarRatingInput value={3} onChange={onChange} />);

    const star3 = screen.getByLabelText("3 stars");
    star3.focus();
    await user.keyboard("{ArrowLeft}");

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("clamps ArrowRight at maximum of 5", async () => {
    const user = userEvent.setup();
    render(<StarRatingInput value={5} onChange={onChange} />);

    const star5 = screen.getByLabelText("5 stars");
    star5.focus();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("clamps ArrowLeft at minimum of 1", async () => {
    const user = userEvent.setup();
    render(<StarRatingInput value={1} onChange={onChange} />);

    const star1 = screen.getByLabelText("1 star");
    star1.focus();
    await user.keyboard("{ArrowLeft}");

    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("navigates with ArrowUp key (same as ArrowRight)", async () => {
    const user = userEvent.setup();
    render(<StarRatingInput value={2} onChange={onChange} />);

    const star2 = screen.getByLabelText("2 stars");
    star2.focus();
    await user.keyboard("{ArrowUp}");

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("navigates with ArrowDown key (same as ArrowLeft)", async () => {
    const user = userEvent.setup();
    render(<StarRatingInput value={4} onChange={onChange} />);

    const star4 = screen.getByLabelText("4 stars");
    star4.focus();
    await user.keyboard("{ArrowDown}");

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("sets correct tabIndex for roving tabindex pattern", () => {
    render(<StarRatingInput value={3} onChange={onChange} />);

    const stars = screen.getAllByRole("radio");
    // Only the selected star (3rd, index 2) should have tabIndex=0
    expect(stars[0]).toHaveAttribute("tabindex", "-1");
    expect(stars[1]).toHaveAttribute("tabindex", "-1");
    expect(stars[2]).toHaveAttribute("tabindex", "0");
    expect(stars[3]).toHaveAttribute("tabindex", "-1");
    expect(stars[4]).toHaveAttribute("tabindex", "-1");
  });

  it("first star has tabIndex=0 when value is 0 (no selection)", () => {
    render(<StarRatingInput value={0} onChange={onChange} />);

    const stars = screen.getAllByRole("radio");
    expect(stars[0]).toHaveAttribute("tabindex", "0");
    expect(stars[1]).toHaveAttribute("tabindex", "-1");
  });

  it("renders with sm size class", () => {
    const { container } = render(
      <StarRatingInput value={3} onChange={onChange} size="sm" />
    );

    const buttons = container.querySelectorAll("button");
    buttons.forEach((btn) => {
      expect(btn.className).toContain("w-5");
      expect(btn.className).toContain("h-5");
    });
  });

  it("renders with lg size class", () => {
    const { container } = render(
      <StarRatingInput value={3} onChange={onChange} size="lg" />
    );

    const buttons = container.querySelectorAll("button");
    buttons.forEach((btn) => {
      expect(btn.className).toContain("w-9");
      expect(btn.className).toContain("h-9");
    });
  });

  it("defaults to md size when size prop is not provided", () => {
    const { container } = render(
      <StarRatingInput value={3} onChange={onChange} />
    );

    const buttons = container.querySelectorAll("button");
    buttons.forEach((btn) => {
      expect(btn.className).toContain("w-7");
      expect(btn.className).toContain("h-7");
    });
  });
});
