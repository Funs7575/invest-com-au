import { vi } from "vitest";

// Mock environment variables needed by API routes
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.NEXT_PUBLIC_SITE_URL = "https://invest.com.au";
process.env.IP_HASH_SALT = "test-salt-vitest";

// Mock Supabase client used by API routes
const mockInsertResult = { data: { click_id: "test-click-id" }, error: null };
const mockSelectResult = { data: { id: "broker-1" }, error: null };

const createMockQueryBuilder = () => {
  const builder: Record<string, unknown> = {};

  builder.select = vi.fn().mockReturnValue(builder);
  builder.insert = vi.fn().mockReturnValue(builder);
  builder.upsert = vi.fn().mockReturnValue(builder);
  builder.update = vi.fn().mockReturnValue(builder);
  builder.delete = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.neq = vi.fn().mockReturnValue(builder);
  builder.order = vi.fn().mockReturnValue(builder);
  builder.limit = vi.fn().mockReturnValue(builder);
  builder.single = vi.fn().mockResolvedValue(mockSelectResult);
  builder.maybeSingle = vi.fn().mockResolvedValue(mockSelectResult);
  builder.then = vi.fn((cb: (v: typeof mockInsertResult) => void) => {
    cb(mockInsertResult);
    return Promise.resolve();
  });

  return builder;
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => createMockQueryBuilder()),
  })),
}));

// Mock fetch for Resend API calls (fire-and-forget)
const originalFetch = globalThis.fetch;
globalThis.fetch = vi.fn((...args: Parameters<typeof fetch>) => {
  const url = typeof args[0] === "string" ? args[0] : "";
  // Let API route tests handle their own requests; mock external calls
  if (url.includes("resend.com")) {
    return Promise.resolve(new Response(JSON.stringify({ id: "mock-email" }), { status: 200 }));
  }
  return originalFetch(...args);
}) as typeof fetch;
