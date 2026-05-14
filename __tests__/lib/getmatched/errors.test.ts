import { describe, it, expect } from "vitest";
import { classifyGetMatchedError } from "@/lib/getmatched/errors";

describe("classifyGetMatchedError", () => {
  it("classifies missing Supabase env vars as supabase_not_configured", () => {
    const e = new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable",
    );
    const out = classifyGetMatchedError(e);
    expect(out.code).toBe("supabase_not_configured");
    expect(out.status).toBe(503);
  });

  it("classifies undefined-table errors as database_not_ready", () => {
    const e = new Error(
      'relation "public.get_matched_action_plans" does not exist',
    );
    const out = classifyGetMatchedError(e);
    expect(out.code).toBe("database_not_ready");
    expect(out.status).toBe(503);
  });

  it("classifies network-level failures as supabase_unreachable", () => {
    expect(classifyGetMatchedError(new Error("fetch failed")).code).toBe(
      "supabase_unreachable",
    );
    expect(
      classifyGetMatchedError(new Error("getaddrinfo ENOTFOUND db.supabase.co"))
        .code,
    ).toBe("supabase_unreachable");
    expect(
      classifyGetMatchedError(new Error("connect ECONNREFUSED 127.0.0.1:5432"))
        .code,
    ).toBe("supabase_unreachable");
  });

  it("classifies anything else as internal_error 500", () => {
    const out = classifyGetMatchedError(new Error("something exploded"));
    expect(out.code).toBe("internal_error");
    expect(out.status).toBe(500);
    expect(out.detail).toBe("something exploded");
  });

  it("handles non-Error throws via String coercion", () => {
    const out = classifyGetMatchedError("plain string boom");
    expect(out.code).toBe("internal_error");
    expect(out.detail).toBe("plain string boom");
  });
});
