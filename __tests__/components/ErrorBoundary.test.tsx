import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { render, screen, userEvent } from "./setup";
import ErrorBoundary from "@/components/ErrorBoundary";

function Boom({ when = true }: { when?: boolean }) {
  if (when) throw new Error("kaboom");
  return <p>safe child</p>;
}

// React class-component boundaries log the caught error to console.error
// during render — silence the noise here so the test output stays clean.
const consoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = consoleError;
});

describe("ErrorBoundary", () => {
  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <p>healthy child</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("healthy child")).toBeInTheDocument();
  });

  it("renders the default fallback when a child throws", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(
      screen.getByText("Something went wrong loading this section."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  it("renders the custom fallback when supplied", () => {
    render(
      <ErrorBoundary fallback={<p>custom fallback</p>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("custom fallback")).toBeInTheDocument();
    expect(
      screen.queryByText("Something went wrong loading this section."),
    ).not.toBeInTheDocument();
  });

  it("reports the caught error to window.Sentry.captureException when present", () => {
    const captureSpy = vi.fn();
    (window as unknown as { Sentry?: unknown }).Sentry = {
      captureException: captureSpy,
    };
    try {
      render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      );
      expect(captureSpy).toHaveBeenCalledTimes(1);
      expect(captureSpy.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    } finally {
      delete (window as unknown as { Sentry?: unknown }).Sentry;
    }
  });

  it("does not blow up when window.Sentry is missing", () => {
    expect(() =>
      render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      ),
    ).not.toThrow();
  });

  it("'Try again' resets the boundary state", async () => {
    const user = userEvent.setup();
    // The child only throws on the first mount; once it re-renders
    // post-reset it succeeds.
    let throws = true;
    function ResettableBoom() {
      if (throws) throw new Error("kaboom-once");
      return <p>recovered</p>;
    }
    render(
      <ErrorBoundary>
        <ResettableBoom />
      </ErrorBoundary>,
    );
    // Allow the child to succeed on the next mount.
    throws = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("recovered")).toBeInTheDocument();
  });
});
