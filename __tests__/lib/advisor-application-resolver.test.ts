import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { lookupAfsl, lookupAbn } from "@/lib/advisor-application-resolver";

describe("lookupAfsl", () => {
  const originalFetch = globalThis.fetch;
  const originalEndpoint = process.env.AFSL_LOOKUP_URL;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEndpoint === undefined) delete process.env.AFSL_LOOKUP_URL;
    else process.env.AFSL_LOOKUP_URL = originalEndpoint;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns performed:false when AFSL number is null", async () => {
    const res = await lookupAfsl(null);
    expect(res.performed).toBe(false);
    expect(res.afslNumber).toBeNull();
  });

  it("returns performed:false when AFSL_LOOKUP_URL is unset", async () => {
    delete process.env.AFSL_LOOKUP_URL;
    const res = await lookupAfsl("123456");
    expect(res.performed).toBe(false);
    expect(res.afslNumber).toBe("123456");
    expect(res.status).toBeNull();
  });

  it("returns performed:true with body data on happy-path response", async () => {
    process.env.AFSL_LOOKUP_URL = "https://vendor.example/afsl";
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: "current",
            registeredName: "Acme Pty Ltd",
            licenceType: "Financial advice",
          }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;

    const res = await lookupAfsl("123456");
    expect(res.performed).toBe(true);
    expect(res.status).toBe("current");
    expect(res.registeredName).toBe("Acme Pty Ltd");
    expect(res.licenceType).toBe("Financial advice");
  });

  it("defaults status to 'not_found' when body doesn't include status", async () => {
    process.env.AFSL_LOOKUP_URL = "https://vendor.example/afsl";
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({}), { status: 200 }),
    ) as unknown as typeof fetch;
    const res = await lookupAfsl("123456");
    expect(res.performed).toBe(true);
    expect(res.status).toBe("not_found");
  });

  it("returns performed:false on HTTP error", async () => {
    process.env.AFSL_LOOKUP_URL = "https://vendor.example/afsl";
    globalThis.fetch = vi.fn(
      async () => new Response("bad", { status: 500 }),
    ) as unknown as typeof fetch;
    const res = await lookupAfsl("123456");
    expect(res.performed).toBe(false);
  });

  it("returns performed:false when fetch throws", async () => {
    process.env.AFSL_LOOKUP_URL = "https://vendor.example/afsl";
    globalThis.fetch = vi.fn(async () => {
      throw new Error("timeout");
    }) as unknown as typeof fetch;
    const res = await lookupAfsl("123456");
    expect(res.performed).toBe(false);
  });
});

describe("lookupAbn", () => {
  const originalFetch = globalThis.fetch;
  const originalGuid = process.env.ABN_LOOKUP_GUID;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalGuid === undefined) delete process.env.ABN_LOOKUP_GUID;
    else process.env.ABN_LOOKUP_GUID = originalGuid;
  });

  it("returns performed:false when abn is null", async () => {
    const res = await lookupAbn(null);
    expect(res.performed).toBe(false);
    expect(res.abn).toBeNull();
  });

  it("returns performed:false when ABN_LOOKUP_GUID is unset", async () => {
    delete process.env.ABN_LOOKUP_GUID;
    const res = await lookupAbn("51 824 753 556");
    expect(res.performed).toBe(false);
    expect(res.abn).toBe("51 824 753 556");
  });

  it("returns entityStatus='not_found' for malformed ABN (not 11 digits)", async () => {
    process.env.ABN_LOOKUP_GUID = "g";
    const res = await lookupAbn("123");
    expect(res.performed).toBe(true);
    expect(res.entityStatus).toBe("not_found");
  });

  it("strips spaces before validating", async () => {
    process.env.ABN_LOOKUP_GUID = "g";
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ EntityName: "Test Co", AbnStatus: "Active" }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;

    const res = await lookupAbn("51 824 753 556");
    expect(res.performed).toBe(true);
  });

  it("returns performed:false on HTTP error", async () => {
    process.env.ABN_LOOKUP_GUID = "g";
    globalThis.fetch = vi.fn(
      async () => new Response("down", { status: 500 }),
    ) as unknown as typeof fetch;
    const res = await lookupAbn("51824753556");
    expect(res.performed).toBe(false);
  });

  it("returns performed:false when fetch throws", async () => {
    process.env.ABN_LOOKUP_GUID = "g";
    globalThis.fetch = vi.fn(async () => {
      throw new Error("ETIMEDOUT");
    }) as unknown as typeof fetch;
    const res = await lookupAbn("51824753556");
    expect(res.performed).toBe(false);
  });
});
