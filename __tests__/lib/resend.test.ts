import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { sendEmail, upsertContact } from "@/lib/resend";

describe("sendEmail", () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "rk_test";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns ok:false + 'No API key' when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await sendEmail({ to: "a@b.com", subject: "x", html: "<p/>" });
    expect(res).toEqual({ ok: false, error: "No API key" });
  });

  it("returns ok:true on a 2xx response", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("{}", { status: 200 }),
    ) as unknown as typeof fetch;
    const res = await sendEmail({ to: "a@b.com", subject: "Hi", html: "<p/>" });
    expect(res).toEqual({ ok: true });
  });

  it("normalizes a single 'to' address into an array", async () => {
    const spy = vi.fn(
      async () => new Response("{}", { status: 200 }),
    );
    globalThis.fetch = spy as unknown as typeof fetch;
    await sendEmail({ to: "one@x.com", subject: "x", html: "<p/>" });
    const body = JSON.parse(
      (spy.mock.calls[0]?.[1] as { body: string }).body,
    );
    expect(body.to).toEqual(["one@x.com"]);
  });

  it("preserves a 'to' array", async () => {
    const spy = vi.fn(
      async () => new Response("{}", { status: 200 }),
    );
    globalThis.fetch = spy as unknown as typeof fetch;
    await sendEmail({ to: ["a@x.com", "b@x.com"], subject: "x", html: "<p/>" });
    const body = JSON.parse(
      (spy.mock.calls[0]?.[1] as { body: string }).body,
    );
    expect(body.to).toEqual(["a@x.com", "b@x.com"]);
  });

  it("uses a default from address when not provided", async () => {
    const spy = vi.fn(
      async () => new Response("{}", { status: 200 }),
    );
    globalThis.fetch = spy as unknown as typeof fetch;
    await sendEmail({ to: "a@x.com", subject: "x", html: "<p/>" });
    const body = JSON.parse(
      (spy.mock.calls[0]?.[1] as { body: string }).body,
    );
    expect(body.from).toBe("Invest.com.au <fees@invest.com.au>");
  });

  it("respects a custom 'from' override", async () => {
    const spy = vi.fn(
      async () => new Response("{}", { status: 200 }),
    );
    globalThis.fetch = spy as unknown as typeof fetch;
    await sendEmail({
      to: "a@x.com",
      subject: "x",
      html: "<p/>",
      from: "Hello <hi@invest.com.au>",
    });
    const body = JSON.parse(
      (spy.mock.calls[0]?.[1] as { body: string }).body,
    );
    expect(body.from).toBe("Hello <hi@invest.com.au>");
  });

  it("returns ok:false + HTTP-<status> on non-2xx", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("bad", { status: 422 }),
    ) as unknown as typeof fetch;
    const res = await sendEmail({ to: "a@x.com", subject: "x", html: "<p/>" });
    expect(res).toEqual({ ok: false, error: "HTTP 422" });
  });

  it("returns ok:false with error message when fetch throws", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("ETIMEDOUT");
    }) as unknown as typeof fetch;
    const res = await sendEmail({ to: "a@x.com", subject: "x", html: "<p/>" });
    expect(res).toEqual({ ok: false, error: "ETIMEDOUT" });
  });

  it("sets bearer auth header + JSON content-type", async () => {
    const spy = vi.fn(
      async () => new Response("{}", { status: 200 }),
    );
    globalThis.fetch = spy as unknown as typeof fetch;
    await sendEmail({ to: "a@x.com", subject: "x", html: "<p/>" });
    const init = spy.mock.calls[0]?.[1] as { headers: Record<string, string> };
    expect(init?.headers.Authorization).toBe("Bearer rk_test");
    expect(init?.headers["Content-Type"]).toBe("application/json");
  });
});

describe("upsertContact", () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "rk_test";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  it("returns No API key when missing", async () => {
    delete process.env.RESEND_API_KEY;
    expect(await upsertContact("a1", "u@x.com")).toEqual({
      ok: false,
      error: "No API key",
    });
  });

  it("posts to the audience-specific URL", async () => {
    const spy = vi.fn(
      async () => new Response("{}", { status: 200 }),
    );
    globalThis.fetch = spy as unknown as typeof fetch;
    await upsertContact("aud_123", "u@x.com", "Jane");
    const url = spy.mock.calls[0]?.[0] as string;
    expect(url).toBe("https://api.resend.com/audiences/aud_123/contacts");
  });

  it("omits first_name when not provided", async () => {
    const spy = vi.fn(
      async () => new Response("{}", { status: 200 }),
    );
    globalThis.fetch = spy as unknown as typeof fetch;
    await upsertContact("a1", "u@x.com");
    const body = JSON.parse(
      (spy.mock.calls[0]?.[1] as { body: string }).body,
    );
    expect(body.first_name).toBeUndefined();
    expect(body.unsubscribed).toBe(false);
  });

  it("propagates unsubscribed flag", async () => {
    const spy = vi.fn(
      async () => new Response("{}", { status: 200 }),
    );
    globalThis.fetch = spy as unknown as typeof fetch;
    await upsertContact("a1", "u@x.com", undefined, true);
    const body = JSON.parse(
      (spy.mock.calls[0]?.[1] as { body: string }).body,
    );
    expect(body.unsubscribed).toBe(true);
  });

  it("returns HTTP-<status> on non-2xx", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("bad", { status: 409 }),
    ) as unknown as typeof fetch;
    const res = await upsertContact("a1", "u@x.com");
    expect(res).toEqual({ ok: false, error: "HTTP 409" });
  });

  it("returns error message when fetch throws", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("disconnected");
    }) as unknown as typeof fetch;
    const res = await upsertContact("a1", "u@x.com");
    expect(res).toEqual({ ok: false, error: "disconnected" });
  });
});
