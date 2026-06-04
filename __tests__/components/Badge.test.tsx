import { describe, it, expect } from "vitest";
import { render } from "./setup";
import { Badge } from "@/components/ui/Badge";

function span(container: HTMLElement): HTMLSpanElement {
  const el = container.querySelector("span");
  if (!el) throw new Error("Badge did not render a <span>");
  return el as HTMLSpanElement;
}

describe("Badge", () => {
  it("renders its children text", () => {
    const { getByText } = render(<Badge>New</Badge>);
    expect(getByText("New")).toBeInTheDocument();
  });

  it("applies the default variant and md size classes", () => {
    const { container } = render(<Badge>Default</Badge>);
    const cls = span(container).className;
    expect(cls).toContain("bg-slate-100");
    expect(cls).toContain("text-slate-700");
    // md size
    expect(cls).toContain("px-2.5");
    expect(cls).toContain("py-1");
    expect(cls).toContain("text-xs");
  });

  it("applies the gold variant border class", () => {
    const { container } = render(<Badge variant="gold">Gold</Badge>);
    const cls = span(container).className;
    expect(cls).toContain("border-amber-200");
    expect(cls).toContain("bg-amber-50");
    expect(cls).toContain("text-amber-800");
  });

  it("applies the error variant background class", () => {
    const { container } = render(<Badge variant="error">Error</Badge>);
    const cls = span(container).className;
    expect(cls).toContain("bg-red-100");
    expect(cls).toContain("text-red-700");
  });

  it("applies the sm size classes", () => {
    const { container } = render(<Badge size="sm">Small</Badge>);
    const cls = span(container).className;
    expect(cls).toContain("px-2");
    expect(cls).toContain("py-0.5");
    expect(cls).toContain("text-[0.65rem]");
  });

  it("appends a custom className", () => {
    const { container } = render(<Badge className="uppercase tracking-wide">Custom</Badge>);
    const cls = span(container).className;
    expect(cls).toContain("uppercase");
    expect(cls).toContain("tracking-wide");
    // still carries the base classes
    expect(cls).toContain("rounded-full");
    expect(cls).toContain("inline-flex");
  });
});
