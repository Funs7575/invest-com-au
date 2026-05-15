import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockIsFlagEnabled } = vi.hoisted(() => ({
  mockIsFlagEnabled: vi.fn(),
}));

vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: mockIsFlagEnabled,
}));

import { scoreBriefQuality } from "@/lib/ai/brief-quality";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
});

describe("scoreBriefQuality", () => {
  it("returns null when the flag is disabled", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const result = await scoreBriefQuality({
      title: "Need SMSF help",
      description: "I want help setting up an SMSF for property",
    });
    expect(result).toBeNull();
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("returns null when ANTHROPIC_API_KEY is missing", async () => {
    mockIsFlagEnabled.mockResolvedValue(true);
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const result = await scoreBriefQuality({
      title: "x",
      description: "y",
    });
    expect(result).toBeNull();
  });

  it("returns the parsed score on a happy response", async () => {
    mockIsFlagEnabled.mockResolvedValue(true);
    vi.stubEnv("ANTHROPIC_API_KEY", "key");
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({ score: 4, reason: "clear specific intent" }),
          },
        ],
      }),
    });
    const result = await scoreBriefQuality({
      title: "Need SMSF setup help",
      description:
        "I'm looking for an SMSF accountant in Sydney to set up a fund and buy a 2-bedroom unit in Parramatta. Budget ~$5k.",
    });
    expect(result?.score).toBe(4);
    expect(result?.reason).toContain("clear");
  });

  it("returns null when the model output is not valid JSON", async () => {
    mockIsFlagEnabled.mockResolvedValue(true);
    vi.stubEnv("ANTHROPIC_API_KEY", "key");
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "not json at all" }],
      }),
    });
    const result = await scoreBriefQuality({ title: "x", description: "y" });
    expect(result).toBeNull();
  });

  it("returns null on a non-2xx response", async () => {
    mockIsFlagEnabled.mockResolvedValue(true);
    vi.stubEnv("ANTHROPIC_API_KEY", "key");
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    });
    const result = await scoreBriefQuality({ title: "x", description: "y" });
    expect(result).toBeNull();
  });

  it("returns null when the score is out of range", async () => {
    mockIsFlagEnabled.mockResolvedValue(true);
    vi.stubEnv("ANTHROPIC_API_KEY", "key");
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: JSON.stringify({ score: 9, reason: "x" }) }],
      }),
    });
    const result = await scoreBriefQuality({ title: "x", description: "y" });
    expect(result).toBeNull();
  });
});
