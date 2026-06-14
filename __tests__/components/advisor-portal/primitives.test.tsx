import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import {
  StatCard,
  MiniBarChart,
  EmptyState,
  StatusPill,
  ProgressBar,
  SectionCard,
} from "@/app/advisor-portal/ui/primitives";

describe("advisor-portal primitives", () => {
  it("StatCard renders label, value and sub", () => {
    render(<StatCard label="Profile views" value="244" sub="last 30 days" />);
    expect(screen.getByText("Profile views")).toBeInTheDocument();
    expect(screen.getByText("244")).toBeInTheDocument();
    expect(screen.getByText("last 30 days")).toBeInTheDocument();
  });

  it("StatCard shows a positive delta in emerald and hides a zero delta", () => {
    const { rerender } = render(<StatCard label="Enquiries" value="9" delta={3} />);
    const delta = screen.getByText("+3");
    expect(delta).toBeInTheDocument();
    expect(delta.className).toContain("emerald");
    rerender(<StatCard label="Enquiries" value="9" delta={0} />);
    expect(screen.queryByText("+0")).toBeNull();
  });

  it("MiniBarChart renders an inline empty state (never disappears) when there's no data", () => {
    render(<MiniBarChart data={[]} emptyLabel="No enquiries yet." />);
    expect(screen.getByText("No enquiries yet.")).toBeInTheDocument();
  });

  it("MiniBarChart renders bars + values when data is present", () => {
    render(
      <MiniBarChart
        data={[
          { label: "1 Jun", value: 4 },
          { label: "8 Jun", value: 7 },
        ]}
      />,
    );
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("8 Jun")).toBeInTheDocument();
  });

  it("StatusPill renders the status label", () => {
    render(<StatusPill status="converted" />);
    expect(screen.getByText("converted")).toBeInTheDocument();
  });

  it("EmptyState renders title, body and a CTA link", () => {
    render(
      <EmptyState title="No reviews yet" cta={{ label: "Share link", href: "/advisor/x", external: true }}>
        Ask happy clients to review you.
      </EmptyState>,
    );
    expect(screen.getByText("No reviews yet")).toBeInTheDocument();
    expect(screen.getByText("Ask happy clients to review you.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /share link/i });
    expect(link).toHaveAttribute("href", "/advisor/x");
  });

  it("ProgressBar clamps the fill width to 0–100%", () => {
    const { container, rerender } = render(<ProgressBar value={150} />);
    expect((container.querySelector("[style*='width']") as HTMLElement)?.style.width).toBe("100%");
    rerender(<ProgressBar value={-20} />);
    expect((container.querySelector("[style*='width']") as HTMLElement)?.style.width).toBe("0%");
  });

  it("SectionCard renders its title, action and children", () => {
    render(
      <SectionCard title="Recent enquiries" action={<button>View all</button>}>
        <p>body content</p>
      </SectionCard>,
    );
    expect(screen.getByText("Recent enquiries")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View all" })).toBeInTheDocument();
    expect(screen.getByText("body content")).toBeInTheDocument();
  });
});
