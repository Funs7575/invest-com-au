import { describe, it, expect } from "vitest";
import { render } from "./setup";
import RiskWarningInline from "@/components/RiskWarningInline";

describe("RiskWarningInline", () => {
  it("renders a paragraph with non-trivial copy", () => {
    const { container } = render(<RiskWarningInline />);
    const p = container.querySelector("p");
    expect(p).not.toBeNull();
    expect(p?.textContent?.length ?? 0).toBeGreaterThan(10);
  });

  it("default (light) variant uses slate text", () => {
    const { container } = render(<RiskWarningInline />);
    expect(container.querySelector("p")?.className).toContain(
      "text-slate-400",
    );
  });

  it("dark variant uses white text", () => {
    const { container } = render(<RiskWarningInline variant="dark" />);
    expect(container.querySelector("p")?.className).toContain(
      "text-white/60",
    );
  });
});
