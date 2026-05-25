import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "../setup";
import EmptyState from "@/components/directory/EmptyState";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState title="No advisors found" />);
    expect(screen.getByText("No advisors found")).toBeInTheDocument();
  });

  it("renders the body when supplied", () => {
    render(
      <EmptyState
        title="No advisors found"
        body="Try removing some filters."
      />,
    );
    expect(screen.getByText("Try removing some filters.")).toBeInTheDocument();
  });

  it("exposes the result region via aria-label", () => {
    render(<EmptyState title="x" />);
    expect(screen.getByRole("region", { name: "No results" })).toBeInTheDocument();
  });

  it("renders suggestions as buttons and fires onClick on each", async () => {
    const user = userEvent.setup();
    const a = vi.fn();
    const b = vi.fn();
    render(
      <EmptyState
        title="x"
        suggestions={[
          { label: "Remove SIV filter (+12)", onClick: a },
          { label: "Expand radius (+48)", onClick: b },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Remove SIV filter/ }));
    expect(a).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Expand radius/ }));
    expect(b).toHaveBeenCalled();
  });

  it("does not render a suggestions list when none supplied", () => {
    render(<EmptyState title="x" />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders children below suggestions for custom actions", () => {
    render(
      <EmptyState
        title="x"
        suggestions={[{ label: "y", onClick: () => {} }]}
      >
        <div data-testid="custom-action">Set alert</div>
      </EmptyState>,
    );
    expect(screen.getByTestId("custom-action")).toBeInTheDocument();
  });

  describe("ctas prop (link-based CTAs)", () => {
    it("renders primary CTA as a link with correct href", () => {
      render(
        <EmptyState
          title="Empty watchlist"
          ctas={[{ label: "Browse brokers", href: "/brokers" }]}
        />,
      );
      const link = screen.getByRole("link", { name: "Browse brokers" });
      expect(link).toHaveAttribute("href", "/brokers");
    });

    it("renders multiple CTAs in order", () => {
      render(
        <EmptyState
          title="x"
          ctas={[
            { label: "Primary CTA", href: "/primary" },
            { label: "Secondary CTA", href: "/secondary", variant: "secondary" },
          ]}
        />,
      );
      expect(screen.getByRole("link", { name: "Primary CTA" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Secondary CTA" })).toBeInTheDocument();
    });

    it("applies different styles for primary vs secondary variant", () => {
      render(
        <EmptyState
          title="x"
          ctas={[
            { label: "Primary", href: "/a", variant: "primary" },
            { label: "Secondary", href: "/b", variant: "secondary" },
          ]}
        />,
      );
      const primary = screen.getByRole("link", { name: "Primary" });
      const secondary = screen.getByRole("link", { name: "Secondary" });
      // Primary has dark background class; secondary has border class
      expect(primary.className).toContain("bg-slate-900");
      expect(secondary.className).toContain("border-slate-200");
    });

    it("does not render a CTA container when ctas is absent", () => {
      render(<EmptyState title="x" />);
      // No links should appear (beyond the component itself)
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("renders both suggestions and ctas when both supplied", () => {
      const handleClick = vi.fn();
      render(
        <EmptyState
          title="x"
          suggestions={[{ label: "Remove filter", onClick: handleClick }]}
          ctas={[{ label: "Browse", href: "/browse" }]}
        />,
      );
      expect(screen.getByRole("button", { name: "Remove filter" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Browse" })).toBeInTheDocument();
    });
  });
});
