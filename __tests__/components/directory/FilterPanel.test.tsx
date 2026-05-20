import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "../setup";
import FilterPanel from "@/components/directory/FilterPanel";

describe("FilterPanel — inline variant", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(
      <FilterPanel
        open={false}
        onClose={() => {}}
        variant="inline"
      >
        <div>section</div>
      </FilterPanel>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the section + heading when open", () => {
    render(
      <FilterPanel
        open
        onClose={() => {}}
        variant="inline"
        heading="Refine"
      >
        <div>section content</div>
      </FilterPanel>,
    );
    expect(screen.getByRole("heading", { name: /Refine/ })).toBeInTheDocument();
    expect(screen.getByText("section content")).toBeInTheDocument();
  });

  it("shows '(N active)' next to the heading when activeCount > 0", () => {
    render(
      <FilterPanel
        open
        onClose={() => {}}
        variant="inline"
        activeCount={3}
      >
        <div />
      </FilterPanel>,
    );
    expect(screen.getByText(/3 active/)).toBeInTheDocument();
  });

  it("hides the Clear-all button when activeCount is 0", () => {
    render(
      <FilterPanel
        open
        onClose={() => {}}
        onClearAll={() => {}}
        variant="inline"
        activeCount={0}
      >
        <div />
      </FilterPanel>,
    );
    expect(screen.queryByRole("button", { name: /Clear all/ })).not.toBeInTheDocument();
  });

  it("fires onClearAll when the clear button is clicked", async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();
    render(
      <FilterPanel
        open
        onClose={() => {}}
        onClearAll={onClearAll}
        variant="inline"
        activeCount={2}
      >
        <div />
      </FilterPanel>,
    );
    await user.click(screen.getByRole("button", { name: /Clear all/ }));
    expect(onClearAll).toHaveBeenCalled();
  });
});

describe("FilterPanel — drawer variant", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <FilterPanel
        open={false}
        onClose={() => {}}
        variant="drawer"
      >
        <div>x</div>
      </FilterPanel>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a dialog with aria-modal=true when open", () => {
    render(
      <FilterPanel
        open
        onClose={() => {}}
        variant="drawer"
      >
        <div>section</div>
      </FilterPanel>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("fires onClose when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <FilterPanel
        open
        onClose={onClose}
        variant="drawer"
      >
        <div />
      </FilterPanel>,
    );
    await user.click(screen.getByLabelText("Close filter drawer"));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders 'Show N results' when resultCount supplied", () => {
    render(
      <FilterPanel
        open
        onClose={() => {}}
        variant="drawer"
        resultCount={42}
      >
        <div />
      </FilterPanel>,
    );
    expect(screen.getByRole("button", { name: /Show 42 results/ })).toBeInTheDocument();
  });
});
