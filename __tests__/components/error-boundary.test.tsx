import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";
import Error from "@/app/error";

// Silence the Icon component's font-awesome import path — the test
// environment doesn't need the real SVGs.
vi.mock("@/components/Icon", () => ({
  default: ({ name }: { name: string }) => (
    <span data-testid={`icon-${name}`} />
  ),
}));

describe("app/error.tsx (top-level error boundary)", () => {
  function makeError(message: string, digest?: string): Error & { digest?: string } {
    const err = new globalThis.Error(message) as Error & { digest?: string };
    if (digest) err.digest = digest;
    return err;
  }

  it("renders the generic error headline + body", () => {
    render(<Error error={makeError("boom")} reset={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: /Something went wrong/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/We hit an unexpected error/)).toBeInTheDocument();
  });

  it("surfaces a Try Again button that calls reset()", () => {
    const reset = vi.fn();
    render(<Error error={makeError("boom")} reset={reset} />);
    screen.getByRole("button", { name: /Try Again/i }).click();
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("links back to the homepage", () => {
    render(<Error error={makeError("boom")} reset={vi.fn()} />);
    const homeLink = screen.getByRole("link", { name: /Back to Homepage/i });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("shows the digest ID when one is provided", () => {
    render(
      <Error
        error={makeError("boom", "abc-123")}
        reset={vi.fn()}
      />,
    );
    expect(screen.getByText(/Error ID: abc-123/)).toBeInTheDocument();
  });

  it("omits the digest line when no digest is set", () => {
    render(<Error error={makeError("boom")} reset={vi.fn()} />);
    expect(screen.queryByText(/Error ID:/)).not.toBeInTheDocument();
  });

  it("renders the alert triangle icon", () => {
    render(<Error error={makeError("boom")} reset={vi.fn()} />);
    expect(screen.getByTestId("icon-alert-triangle")).toBeInTheDocument();
  });
});
