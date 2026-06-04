/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { FilterPill, FilterPopover } from "@/components/directory/FilterPill";

vi.mock("@/components/Icon", () => ({
  default: ({ name, ...rest }: { name: string; [key: string]: unknown }) => (
    <span data-testid={`icon-${name}`} {...rest} />
  ),
}));

// Generous timeout: the first jsdom render in a worker can take >5s under heavy
// concurrent-CI machine load (the default testTimeout). The test bodies are all
// synchronous — this only guards against environment-setup contention, not slow logic.
describe("FilterPill", { timeout: 20000 }, () => {
  const baseProps = {
    icon: "map-pin",
    label: "State",
    active: false,
    open: false,
    onClick: () => {},
  };

  it("renders the label and the named icon", () => {
    render(<FilterPill {...baseProps} />);
    expect(screen.getByText("State")).toBeInTheDocument();
    expect(screen.getByTestId("icon-map-pin")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<FilterPill {...baseProps} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("active=true uses amber active classes and aria-expanded reflects the open prop", () => {
    render(<FilterPill {...baseProps} active open />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(btn.className).toContain("border-amber-400");
    expect(btn.className).toContain("bg-amber-50");
    expect(btn.className).toContain("text-amber-800");
  });

  it("active=false uses slate classes and aria-expanded reflects open=false", () => {
    render(<FilterPill {...baseProps} active={false} open={false} />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(btn.className).toContain("border-slate-200");
    expect(btn.className).toContain("text-slate-700");
    expect(btn.className).not.toContain("border-amber-400");
  });

  it("aria-expanded tracks `open` independently of `active`", () => {
    // active but closed
    const { rerender } = render(<FilterPill {...baseProps} active open={false} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    // inactive but open
    rerender(<FilterPill {...baseProps} active={false} open />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });

  it("renders a '· value' suffix when value is provided", () => {
    render(<FilterPill {...baseProps} value="NSW" />);
    expect(screen.getByText("· NSW")).toBeInTheDocument();
  });

  it("renders no value suffix when value is absent", () => {
    render(<FilterPill {...baseProps} />);
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it("disabled=true sets the disabled attribute and clicking does not fire onClick", () => {
    const onClick = vi.fn();
    render(<FilterPill {...baseProps} disabled onClick={onClick} />);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("rotates the chevron only when open", () => {
    const { rerender } = render(<FilterPill {...baseProps} open={false} />);
    expect(screen.getByTestId("icon-chevron-down").className).not.toContain("rotate-180");

    rerender(<FilterPill {...baseProps} open />);
    expect(screen.getByTestId("icon-chevron-down").className).toContain("rotate-180");
  });
});

describe("FilterPopover", { timeout: 20000 }, () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders nothing when open=false", () => {
    const { container } = render(
      <FilterPopover open={false} onClose={() => {}} label="State filter">
        <p>panel body</p>
      </FilterPopover>,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("panel body")).not.toBeInTheDocument();
  });

  it("renders a dialog with aria-label and children when open=true", () => {
    render(
      <FilterPopover open onClose={() => {}} label="State filter">
        <p>panel body</p>
      </FilterPopover>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "State filter");
    expect(screen.getByText("panel body")).toBeInTheDocument();
  });

  it("fires onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <FilterPopover open onClose={onClose} label="State filter">
        <p>body</p>
      </FilterPopover>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClose for non-Escape keys", () => {
    const onClose = vi.fn();
    render(
      <FilterPopover open onClose={onClose} label="State filter">
        <p>body</p>
      </FilterPopover>,
    );
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("fires onClose on a mousedown OUTSIDE the positioned wrapper", () => {
    const onClose = vi.fn();
    // Render inside a positioned wrapper so ref.current.parentElement is the boundary.
    render(
      <div className="relative" data-testid="wrapper">
        <FilterPopover open onClose={onClose} label="State filter">
          <button>option</button>
        </FilterPopover>
      </div>,
    );
    // mousedown on body (outside the wrapper) -> close
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire onClose on a mousedown INSIDE the popover", () => {
    const onClose = vi.fn();
    render(
      <div className="relative" data-testid="wrapper">
        <FilterPopover open onClose={onClose} label="State filter">
          <button>option</button>
        </FilterPopover>
      </div>,
    );
    // mousedown on a child node inside the popover -> stay open
    fireEvent.mouseDown(screen.getByText("option"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does NOT fire onClose on a mousedown on a SIBLING inside the same wrapper (e.g. the trigger)", () => {
    const onClose = vi.fn();
    render(
      <div className="relative" data-testid="wrapper">
        <button data-testid="trigger">State</button>
        <FilterPopover open onClose={onClose} label="State filter">
          <button>option</button>
        </FilterPopover>
      </div>,
    );
    // The boundary is the wrapper, which also holds the trigger pill.
    fireEvent.mouseDown(screen.getByTestId("trigger"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("removes its document listeners on unmount (no onClose after teardown)", () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <div className="relative">
        <FilterPopover open onClose={onClose} label="State filter">
          <button>option</button>
        </FilterPopover>
      </div>,
    );
    unmount();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.mouseDown(document.body);
    expect(onClose).not.toHaveBeenCalled();
  });
});
