/**
 * Photo moderation unit tests.
 *
 * The library writes to supabase for the audit log, so we mock the
 * admin client to a no-op. We stub global fetch to simulate each
 * provider's response shape.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Supabase admin client — mock so logModerationCheck is a no-op.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: async () => ({ error: null }),
    }),
  }),
}));

// Silence logger during tests.
vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}));

import { moderatePhoto } from "@/lib/photo-moderation";

const ORIGINAL_ENV = { ...process.env };

function clearProviderEnv() {
  delete process.env.CLOUDFLARE_IMAGES_TOKEN;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.AWS_ACCESS_KEY_ID;
  delete process.env.AWS_SECRET_ACCESS_KEY;
  delete process.env.AWS_REGION;
  delete process.env.REKOGNITION_PROXY_URL;
}

beforeEach(() => {
  clearProviderEnv();
  vi.restoreAllMocks();
});

afterEach(() => {
  // Restore full env to avoid leaking between tests.
  for (const k of Object.keys(process.env)) delete process.env[k];
  Object.assign(process.env, ORIGINAL_ENV);
});

describe("moderatePhoto — stub provider (no env vars)", () => {
  it("returns unknown verdict when no provider is configured", async () => {
    const result = await moderatePhoto(
      "https://example.com/photo.jpg",
      "advisor_photo",
      42,
    );
    expect(result.provider).toBe("stub");
    expect(result.verdict).toBe("unknown");
    expect(result.confidence).toBe(0);
    expect(result.labels).toEqual({});
  });

  it("never throws on stub, regardless of input", async () => {
    await expect(
      moderatePhoto("", "listing_image", null),
    ).resolves.toBeDefined();
  });
});

describe("moderatePhoto — cloudflare provider", () => {
  beforeEach(() => {
    process.env.CLOUDFLARE_IMAGES_TOKEN = "https://worker.example.com/moderate";
    process.env.CLOUDFLARE_ACCOUNT_ID = "acct-123";
  });

  it("returns clean when response has no explicit/suggestive flags", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          labels: { scenery: 0.1, person: 0.2 },
          explicit: false,
          suggestive: false,
          confidence: 0.2,
        }),
      })),
    );

    const r = await moderatePhoto("https://ex/p.jpg", "advisor_photo");
    expect(r.provider).toBe("cloudflare");
    expect(r.verdict).toBe("clean");
  });

  it("returns rejected when explicit flag is true", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          labels: { explicit_nudity: 0.95 },
          explicit: true,
          suggestive: false,
          confidence: 0.95,
        }),
      })),
    );

    const r = await moderatePhoto("https://ex/p.jpg", "listing_image");
    expect(r.verdict).toBe("rejected");
    expect(r.provider).toBe("cloudflare");
  });

  it("returns flagged when suggestive flag is true", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          labels: { suggestive: 0.6 },
          explicit: false,
          suggestive: true,
          confidence: 0.6,
        }),
      })),
    );

    const r = await moderatePhoto("https://ex/p.jpg", "advisor_photo");
    expect(r.verdict).toBe("flagged");
  });

  it("rejects when any label score exceeds 0.85", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          labels: { graphic_violence: 0.9 },
          explicit: false,
          suggestive: false,
        }),
      })),
    );
    const r = await moderatePhoto("https://ex/p.jpg", "broker_logo");
    expect(r.verdict).toBe("rejected");
  });

  it("returns unknown verdict on HTTP error (no throw propagates)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({}),
      })),
    );
    const r = await moderatePhoto("https://ex/p.jpg", "advisor_photo");
    expect(r.verdict).toBe("unknown");
    expect(r.labels.error).toBe(1);
  });

  it("returns unknown when fetch itself throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network");
      }),
    );
    const r = await moderatePhoto("https://ex/p.jpg", "advisor_photo");
    expect(r.verdict).toBe("unknown");
  });
});

describe("moderatePhoto — rekognition provider", () => {
  beforeEach(() => {
    process.env.AWS_ACCESS_KEY_ID = "AKIA...";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
    process.env.AWS_REGION = "ap-southeast-2";
    process.env.REKOGNITION_PROXY_URL = "https://proxy.example.com/rekognition";
  });

  it("maps Rekognition labels to verdict=clean when all scores low", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          ModerationLabels: [
            { Name: "Suggestive", Confidence: 20 },
            { Name: "Tobacco", Confidence: 15 },
          ],
        }),
      })),
    );
    const r = await moderatePhoto("https://ex/p.jpg", "advisor_photo");
    expect(r.provider).toBe("rekognition");
    expect(r.verdict).toBe("clean");
    expect(r.labels.Suggestive).toBeCloseTo(0.2, 5);
  });

  it("flags when highest label > 0.5", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          ModerationLabels: [{ Name: "Suggestive", Confidence: 62 }],
        }),
      })),
    );
    const r = await moderatePhoto("https://ex/p.jpg", "listing_image");
    expect(r.verdict).toBe("flagged");
  });

  it("rejects when highest label > 0.85", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          ModerationLabels: [{ Name: "ExplicitNudity", Confidence: 95 }],
        }),
      })),
    );
    const r = await moderatePhoto("https://ex/p.jpg", "advisor_photo");
    expect(r.verdict).toBe("rejected");
  });

  it("returns unknown when REKOGNITION_PROXY_URL is missing", async () => {
    delete process.env.REKOGNITION_PROXY_URL;
    const r = await moderatePhoto("https://ex/p.jpg", "advisor_photo");
    expect(r.verdict).toBe("unknown");
    expect(r.provider).toBe("rekognition");
  });
});

describe("moderatePhoto — provider selection priority", () => {
  it("prefers cloudflare when both cloudflare and AWS env vars set", async () => {
    process.env.CLOUDFLARE_IMAGES_TOKEN = "https://worker/moderate";
    process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
    process.env.AWS_ACCESS_KEY_ID = "AKIA";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
    process.env.AWS_REGION = "ap-southeast-2";
    process.env.REKOGNITION_PROXY_URL = "https://proxy";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ labels: {}, explicit: false, suggestive: false }),
      })),
    );

    const r = await moderatePhoto("https://ex/p.jpg", "advisor_photo");
    expect(r.provider).toBe("cloudflare");
  });

  it("falls through to stub if cloudflare partially configured", async () => {
    process.env.CLOUDFLARE_IMAGES_TOKEN = "set";
    // CLOUDFLARE_ACCOUNT_ID intentionally missing
    const r = await moderatePhoto("https://ex/p.jpg", "advisor_photo");
    expect(r.provider).toBe("stub");
  });
});
