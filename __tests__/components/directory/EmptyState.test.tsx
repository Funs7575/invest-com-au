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
});
