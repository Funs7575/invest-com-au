import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

/**
 * Tests for lib/logger.ts.
 *
 * The logger has three responsibilities:
 *   1. Filter by level (respects LOG_LEVEL env / defaults).
 *   2. Format output (structured JSON in prod, colored in dev).
 *   3. Forward to Sentry (captureException for errors with Error
 *      objects, captureMessage for everything else, breadcrumbs for
 *      info/debug).
 *
 * We mock Sentry in full so calls can be inspected without a real
 * SDK. Console methods are spied on so we can assert on output
 * shape without polluting test runs.
 */

const sentryMocks = {
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
};

vi.mock("@sentry/nextjs", () => sentryMocks);

let consoleLog: ReturnType<typeof vi.spyOn>;
let consoleWarn: ReturnType<typeof vi.spyOn>;
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Reset all mocks between tests so call counts are isolated
  Object.values(sentryMocks).forEach((m) => m.mockClear());
  consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
  consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleLog.mockRestore();
  consoleWarn.mockRestore();
  consoleError.mockRestore();
  vi.unstubAllEnvs();
});

describe("logger() factory", () => {
  it("returns an object with debug/info/warn/error methods", async () => {
    const { logger } = await import("@/lib/logger");
    const log = logger("test");
    expect(typeof log.debug).toBe("function");
    expect(typeof log.info).toBe("function");
    expect(typeof log.warn).toBe("function");
    expect(typeof log.error).toBe("function");
  });

  it("emits info messages to console.log when above min level", async () => {
    const { logger } = await import("@/lib/logger");
    const log = logger("test-ctx");
    log.info("hello world");
    expect(consoleLog).toHaveBeenCalledTimes(1);
    // Dev format: console.log(prefix, msg) — prefix in [0], msg in [1]
    const args = consoleLog.mock.calls[0];
    expect(args?.[0]).toContain("test-ctx");
    expect(args?.[1]).toBe("hello world");
  });

  it("emits warn messages to console.warn", async () => {
    const { logger } = await import("@/lib/logger");
    const log = logger("warn-ctx");
    log.warn("something off");
    expect(consoleWarn).toHaveBeenCalledTimes(1);
  });

  it("emits error messages to console.error", async () => {
    const { logger } = await import("@/lib/logger");
    const log = logger("err-ctx");
    log.error("things broke");
    expect(consoleError).toHaveBeenCalledTimes(1);
  });
});

describe("Sentry forwarding", () => {
  it("calls captureException with an Error meta", async () => {
    const { logger } = await import("@/lib/logger");
    const log = logger("ctx");
    const err = new Error("boom");
    log.error("failure", { err });
    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    expect(sentryMocks.captureException).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        tags: { ctx: "ctx" },
        extra: expect.objectContaining({ msg: "failure" }),
      })
    );
    // captureMessage should NOT also fire when the Error path is taken
    expect(sentryMocks.captureMessage).not.toHaveBeenCalled();
  });

  it("falls back to captureMessage when error has no Error object", async () => {
    const { logger } = await import("@/lib/logger");
    const log = logger("ctx");
    log.error("string-only error");
    expect(sentryMocks.captureMessage).toHaveBeenCalledTimes(1);
    expect(sentryMocks.captureMessage).toHaveBeenCalledWith(
      "[ctx] string-only error",
      expect.objectContaining({ level: "error", tags: { ctx: "ctx" } })
    );
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
  });

  it("captures warn as a captureMessage with warning level", async () => {
    const { logger } = await import("@/lib/logger");
    const log = logger("ctx");
    log.warn("careful");
    expect(sentryMocks.captureMessage).toHaveBeenCalledWith(
      "[ctx] careful",
      expect.objectContaining({ level: "warning", tags: { ctx: "ctx" } })
    );
  });

  it("captures info as a breadcrumb, not a Sentry event", async () => {
    const { logger } = await import("@/lib/logger");
    const log = logger("ctx");
    log.info("step ran");
    expect(sentryMocks.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "ctx",
        level: "info",
        message: "step ran",
      })
    );
    expect(sentryMocks.captureMessage).not.toHaveBeenCalled();
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
  });
});

describe("meta normalisation", () => {
  it("accepts an Error object directly as meta", async () => {
    const { logger } = await import("@/lib/logger");
    const log = logger("ctx");
    log.warn("with error", new Error("inner"));
    // The console call should include normalised meta with name + message
    const args = consoleWarn.mock.calls[0];
    expect(args).toBeDefined();
    // In dev (non-prod) the meta is the third arg; check it has the
    // normalised Error fields
    const meta = args![2] as Record<string, unknown> | undefined;
    expect(meta).toBeDefined();
    expect(meta).toMatchObject({ name: "Error", message: "inner" });
  });

  it("accepts a string as meta and wraps it in { detail }", async () => {
    const { logger } = await import("@/lib/logger");
    const log = logger("ctx");
    log.warn("with detail", "raw note");
    const args = consoleWarn.mock.calls[0];
    const meta = args![2] as Record<string, unknown> | undefined;
    expect(meta).toMatchObject({ detail: "raw note" });
  });

  it("accepts a record meta and passes it through", async () => {
    const { logger } = await import("@/lib/logger");
    const log = logger("ctx");
    log.warn("with object", { foo: 1, bar: "two" });
    const args = consoleWarn.mock.calls[0];
    const meta = args![2] as Record<string, unknown> | undefined;
    expect(meta).toMatchObject({ foo: 1, bar: "two" });
  });
});

describe("setLoggerUser", () => {
  it("forwards user to Sentry.setUser", async () => {
    const { setLoggerUser } = await import("@/lib/logger");
    setLoggerUser({ id: "u-1", email: "a@b.com" });
    expect(sentryMocks.setUser).toHaveBeenCalledWith({
      id: "u-1",
      email: "a@b.com",
    });
  });

  it("clears Sentry user when called with null", async () => {
    const { setLoggerUser } = await import("@/lib/logger");
    setLoggerUser(null);
    expect(sentryMocks.setUser).toHaveBeenCalledWith(null);
  });

  it("does not throw when Sentry is unavailable", async () => {
    sentryMocks.setUser.mockImplementationOnce(() => {
      throw new Error("sentry not initialised");
    });
    const { setLoggerUser } = await import("@/lib/logger");
    expect(() => setLoggerUser({ id: "u-2" })).not.toThrow();
  });
});

describe("setLoggerRequestId", () => {
  it("tags the active scope with the request id", async () => {
    const { setLoggerRequestId } = await import("@/lib/logger");
    setLoggerRequestId("req-123");
    expect(sentryMocks.setTag).toHaveBeenCalledWith("request_id", "req-123");
  });

  it("does not tag when called with null", async () => {
    const { setLoggerRequestId } = await import("@/lib/logger");
    setLoggerRequestId(null);
    expect(sentryMocks.setTag).not.toHaveBeenCalled();
  });
});
