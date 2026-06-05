import { describe, it, expect, vi } from "vitest";
import { capturePerfSample } from "../../bots/checks/perf";
import type { Page } from "@playwright/test";

interface BrowserTimings {
  domContentLoadedMs: number | null;
  loadEventMs: number | null;
  fcpMs: number | null;
  jsHeapKb: number | null;
}

function makePage(timings: BrowserTimings, url = "http://localhost:3000/brokers"): Page {
  return {
    evaluate: vi.fn().mockResolvedValue(timings),
    url: vi.fn().mockReturnValue(url),
  } as unknown as Page;
}

describe("capturePerfSample", () => {
  it("returns a sample with all timings populated", async () => {
    const page = makePage(
      { domContentLoadedMs: 450, loadEventMs: 620, fcpMs: 310, jsHeapKb: 8192 },
      "http://localhost:3000/brokers",
    );
    const sample = await capturePerfSample(page, "broker-shopper");
    expect(sample).not.toBeNull();
    expect(sample!.domContentLoadedMs).toBe(450);
    expect(sample!.loadEventMs).toBe(620);
    expect(sample!.fcpMs).toBe(310);
    expect(sample!.jsHeapKb).toBe(8192);
    expect(sample!.route).toBe("/brokers");
    expect(sample!.persona).toBe("broker-shopper");
    expect(sample!.url).toBe("http://localhost:3000/brokers");
    expect(sample!.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("extracts route (pathname) from a full URL", async () => {
    const page = makePage(
      { domContentLoadedMs: 200, loadEventMs: 300, fcpMs: 150, jsHeapKb: null },
      "http://invest.com.au/advisors/financial-planners/nsw?q=test#anchor",
    );
    const sample = await capturePerfSample(page, "p");
    expect(sample!.route).toBe("/advisors/financial-planners/nsw");
  });

  it("handles null timings gracefully", async () => {
    const page = makePage(
      { domContentLoadedMs: null, loadEventMs: null, fcpMs: null, jsHeapKb: null },
    );
    const sample = await capturePerfSample(page, "p");
    expect(sample).not.toBeNull();
    expect(sample!.domContentLoadedMs).toBeNull();
    expect(sample!.fcpMs).toBeNull();
  });

  it("returns null when page.evaluate throws", async () => {
    const page = {
      evaluate: vi.fn().mockRejectedValue(new Error("Target closed")),
      url: vi.fn().mockReturnValue("http://localhost:3000/"),
    } as unknown as Page;
    const sample = await capturePerfSample(page, "p");
    expect(sample).toBeNull();
  });

  it("falls back to full URL as route when URL is not parseable", async () => {
    const badUrl = "not-a-url";
    const page = {
      evaluate: vi.fn().mockResolvedValue({ domContentLoadedMs: 100, loadEventMs: 200, fcpMs: 80, jsHeapKb: null }),
      url: vi.fn().mockReturnValue(badUrl),
    } as unknown as Page;
    const sample = await capturePerfSample(page, "p");
    expect(sample).not.toBeNull();
    // Falls back to the full URL string when URL parsing fails
    expect(sample!.route).toBe(badUrl);
  });
});
