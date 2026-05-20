import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, userEvent } from "./setup";

const { captureExceptionMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: captureExceptionMock,
}));

import RouteErrorBoundary from "@/components/RouteErrorBoundary";

beforeEach(() => {
  captureExceptionMock.mockClear();
});

describe("RouteErrorBoundary", () => {
  it("renders the friendly error headline + body", () => {
    render(
      <RouteErrorBoundary error={new Error("boom")} reset={() => {}} />,
    );
    expect(
      screen.getByRole("heading", {
        name: "Something went wrong on this page",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/We've logged the error/),
    ).toBeInTheDocument();
  });

  it("reports the error to Sentry on mount", () => {
    const err = new Error("kaboom");
    render(<RouteErrorBoundary error={err} reset={() => {}} />);
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock).toHaveBeenCalledWith(err);
  });

  it("calls reset() when 'Try again' is clicked", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<RouteErrorBoundary error={new Error("x")} reset={reset} />);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("renders a Home link pointing at /", () => {
    render(<RouteErrorBoundary error={new Error("x")} reset={() => {}} />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("shows the digest reference when present", () => {
    const err = Object.assign(new Error("x"), { digest: "abc123" });
    render(<RouteErrorBoundary error={err} reset={() => {}} />);
    expect(screen.getByText(/Reference: abc123/)).toBeInTheDocument();
  });

  it("omits the digest reference when not present", () => {
    render(<RouteErrorBoundary error={new Error("x")} reset={() => {}} />);
    expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument();
  });

  it("hides the warning emoji from assistive tech", () => {
    const { container } = render(
      <RouteErrorBoundary error={new Error("x")} reset={() => {}} />,
    );
    const emoji = container.querySelector("[aria-hidden='true']");
    expect(emoji?.textContent).toContain("⚠️");
  });
});
