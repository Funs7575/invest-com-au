import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import SectionHeading from "@/components/SectionHeading";

describe("SectionHeading", () => {
  it("renders eyebrow + title", () => {
    render(<SectionHeading eyebrow="OUR PICKS" title="The Top Brokers" />);
    expect(screen.getByText("OUR PICKS")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "The Top Brokers" }),
    ).toBeInTheDocument();
  });

  it("does not render the sub paragraph when sub is undefined", () => {
    const { container } = render(
      <SectionHeading eyebrow="x" title="y" />,
    );
    // Only the eyebrow <p> exists; no sub <p>.
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("renders the sub paragraph when provided", () => {
    render(
      <SectionHeading eyebrow="x" title="y" sub="A descriptive sub copy" />,
    );
    expect(
      screen.getByText("A descriptive sub copy"),
    ).toBeInTheDocument();
  });

  it("renders title as an h2 (correct section semantics)", () => {
    render(<SectionHeading eyebrow="x" title="Section Title" />);
    const heading = screen.getByRole("heading", { name: "Section Title" });
    expect(heading.tagName).toBe("H2");
  });
});
