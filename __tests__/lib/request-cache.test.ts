import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

/**
 * lib/request-cache.ts wraps each helper in React's cache() so calls
 * within a single render pass are deduped. In Vitest (outside a React
 * render) we still want to exercise the query paths — React.cache
 * falls through to the underlying function on every invocation when
 * called outside a render context, which is fine here.
 */

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const mockGetUser = vi.fn();
let brokerData: unknown = null;
let articleData: unknown = null;
let professionalData: unknown = null;

const fromCalls: { table: string; filters: { col: string; val: unknown }[] }[] = [];

const mockFrom = vi.fn((table: string) => {
  const chain: {
    filters: { col: string; val: unknown }[];
    select: () => typeof chain;
    eq: (col: string, val: unknown) => typeof chain;
    maybeSingle: () => Promise<{ data: unknown; error: null }>;
  } = {
    filters: [],
    select() {
      return chain;
    },
    eq(col: string, val: unknown) {
      chain.filters.push({ col, val });
      return chain;
    },
    async maybeSingle() {
      fromCalls.push({ table, filters: [...chain.filters] });
      if (table === "brokers") return { data: brokerData, error: null };
      if (table === "articles") return { data: articleData, error: null };
      if (table === "professionals") return { data: professionalData, error: null };
      return { data: null, error: null };
    },
  };
  return chain;
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import {
  getBrokerBySlug,
  getArticleBySlug,
  getProfessionalBySlug,
  getCurrentUser,
  stripInternalBrokerFields,
} from "@/lib/request-cache";
import type { Broker } from "@/lib/types";

describe("request-cache helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    brokerData = null;
    articleData = null;
    professionalData = null;
    fromCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("getBrokerBySlug", () => {
    it("returns null when no row is found", async () => {
      brokerData = null;
      expect(await getBrokerBySlug("unknown")).toBeNull();
    });

    it("returns the broker row when it exists", async () => {
      brokerData = { id: 1, slug: "stake", name: "Stake" };
      const res = await getBrokerBySlug("stake-unique-1");
      expect(res).toEqual(brokerData);
    });

    it("filters by slug + status='active'", async () => {
      brokerData = { id: 1 };
      await getBrokerBySlug("stake-unique-2");
      const call = fromCalls[fromCalls.length - 1];
      expect(call?.table).toBe("brokers");
      expect(call?.filters).toContainEqual({ col: "slug", val: "stake-unique-2" });
      expect(call?.filters).toContainEqual({ col: "status", val: "active" });
    });

    it("strips internal commercial/affiliate-economics fields from the returned row", async () => {
      brokerData = {
        id: 1,
        slug: "stake",
        name: "Stake",
        rating: 4.5,
        // internal commercial fields that must NOT reach the client
        cpa_value: 400,
        monthly_sponsorship_fee: 1500,
        affiliate_priority: "high",
        commission_type: "cpa",
        commission_value: 400,
        estimated_epc: 12.5,
        promoted_placement: true,
      };
      const res = (await getBrokerBySlug("stake-strip-1")) as unknown as Record<string, unknown>;
      expect(res).not.toBeNull();
      // public fields survive
      expect(res.id).toBe(1);
      expect(res.name).toBe("Stake");
      expect(res.rating).toBe(4.5);
      // commercial fields are gone
      for (const field of [
        "cpa_value",
        "monthly_sponsorship_fee",
        "affiliate_priority",
        "commission_type",
        "commission_value",
        "estimated_epc",
        "promoted_placement",
      ]) {
        expect(res).not.toHaveProperty(field);
      }
      // and they are absent from the JSON that gets serialised to the client
      const serialised = JSON.stringify(res);
      expect(serialised).not.toContain("cpa_value");
      expect(serialised).not.toContain("sponsorship_fee");
      expect(serialised).not.toContain("affiliate_priority");
    });
  });

  describe("stripInternalBrokerFields", () => {
    it("removes commercial fields without mutating the original", () => {
      const original = {
        id: 2,
        slug: "ig",
        name: "IG",
        cpa_value: 250,
        affiliate_priority: "medium",
        monthly_sponsorship_fee: 0,
      } as unknown as Broker;
      const cleaned = stripInternalBrokerFields(original);
      // original retained for server-side ranking/sponsorship use
      expect(original.cpa_value).toBe(250);
      expect(original.affiliate_priority).toBe("medium");
      // cleaned shape is client-safe
      expect(cleaned).not.toHaveProperty("cpa_value");
      expect(cleaned).not.toHaveProperty("affiliate_priority");
      expect(cleaned).not.toHaveProperty("monthly_sponsorship_fee");
      expect(cleaned.id).toBe(2);
      expect(cleaned.name).toBe("IG");
    });
  });

  describe("getArticleBySlug", () => {
    it("returns null when no row is found", async () => {
      articleData = null;
      expect(await getArticleBySlug("unknown-article")).toBeNull();
    });

    it("returns the article row without a status filter (allows unpublished)", async () => {
      articleData = { id: 5, slug: "best-brokers", status: "draft" };
      const res = await getArticleBySlug("best-brokers-unique-1");
      expect(res).toEqual(articleData);
      const call = fromCalls[fromCalls.length - 1];
      // Only slug filter, no status filter
      expect(call?.filters).toEqual([{ col: "slug", val: "best-brokers-unique-1" }]);
    });
  });

  describe("getProfessionalBySlug", () => {
    it("returns null when missing", async () => {
      professionalData = null;
      expect(await getProfessionalBySlug("ghost")).toBeNull();
    });

    it("filters by slug + active status", async () => {
      professionalData = { id: 7 };
      await getProfessionalBySlug("jane-unique-1");
      const call = fromCalls[fromCalls.length - 1];
      expect(call?.table).toBe("professionals");
      expect(call?.filters).toContainEqual({ col: "slug", val: "jane-unique-1" });
      expect(call?.filters).toContainEqual({ col: "status", val: "active" });
    });
  });

  describe("getCurrentUser", () => {
    it("returns null when unauthenticated", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      expect(await getCurrentUser()).toBeNull();
    });

    it("returns the user object when authenticated", async () => {
      const user = { id: "u1", email: "u@x.com" };
      mockGetUser.mockResolvedValueOnce({ data: { user } });
      expect(await getCurrentUser()).toEqual(user);
    });
  });
});
