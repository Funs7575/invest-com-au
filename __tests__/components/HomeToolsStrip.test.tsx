import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";

import HomeToolsStrip from "@/components/HomeToolsStrip";

describe("HomeToolsStrip", () => {
  it("renders all tools in default order when no featuredHrefs prop", () => {
    render(<HomeToolsStrip />);
    // First tool in the default list should appear first by DOM order.
    const tools = screen.getAllByRole("link");
    // Filter out the "See all 25" link
    const toolLinks = tools.filter((l) => /\/.*-calculator|\/portfolio-xray|\/property\/foreign-investment/.test(l.getAttribute("href") ?? ""));
    expect(toolLinks.length).toBeGreaterThanOrEqual(8);
    // Default first: Switching Calculator
    expect(toolLinks[0]).toHaveTextContent(/Switching Calculator/);
  });

  it("hoists featured tools to the front, preserving their order in the prop", () => {
    render(
      <HomeToolsStrip
        featuredHrefs={["/cgt-calculator", "/property/foreign-investment"]}
      />,
    );
    const tools = screen.getAllByRole("link").filter((l) =>
      /\/.*-calculator|\/portfolio-xray|\/property\/foreign-investment/.test(l.getAttribute("href") ?? ""),
    );
    // Hoisted in the order given
    expect(tools[0]).toHaveTextContent(/CGT Calculator/);
    expect(tools[1]).toHaveTextContent(/FIRB Cost Calculator/);
    // Non-hoisted tools still render after, in their original order.
    // Switching Calculator is the original-list-first non-hoisted entry.
    expect(tools[2]).toHaveTextContent(/Switching Calculator/);
  });

  it("ignores featuredHrefs entries that don't match any existing tool", () => {
    // Country configs may reference slugs that don't yet exist in the
    // global tools list (e.g., HK's WHT calc). Unmatched hrefs are
    // silently dropped — the strip never invents a new tool.
    render(
      <HomeToolsStrip
        featuredHrefs={["/withholding-tax-calculator", "/cgt-calculator"]}
      />,
    );
    const tools = screen.getAllByRole("link").filter((l) =>
      /\/.*-calculator|\/portfolio-xray|\/property\/foreign-investment/.test(l.getAttribute("href") ?? ""),
    );
    // Only CGT was matched; first tool is CGT
    expect(tools[0]).toHaveTextContent(/CGT Calculator/);
    // Strip never shrinks — full 8-tool count preserved
    expect(tools.length).toBeGreaterThanOrEqual(8);
  });

  it("renders the same 8 tools regardless of featuredHrefs (re-rank, never replace)", () => {
    const defaultRender = render(<HomeToolsStrip />).container.querySelectorAll("a[href^='/']");
    const featuredRender = render(
      <HomeToolsStrip featuredHrefs={["/cgt-calculator"]} />,
    ).container.querySelectorAll("a[href^='/']");
    // Same number of links — Country Mode never shrinks the tool set
    expect(featuredRender.length).toBe(defaultRender.length);
  });
});
