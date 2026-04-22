import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { normaliseAbn, isAbnChecksumValid, verifyAbn } from "@/lib/verify-abn";

describe("normaliseAbn", () => {
  it("returns empty string for null or undefined", () => {
    expect(normaliseAbn(null)).toBe("");
    expect(normaliseAbn(undefined)).toBe("");
    expect(normaliseAbn("")).toBe("");
  });

  it("strips spaces, hyphens, and non-digits", () => {
    expect(normaliseAbn("51 824 753 556")).toBe("51824753556");
    expect(normaliseAbn("51-824-753-556")).toBe("51824753556");
    expect(normaliseAbn("ABN: 51 824 753 556")).toBe("51824753556");
  });
});

describe("isAbnChecksumValid", () => {
  it("accepts the ATO sample ABN (51 824 753 556 — treasury sample)", () => {
    // This is the well-known sample ABN used in the ATO's documentation.
    expect(isAbnChecksumValid("51824753556")).toBe(true);
  });

  it("rejects a string shorter than 11 digits", () => {
    expect(isAbnChecksumValid("123456")).toBe(false);
  });

  it("rejects a string longer than 11 digits (normaliseAbn strips first)", () => {
    // 12 digits — length mismatch after normalisation
    expect(isAbnChecksumValid("518247535561")).toBe(false);
  });

  it("rejects a valid-length string with a bad checksum", () => {
    // Change the last digit so the mod-89 fails
    expect(isAbnChecksumValid("51824753557")).toBe(false);
  });

  it("rejects an ABN with a leading 0 (first-digit-minus-1 goes negative)", () => {
    expect(isAbnChecksumValid("01234567890")).toBe(false);
  });

  it("handles formatted input via normaliseAbn", () => {
    expect(isAbnChecksumValid("51 824 753 556")).toBe(true);
  });
});

describe("verifyAbn (remote path)", () => {
  const originalFetch = globalThis.fetch;
  const originalGuid = process.env.ABR_API_GUID;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalGuid === undefined) delete process.env.ABR_API_GUID;
    else process.env.ABR_API_GUID = originalGuid;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns valid=false with length error when ABN is not 11 digits", async () => {
    const res = await verifyAbn("123");
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/11 digits/);
    expect(res.abn).toBe("123");
  });

  it("returns valid=false on bad checksum", async () => {
    const res = await verifyAbn("51824753557");
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/mod-89 checksum/);
  });

  it("returns valid=null + configured=false when ABR_API_GUID is unset (unverifiable)", async () => {
    delete process.env.ABR_API_GUID;
    const res = await verifyAbn("51 824 753 556");
    expect(res.valid).toBeNull();
    expect(res.configured).toBe(false);
    expect(res.error).toMatch(/not configured/);
  });

  it("returns valid=true with entity details on a successful ABR response", async () => {
    process.env.ABR_API_GUID = "test-guid";
    globalThis.fetch = vi.fn(async () => {
      const body = `callback(${JSON.stringify({
        Abn: "51824753556",
        AbnStatus: "Active",
        EntityName: "Test Co Pty Ltd",
        EntityTypeName: "Australian Private Company",
      })})`;
      return new Response(body, { status: 200 });
    }) as unknown as typeof fetch;

    const res = await verifyAbn("51824753556");
    expect(res.valid).toBe(true);
    expect(res.status).toBe("Active");
    expect(res.entityName).toBe("Test Co Pty Ltd");
    expect(res.entityType).toBe("Australian Private Company");
    expect(res.error).toBeNull();
  });

  it("returns valid=false with Cancelled status on a cancelled ABN", async () => {
    process.env.ABR_API_GUID = "test-guid";
    globalThis.fetch = vi.fn(async () => {
      const body = `callback(${JSON.stringify({
        Abn: "51824753556",
        AbnStatus: "Cancelled",
        EntityName: "Old Co",
      })})`;
      return new Response(body, { status: 200 });
    }) as unknown as typeof fetch;

    const res = await verifyAbn("51824753556");
    expect(res.valid).toBe(false);
    expect(res.status).toBe("Cancelled");
  });

  it("returns valid=null on non-200 HTTP status", async () => {
    process.env.ABR_API_GUID = "test-guid";
    globalThis.fetch = vi.fn(
      async () => new Response("server error", { status: 500 }),
    ) as unknown as typeof fetch;

    const res = await verifyAbn("51824753556");
    expect(res.valid).toBeNull();
    expect(res.error).toMatch(/HTTP 500/);
  });

  it("returns valid=null on unexpected (non-JSONP-wrapped) body", async () => {
    process.env.ABR_API_GUID = "test-guid";
    globalThis.fetch = vi.fn(
      async () => new Response('{"raw":"json"}', { status: 200 }),
    ) as unknown as typeof fetch;

    const res = await verifyAbn("51824753556");
    expect(res.valid).toBeNull();
    expect(res.error).toMatch(/unexpected payload/);
  });

  it("returns valid=false when ABR body contains Exception", async () => {
    process.env.ABR_API_GUID = "test-guid";
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        `callback(${JSON.stringify({ Exception: "quota exceeded" })})`,
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const res = await verifyAbn("51824753556");
    expect(res.valid).toBe(false);
    expect(res.error).toBe("quota exceeded");
  });

  it("returns valid=null when fetch throws", async () => {
    process.env.ABR_API_GUID = "test-guid";
    globalThis.fetch = vi.fn(async () => {
      throw new Error("ETIMEDOUT");
    }) as unknown as typeof fetch;

    const res = await verifyAbn("51824753556");
    expect(res.valid).toBeNull();
    expect(res.error).toBe("ETIMEDOUT");
  });

  it("maps unknown ABN status values to 'Unknown'", async () => {
    process.env.ABR_API_GUID = "test-guid";
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        `callback(${JSON.stringify({
          Abn: "51824753556",
          AbnStatus: "Weirdstate",
          EntityName: "X",
        })})`,
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const res = await verifyAbn("51824753556");
    expect(res.status).toBe("Unknown");
    expect(res.valid).toBe(false);
  });
});
