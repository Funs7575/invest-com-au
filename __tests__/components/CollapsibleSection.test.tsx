import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "./setup";
import CollapsibleSection from "@/components/CollapsibleSection";

describe("CollapsibleSection", () => {
  beforeEach(() => {
    // Mock window.matchMedia to mobile by default
    window.matchMedia = ((query: string) => ({
      matches: query.includes("max-width: 767px"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  });

  it("renders children uncollapsed when content is short (no Show all button)", () => {
    // jsdom's default scrollHeight = 0 → short content path
    render(
      <CollapsibleSection totalCount={3} itemLabel="reviews">
        <p>short content</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText("short content")).toBeInTheDocument();
    expect(screen.queryByText(/Show all/)).not.toBeInTheDocument();
  });

  it("shows the expand CTA when mobile + scrollHeight exceeds collapsedHeight+80", () => {
    // Force-seed a long scrollHeight on the div that mounts
    const { container } = render(
      <CollapsibleSection collapsedHeight={100} totalCount={42} itemLabel="stories">
        <div>long content</div>
      </CollapsibleSection>,
    );
    const inner = container.querySelector("div");
    Object.defineProperty(inner, "scrollHeight", { configurable: true, value: 500 });
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(screen.getByText(/Show all 42 stories/)).toBeInTheDocument();
  });

  it("hides the Show-all CTA and renders full content after clicking expand", () => {
    const { container } = render(
      <CollapsibleSection collapsedHeight={100} totalCount={10} itemLabel="changes">
        <div data-testid="big">big content here</div>
      </CollapsibleSection>,
    );
    // Seed scrollHeight large enough to trigger collapse
    const inner = container.querySelector("div");
    Object.defineProperty(inner, "scrollHeight", { configurable: true, value: 500 });
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    // The Show-all CTA is visible
    const cta = screen.getByText(/Show all 10 changes/);
    act(() => {
      cta.click();
    });
    // After expansion, children stay rendered (the collapsed body becomes the
    // always-visible render path)
    expect(screen.getByTestId("big")).toBeInTheDocument();
  });

  it("ignores the collapse on non-mobile viewports", () => {
    // Override matchMedia to return not-mobile
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    const { container } = render(
      <CollapsibleSection collapsedHeight={100} totalCount={5} itemLabel="items">
        <div>desktop content</div>
      </CollapsibleSection>,
    );
    const inner = container.querySelector("div");
    Object.defineProperty(inner, "scrollHeight", { configurable: true, value: 1000 });
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    // No expand button on desktop
    expect(screen.queryByText(/Show all/)).not.toBeInTheDocument();
  });

  it("defaults collapsedHeight to 400 when not provided", () => {
    // Implicit: rendered content under 480 total should not collapse
    const { container } = render(
      <CollapsibleSection totalCount={1} itemLabel="x">
        <div>short</div>
      </CollapsibleSection>,
    );
    const inner = container.querySelector("div");
    Object.defineProperty(inner, "scrollHeight", { configurable: true, value: 450 }); // under 400+80 threshold
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(screen.queryByText(/Show all/)).not.toBeInTheDocument();
  });
});
