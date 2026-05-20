import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "../setup";
import TabBar from "@/components/directory/TabBar";

const TABS = [
  { id: "all", label: "All", count: 10 },
  { id: "active", label: "Active", count: 6 },
  { id: "closed", label: "Closed", count: 4 },
  { id: "empty", label: "Empty", count: 0 },
];

describe("TabBar — segmented variant", () => {
  it("renders all tabs with role tablist/tab semantics", () => {
    render(
      <TabBar
        tabs={TABS}
        value="all"
        onChange={() => {}}
        ariaLabel="Status"
        variant="segmented"
        zeroCountBehavior="show"
      />,
    );
    expect(screen.getByRole("tablist", { name: "Status" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(4);
  });

  it("marks the active tab with aria-selected", () => {
    render(
      <TabBar
        tabs={TABS}
        value="active"
        onChange={() => {}}
        ariaLabel="Status"
        variant="segmented"
        zeroCountBehavior="show"
      />,
    );
    expect(screen.getByRole("tab", { name: /Active/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("fires onChange with the tab id when a tab is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TabBar
        tabs={TABS}
        value="all"
        onChange={onChange}
        ariaLabel="Status"
        variant="segmented"
        zeroCountBehavior="show"
      />,
    );
    await user.click(screen.getByRole("tab", { name: /Active/ }));
    expect(onChange).toHaveBeenCalledWith("active");
  });
});

describe("TabBar — zero-count behaviour", () => {
  it("hides zero-count tabs by default", () => {
    render(
      <TabBar
        tabs={TABS}
        value="all"
        onChange={() => {}}
        ariaLabel="Status"
        variant="segmented"
      />,
    );
    expect(screen.queryByRole("tab", { name: /Empty/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("disables zero-count tabs when behaviour is 'disable'", () => {
    render(
      <TabBar
        tabs={TABS}
        value="all"
        onChange={() => {}}
        ariaLabel="Status"
        variant="segmented"
        zeroCountBehavior="disable"
      />,
    );
    const emptyTab = screen.getByRole("tab", { name: /Empty/ });
    expect(emptyTab).toBeDisabled();
  });

  it("shows zero-count tabs as enabled when behaviour is 'show'", () => {
    render(
      <TabBar
        tabs={TABS}
        value="all"
        onChange={() => {}}
        ariaLabel="Status"
        variant="segmented"
        zeroCountBehavior="show"
      />,
    );
    const emptyTab = screen.getByRole("tab", { name: /Empty/ });
    expect(emptyTab).not.toBeDisabled();
  });

  it("respects alwaysShow — never hides that tab even with count=0", () => {
    const tabs = [
      { id: "all", label: "All", count: 0 },
      { id: "x", label: "X", count: 5 },
    ];
    render(
      <TabBar
        tabs={tabs}
        value="all"
        onChange={() => {}}
        ariaLabel="Status"
        variant="segmented"
        alwaysShow="all"
      />,
    );
    expect(screen.getByRole("tab", { name: /All/ })).toBeInTheDocument();
  });
});

describe("TabBar — chip variant", () => {
  it("renders chip-style tabs with tablist semantics", () => {
    render(
      <TabBar
        tabs={TABS}
        value="all"
        onChange={() => {}}
        ariaLabel="Category"
        variant="chip"
        zeroCountBehavior="show"
      />,
    );
    expect(screen.getByRole("tablist", { name: "Category" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(4);
  });
});

describe("TabBar — empty universe", () => {
  it("renders nothing when every tab is filtered out", () => {
    const tabs = [{ id: "x", label: "X", count: 0 }];
    const { container } = render(
      <TabBar
        tabs={tabs}
        value="x"
        onChange={() => {}}
        ariaLabel="Empty"
        variant="segmented"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
