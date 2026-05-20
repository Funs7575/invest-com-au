/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { trackView } from "@/components/RecentlyViewed";
import type { Broker } from "@/lib/types";

const STORAGE_KEY = "invest_recently_viewed";

function makeBroker(over: Partial<Broker>): Broker {
  return {
    slug: "x",
    name: "X Broker",
    rating: 4.5,
    platform_type: "shares",
    color: "#abc",
    asx_fee: "$5",
    ...over,
  } as unknown as Broker;
}

/**
 * trackView() writes the recently-viewed broker shortlist to
 * sessionStorage. The fact that broker-detail pages call it on
 * every load means a regression silently breaks the "recently
 * viewed" strip on the homepage + compare pages.
 */
describe("trackView", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("writes a single broker as a one-item list on first call", () => {
    trackView(makeBroker({ slug: "vanguard", name: "Vanguard" }));
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].slug).toBe("vanguard");
    expect(stored[0].name).toBe("Vanguard");
  });

  it("prepends new brokers (most-recent first)", () => {
    trackView(makeBroker({ slug: "vanguard", name: "Vanguard" }));
    trackView(makeBroker({ slug: "blackrock", name: "BlackRock" }));
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored.map((s: { slug: string }) => s.slug)).toEqual([
      "blackrock",
      "vanguard",
    ]);
  });

  it("de-duplicates by slug — re-viewing a broker moves it to the front", () => {
    trackView(makeBroker({ slug: "vanguard", name: "Vanguard" }));
    trackView(makeBroker({ slug: "blackrock", name: "BlackRock" }));
    trackView(makeBroker({ slug: "vanguard", name: "Vanguard" }));
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored.map((s: { slug: string }) => s.slug)).toEqual([
      "vanguard",
      "blackrock",
    ]);
    expect(stored).toHaveLength(2);
  });

  it("caps the list at MAX_ITEMS (6)", () => {
    for (let i = 1; i <= 10; i++) {
      trackView(makeBroker({ slug: `broker-${i}`, name: `Broker ${i}` }));
    }
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored).toHaveLength(6);
    // Most-recent first → broker-10, broker-9, …, broker-5
    expect(stored[0].slug).toBe("broker-10");
    expect(stored[5].slug).toBe("broker-5");
  });

  it("normalises missing fields to safe defaults", () => {
    trackView({
      slug: "minimal",
      name: "Minimal Broker",
    } as unknown as Broker);
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored[0]).toMatchObject({
      slug: "minimal",
      name: "Minimal Broker",
      rating: 0,
      platform_type: "",
      color: "#666",
      asx_fee: "",
    });
  });
});
