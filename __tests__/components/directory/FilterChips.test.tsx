import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "../setup";
import FilterChips from "@/components/directory/FilterChips";

describe("FilterChips", () => {
  it("renders nothing when chips is empty", () => {
    const { container } = render(<FilterChips chips={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one button per chip with the supplied label", () => {
    render(
      <FilterChips
        chips={[
          { label: "Mining", onClear: () => {} },
          { label: "NSW", onClear: () => {} },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: /Mining/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /NSW/ })).toBeInTheDocument();
  });

  it("fires the per-chip onClear when its button is clicked", async () => {
    const user = userEvent.setup();
    const a = vi.fn();
    const b = vi.fn();
    render(
      <FilterChips
        chips={[
          { label: "Mining", onClear: a },
          { label: "NSW", onClear: b },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Remove Mining filter/ }));
    expect(a).toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it("uses the default 'Filtering:' prefix", () => {
    render(<FilterChips chips={[{ label: "X", onClear: () => {} }]} />);
    expect(screen.getByText("Filtering:")).toBeInTheDocument();
  });

  it("accepts a custom prefix", () => {
    render(
      <FilterChips
        chips={[{ label: "X", onClear: () => {} }]}
        prefix="Refining by:"
      />,
    );
    expect(screen.getByText("Refining by:")).toBeInTheDocument();
  });

  it("hides 'Clear all' when onClearAll is not supplied", () => {
    render(<FilterChips chips={[{ label: "X", onClear: () => {} }]} />);
    expect(screen.queryByRole("button", { name: /Clear all/ })).not.toBeInTheDocument();
  });

  it("renders 'Clear all' button when onClearAll is supplied", async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();
    render(
      <FilterChips
        chips={[{ label: "X", onClear: () => {} }]}
        onClearAll={onClearAll}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Clear all/ }));
    expect(onClearAll).toHaveBeenCalled();
  });

  it("exposes the region via aria-label", () => {
    render(<FilterChips chips={[{ label: "X", onClear: () => {} }]} />);
    expect(
      screen.getByRole("region", { name: "Active filters" }),
    ).toBeInTheDocument();
  });
});
