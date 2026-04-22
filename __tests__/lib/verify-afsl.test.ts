import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { normaliseAfsl, isAfslShapeValid, verifyAfsl } from "@/lib/verify-afsl";

describe("normaliseAfsl", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(normaliseAfsl(null)).toBe("");
    expect(normaliseAfsl(undefined)).toBe("");
    expect(normaliseAfsl("")).toBe("");
  });

  it("strips the AFSL prefix (any case)", () => {
    expect(normaliseAfsl("AFSL 123456")).toBe("123456");
    expect(normaliseAfsl("afsl 234567")).toBe("234567");
    expect(normaliseAfsl("AFSL345678")).toBe("345678");
  });

  it("strips spaces and hyphens", () => {
    expect(normaliseAfsl("12-34-56")).toBe("123456");
    expect(normaliseAfsl("12 34 56")).toBe("123456");
  });

  it("strips non-numeric characters", () => {
    expect(normaliseAfsl("AFSL: 123abc456")).toBe("123456");
  });
});

describe("isAfslShapeValid", () => {
  it("accepts 6 and 7 digit numbers", () => {
    expect(isAfslShapeValid("123456")).toBe(true);
    expect(isAfslShapeValid("1234567")).toBe(true);
  });

  it("rejects shorter / longer / empty", () => {
    expect(isAfslShapeValid("12345")).toBe(false);
    expect(isAfslShapeValid("12345678")).toBe(false);
    expect(isAfslShapeValid("")).toBe(false);
  });

  it("accepts a formatted shape via normaliseAfsl", () => {
    expect(isAfslShapeValid("AFSL 123 456")).toBe(true);
  });
});

describe("verifyAfsl", () => {
  const originalFetch = globalThis.fetch;
  const originalEndpoint = process.env.ASIC_API_ENDPOINT;
  const originalKey = process.env.ASIC_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEndpoint === undefined) delete process.env.ASIC_API_ENDPOINT;
    else process.env.ASIC_API_ENDPOINT = originalEndpoint;
    if (originalKey === undefined) delete process.env.ASIC_API_KEY;
    else process.env.ASIC_API_KEY = originalKey;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns valid=false with shape error for non-6/7-digit input", async () => {
    const res = await verifyAfsl("abc");
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/6 or 7 digits/);
    expect(res.manualVerifyUrl).toContain("connectonline.asic.gov.au");
  });

  it("returns valid=null + configured=false when no vendor env set", async () => {
    delete process.env.ASIC_API_ENDPOINT;
    delete process.env.ASIC_API_KEY;
    const res = await verifyAfsl("123456");
    expect(res.valid).toBeNull();
    expect(res.configured).toBe(false);
    expect(res.error).toMatch(/manual verification/);
  });

  it("returns valid=true for a current licence from the vendor", async () => {
    process.env.ASIC_API_ENDPOINT = "https://vendor.example/afsl";
    process.env.ASIC_API_KEY = "test-key";
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            valid: true,
            holderName: "Acme Financial Services",
            status: "Current",
          }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;

    const res = await verifyAfsl("123456");
    expect(res.valid).toBe(true);
    expect(res.holderName).toBe("Acme Financial Services");
    expect(res.licenceStatus).toBe("Current");
    expect(res.configured).toBe(true);
  });

  it("returns valid=false on non-Current statuses", async () => {
    process.env.ASIC_API_ENDPOINT = "https://vendor.example/afsl";
    process.env.ASIC_API_KEY = "test-key";

    for (const statusText of ["Cancelled", "Suspended", "Ceased"]) {
      globalThis.fetch = vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              valid: true, // even if vendor says 'valid', status kicks it to false
              holderName: "X",
              status: statusText,
            }),
            { status: 200 },
          ),
      ) as unknown as typeof fetch;

      const res = await verifyAfsl("123456");
      expect(res.valid).toBe(false);
      expect(res.licenceStatus).toBe(statusText);
    }
  });

  it("maps unknown vendor status strings to 'Unknown'", async () => {
    process.env.ASIC_API_ENDPOINT = "https://vendor.example/afsl";
    process.env.ASIC_API_KEY = "test-key";
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ valid: true, holderName: "X", status: "Pending" }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;

    const res = await verifyAfsl("123456");
    expect(res.licenceStatus).toBe("Unknown");
    expect(res.valid).toBe(false);
  });

  it("returns valid=null on non-200 vendor response", async () => {
    process.env.ASIC_API_ENDPOINT = "https://vendor.example/afsl";
    process.env.ASIC_API_KEY = "test-key";
    globalThis.fetch = vi.fn(
      async () => new Response("auth", { status: 401 }),
    ) as unknown as typeof fetch;

    const res = await verifyAfsl("123456");
    expect(res.valid).toBeNull();
    expect(res.error).toMatch(/HTTP 401/);
  });

  it("returns valid=null when fetch throws", async () => {
    process.env.ASIC_API_ENDPOINT = "https://vendor.example/afsl";
    process.env.ASIC_API_KEY = "test-key";
    globalThis.fetch = vi.fn(async () => {
      throw new Error("ETIMEDOUT");
    }) as unknown as typeof fetch;

    const res = await verifyAfsl("123456");
    expect(res.valid).toBeNull();
    expect(res.error).toBe("ETIMEDOUT");
  });

  it("attaches the afsl query param to the vendor URL", async () => {
    process.env.ASIC_API_ENDPOINT = "https://vendor.example/afsl";
    process.env.ASIC_API_KEY = "test-key";
    const spy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ valid: true, holderName: "X", status: "Current" }),
          { status: 200 },
        ),
    );
    globalThis.fetch = spy as unknown as typeof fetch;

    await verifyAfsl("AFSL 234567");
    const requestUrl = spy.mock.calls[0]?.[0];
    const href = requestUrl instanceof URL ? requestUrl.toString() : String(requestUrl);
    expect(href).toContain("afsl=234567");
    // Authorization header is sent
    const init = spy.mock.calls[0]?.[1] as { headers?: Record<string, string> };
    expect(init?.headers?.Authorization).toBe("Bearer test-key");
  });
});
