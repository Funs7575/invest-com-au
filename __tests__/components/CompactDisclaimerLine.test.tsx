import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";

describe("CompactDisclaimerLine", () => {
  it("renders the info-icon link pointing at /how-we-earn", () => {
    render(<CompactDisclaimerLine />);
    const link = screen.getByRole("link", {
      name: "Important disclaimers",
    });
    expect(link).toHaveAttribute("href", "/how-we-earn");
  });

  it("light variant applies slate text classes", () => {
    const { container } = render(<CompactDisclaimerLine />);
    expect(container.querySelector("p")?.className).toContain("text-slate-400");
  });

  it("dark variant applies white text classes", () => {
    const { container } = render(<CompactDisclaimerLine variant="dark" />);
    expect(container.querySelector("p")?.className).toContain("text-white/50");
  });

  it("uses the dark-variant link colour", () => {
    render(<CompactDisclaimerLine variant="dark" />);
    const link = screen.getByRole("link", {
      name: "Important disclaimers",
    });
    expect(link.className).toContain("text-white/60");
  });

  it("marks the inline svg icon aria-hidden", () => {
    const { container } = render(<CompactDisclaimerLine />);
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
