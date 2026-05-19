import { describe, it, expect } from "vitest";
import { render, screen, userEvent } from "./setup";
import CompactDisclosure from "@/components/CompactDisclosure";

/**
 * CompactDisclosure renders the full compliance copy chain
 * (General Advice / Affiliate / Crypto / Regulatory / AFSL) as a
 * sequence of disclosable sections. The contract that matters is:
 *
 *   - All 5 headings render
 *   - Only ONE section opens at a time
 *   - Re-clicking the open section closes it
 *   - aria-expanded reflects the open state
 */
describe("CompactDisclosure", () => {
  it("renders all 5 section headings", () => {
    render(<CompactDisclosure />);
    expect(
      screen.getByRole("button", { name: /General Advice Warning/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Affiliate Disclosure/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Crypto Warning/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Regulatory Note/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /AFSL Status/ }),
    ).toBeInTheDocument();
  });

  it("starts with every section closed (no body paragraphs rendered)", () => {
    const { container } = render(<CompactDisclosure />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("expands a section when its header is clicked", async () => {
    const user = userEvent.setup();
    render(<CompactDisclosure />);
    const header = screen.getByRole("button", { name: /General Advice Warning/ });
    expect(header).toHaveAttribute("aria-expanded", "false");
    await user.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
  });

  it("collapses an open section when its header is clicked again", async () => {
    const user = userEvent.setup();
    render(<CompactDisclosure />);
    const header = screen.getByRole("button", { name: /Affiliate Disclosure/ });
    await user.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
    await user.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
  });

  it("only allows one section open at a time", async () => {
    const user = userEvent.setup();
    render(<CompactDisclosure />);
    const first = screen.getByRole("button", { name: /General Advice Warning/ });
    const second = screen.getByRole("button", { name: /Affiliate Disclosure/ });
    await user.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    await user.click(second);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(second).toHaveAttribute("aria-expanded", "true");
  });
});
