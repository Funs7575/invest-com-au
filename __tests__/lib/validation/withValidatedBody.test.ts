import { describe, it, expect, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  withValidatedBody,
  VALIDATION_ERROR_CODE,
} from "@/lib/validation/withValidatedBody";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/test-route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const Schema = z.object({
  email: z.string().email(),
  age: z.number().int().nonnegative(),
});

type SchemaBody = z.infer<typeof Schema>;

// ── Behavioural tests ─────────────────────────────────────────────────────────

describe("withValidatedBody — happy path", () => {
  it("invokes the handler with the parsed body and returns its response", async () => {
    const handler = vi.fn(async (_req: NextRequest, body: SchemaBody) =>
      NextResponse.json({ ok: true, echoed: body }),
    );
    const route = withValidatedBody(Schema, handler);

    const res = await route(makePost({ email: "a@b.com", age: 30 }));

    expect(handler).toHaveBeenCalledTimes(1);
    const [, parsed] = handler.mock.calls[0]!;
    expect(parsed).toEqual({ email: "a@b.com", age: 30 });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; echoed: SchemaBody };
    expect(json.ok).toBe(true);
    expect(json.echoed).toEqual({ email: "a@b.com", age: 30 });
  });

  it("supports a synchronous handler that returns a NextResponse directly", async () => {
    const handler = vi.fn((_req: NextRequest, _body: SchemaBody) =>
      NextResponse.json({ ok: true }),
    );
    const route = withValidatedBody(Schema, handler);

    const res = await route(makePost({ email: "a@b.com", age: 1 }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });
});

describe("withValidatedBody — invalid JSON", () => {
  it("returns 400 { error: 'Invalid JSON body' } and does not invoke the handler", async () => {
    const handler = vi.fn();
    const route = withValidatedBody(Schema, handler);

    const res = await route(makePost("not-valid-json"));

    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json).toEqual({ error: "Invalid JSON body" });
  });

  it("treats an empty body as invalid JSON", async () => {
    const handler = vi.fn();
    const route = withValidatedBody(Schema, handler);

    const res = await route(makePost(""));

    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("Invalid JSON body");
  });
});

describe("withValidatedBody — schema validation failure", () => {
  it("returns 400 with the first issue surfaced + code + raw issues", async () => {
    const handler = vi.fn();
    const route = withValidatedBody(Schema, handler);

    // age is missing entirely + email is invalid; we expect the first issue
    // (Zod walks the schema fields in declaration order: email first).
    const res = await route(makePost({ email: "not-an-email" }));

    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
    const json = (await res.json()) as {
      error: string;
      code: string;
      issues: Array<{ path: (string | number)[]; message: string }>;
    };

    expect(json.code).toBe(VALIDATION_ERROR_CODE);
    expect(json.code).toBe("validation_error");
    expect(Array.isArray(json.issues)).toBe(true);
    expect(json.issues.length).toBeGreaterThan(0);

    // First issue is on `email`; the surfaced error string includes the path.
    expect(json.error).toMatch(/email/);
    expect(json.issues[0]!.path).toEqual(["email"]);
  });

  it("includes ALL issues, not just the first", async () => {
    const handler = vi.fn();
    const route = withValidatedBody(Schema, handler);

    const res = await route(makePost({ email: "not-an-email", age: -5 }));

    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
    const json = (await res.json()) as {
      issues: Array<{ path: (string | number)[] }>;
    };
    // both `email` (invalid format) and `age` (must be >= 0) must surface
    const paths = json.issues.map((i) => i.path.join("."));
    expect(paths).toContain("email");
    expect(paths).toContain("age");
  });

  it("surfaces a top-level error when schema rejects the root value", async () => {
    const RootArray = z.array(z.number());
    const handler = vi.fn();
    const route = withValidatedBody(RootArray, handler);

    const res = await route(makePost({ not: "an array" }));

    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
    const json = (await res.json()) as {
      error: string;
      code: string;
      issues: unknown[];
    };
    expect(json.code).toBe(VALIDATION_ERROR_CODE);
    expect(typeof json.error).toBe("string");
    expect(json.error.length).toBeGreaterThan(0);
  });
});

describe("withValidatedBody — handler errors", () => {
  it("re-throws when the handler rejects (does not silently swallow)", async () => {
    const boom = new Error("kaboom");
    const handler = vi.fn(async (_req: NextRequest, _body: SchemaBody) => {
      throw boom;
    });
    const route = withValidatedBody(Schema, handler);

    await expect(
      route(makePost({ email: "a@b.com", age: 1 })),
    ).rejects.toBe(boom);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("re-throws synchronous handler errors", async () => {
    const boom = new Error("sync-kaboom");
    const handler = vi.fn((_req: NextRequest, _body: SchemaBody): NextResponse => {
      throw boom;
    });
    const route = withValidatedBody(Schema, handler);

    await expect(
      route(makePost({ email: "a@b.com", age: 1 })),
    ).rejects.toBe(boom);
  });
});

// ── Type-level test ───────────────────────────────────────────────────────────
// Locks the ergonomics: handlers receive `body: z.infer<typeof schema>` —
// no manual cast at the callsite, no `unknown`. If the wrapper's generic
// regresses, this block fails to type-check (and CI's tsc step catches it).

describe("withValidatedBody — type ergonomics", () => {
  it("infers the handler body parameter as z.infer<typeof schema>", () => {
    const ShapedSchema = z.object({
      email: z.string().email(),
      plan: z.enum(["free", "pro"]),
      seats: z.number().int().positive(),
      meta: z.record(z.string(), z.unknown()).optional(),
    });

    type Inferred = z.infer<typeof ShapedSchema>;

    const route = withValidatedBody(ShapedSchema, async (_req, body) => {
      // Compile-time assertion: every field on `body` must be exactly the
      // shape declared above, with no extra `unknown`/`any` widening.
      const _email: string = body.email;
      const _plan: "free" | "pro" = body.plan;
      const _seats: number = body.seats;
      const _meta: Record<string, unknown> | undefined = body.meta;

      // Strong identity check — the inferred type must match the schema's
      // output exactly. A regression that widens `body` to `unknown`
      // breaks this assignment.
      const _identity: Inferred = body;

      // Touch the locals so eslint `no-unused-vars` doesn't complain at
      // runtime; the assertions above are what the test really cares about.
      void _email;
      void _plan;
      void _seats;
      void _meta;
      void _identity;

      return NextResponse.json({ ok: true });
    });

    expect(typeof route).toBe("function");
  });
});
