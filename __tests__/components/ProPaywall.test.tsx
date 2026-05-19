import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import ProPaywall from "@/components/ProPaywall";

describe("ProPaywall", () => {
  it("renders default title + CTA pointing at /pro", () => {
    render(<ProPaywall />);
    expect(screen.getByText("Unlock with Invest Pro")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /upgrade to pro/i });
    expect(cta).toHaveAttribute("href", "/pro");
  });

  it("renders custom title + description + CTA", () => {
    render(
      <ProPaywall
        title="Unlock the full report"
        description="20 sections + fee changes await."
        ctaLabel="See plans"
        ctaHref="/pricing"
      />
    );
    expect(screen.getByText("Unlock the full report")).toBeInTheDocument();
    expect(screen.getByText(/20 sections \+ fee changes await/)).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /see plans/i });
    expect(cta).toHaveAttribute("href", "/pricing");
  });

  it("renders bullet list when provided", () => {
    render(
      <ProPaywall
        bullets={["Full archive", "Fee alerts", "Cancel anytime"]}
      />
    );
    expect(screen.getByText("Full archive")).toBeInTheDocument();
    expect(screen.getByText("Fee alerts")).toBeInTheDocument();
    expect(screen.getByText("Cancel anytime")).toBeInTheDocument();
  });

  it("renders secondary link when both label + href provided", () => {
    render(
      <ProPaywall
        secondaryLabel="Compare plans"
        secondaryHref="/pro#plans"
      />
    );
    const secondary = screen.getByRole("link", { name: /compare plans/i });
    expect(secondary).toHaveAttribute("href", "/pro#plans");
  });

  it("omits the Pro Members Only badge in inline variant", () => {
    const { rerender } = render(<ProPaywall variant="card" />);
    expect(screen.getByText(/pro members only/i)).toBeInTheDocument();

    rerender(<ProPaywall variant="inline" />);
    expect(screen.queryByText(/pro members only/i)).not.toBeInTheDocument();
  });

  it("carries data-pro-paywall marker for paywall structured-data selectors", () => {
    const { container } = render(<ProPaywall />);
    expect(container.querySelector("[data-pro-paywall]")).not.toBeNull();
  });
});
