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

  // ── a11y: aria-expanded / aria-controls / inert (WCAG 2.4.3, 1.3.1) ──────────

  function renderCollapsed() {
    const utils = render(
      <CollapsibleSection collapsedHeight={100} totalCount={12} itemLabel="reviews">
        <div data-testid="body">
          <a href="/hidden-link">a link clipped below the fold</a>
        </div>
      </CollapsibleSection>,
    );
    const inner = utils.container.querySelector("div");
    Object.defineProperty(inner, "scrollHeight", { configurable: true, value: 600 });
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    return utils;
  }

  it("the collapsed toggle exposes aria-expanded=false and aria-controls", () => {
    renderCollapsed();
    const toggle = screen.getByRole("button", { name: /Show all 12 reviews/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const controls = toggle.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    // aria-controls must point at the actual content container.
    expect(document.getElementById(controls!)).toBeInTheDocument();
  });

  it("marks the clipped content inert so it is out of the tab order while collapsed", () => {
    renderCollapsed();
    const toggle = screen.getByRole("button", { name: /Show all 12 reviews/ });
    const region = document.getElementById(toggle.getAttribute("aria-controls")!);
    // React 19 renders the boolean `inert` prop as the `inert` attribute, which
    // takes the whole clipped subtree (and its links) out of the tab order.
    expect(region).toHaveAttribute("inert");
  });

  it("the expanded toggle exposes aria-expanded=true after Show all is clicked", () => {
    renderCollapsed();
    const showAll = screen.getByRole("button", { name: /Show all 12 reviews/ });
    act(() => {
      showAll.click();
    });
    const showLess = screen.getByRole("button", { name: /Show less/ });
    expect(showLess).toHaveAttribute("aria-expanded", "true");
    expect(showLess).toHaveAttribute("aria-controls");
    // Once expanded, the content is no longer inert (link is reachable).
    const controls = showLess.getAttribute("aria-controls")!;
    const region = document.getElementById(controls)!;
    expect(region).not.toHaveAttribute("inert");
  });
});
