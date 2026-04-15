import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  installSupabaseFake,
  reset,
  getTable,
  seedTable,
} from "./harness";

// Stub Resend so the subscribe route doesn't try to send real email.
vi.mock("@/lib/resend", () => ({
  sendEmail: async () => ({ ok: true }),
}));

installSupabaseFake();

const subMod = await import(
  "@/app/api/newsletter-segments/subscribe/route"
);
const confirmMod = await import(
  "@/app/api/newsletter-segments/confirm/route"
);
const exitMod = await import("@/app/api/exit-intent-log/route");

function makeRequest(
  url: string,
  init?: { method?: string; body?: unknown },
): NextRequest {
  return new NextRequest(`http://test${url}`, {
    method: init?.method || "GET",
    headers: { "content-type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
}

describe("integration: /api/newsletter-segments/subscribe", () => {
  beforeEach(() => reset());

  it("rejects missing email", async () => {
    const res = await subMod.POST(
      makeRequest("/api/newsletter-segments/subscribe", {
        method: "POST",
        body: {},
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects invalid email format", async () => {
    const res = await subMod.POST(
      makeRequest("/api/newsletter-segments/subscribe", {
        method: "POST",
        body: { email: "not-an-email" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("creates a new subscription row", async () => {
    const res = await subMod.POST(
      makeRequest("/api/newsletter-segments/subscribe", {
        method: "POST",
        body: { email: "alice@example.com", segment: "weekly" },
      }),
    );
    expect(res.status).toBe(200);
    const rows = getTable("newsletter_subscriptions");
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("alice@example.com");
    expect(rows[0].segment_slug).toBe("weekly");
    expect(rows[0].confirmed).toBe(false);
  });

  it("repeat subscribe for a confirmed user reports already_confirmed", async () => {
    seedTable("newsletter_subscriptions", [
      {
        email: "bob@example.com",
        segment_slug: null,
        confirmed: true,
        confirmation_token: null,
        unsubscribe_token: "bob-unsub-token-16chars-plus",
        unsubscribed_at: null,
        confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ]);
    const res = await subMod.POST(
      makeRequest("/api/newsletter-segments/subscribe", {
        method: "POST",
        body: { email: "bob@example.com" },
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { already_confirmed?: boolean };
    expect(json.already_confirmed).toBe(true);
  });
});

describe("integration: /api/newsletter-segments/confirm", () => {
  beforeEach(() => reset());

  it("GET confirms a subscription by token", async () => {
    seedTable("newsletter_subscriptions", [
      {
        email: "alice@example.com",
        segment_slug: null,
        confirmed: false,
        confirmation_token: "known-confirmation-token-22-chars-long",
        unsubscribe_token: "alice-unsub-16-chars-plus",
        unsubscribed_at: null,
        confirmed_at: null,
        created_at: new Date().toISOString(),
      },
    ]);
    const res = await confirmMod.GET(
      makeRequest(
        "/api/newsletter-segments/confirm?token=known-confirmation-token-22-chars-long",
      ),
    );
    expect(res.status).toBe(200);
    const row = getTable("newsletter_subscriptions")[0];
    expect(row.confirmed).toBe(true);
    expect(row.confirmed_at).toBeTruthy();
  });

  it("POST unsubscribes by token", async () => {
    seedTable("newsletter_subscriptions", [
      {
        email: "alice@example.com",
        segment_slug: null,
        confirmed: true,
        confirmation_token: null,
        unsubscribe_token: "alice-unsub-token-16-chars-plus",
        unsubscribed_at: null,
        confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ]);
    const res = await confirmMod.POST(
      makeRequest("/api/newsletter-segments/confirm", {
        method: "POST",
        body: {
          action: "unsubscribe",
          token: "alice-unsub-token-16-chars-plus",
        },
      }),
    );
    expect(res.status).toBe(200);
    const row = getTable("newsletter_subscriptions")[0];
    expect(row.unsubscribed_at).toBeTruthy();
  });
});

describe("integration: /api/exit-intent-log", () => {
  beforeEach(() => reset());

  it("rejects unknown actions", async () => {
    const res = await exitMod.POST(
      makeRequest("/api/exit-intent-log", {
        method: "POST",
        body: { variant: "v1", action: "clicked_rainbow" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("writes a shown event with hashed session", async () => {
    const res = await exitMod.POST(
      makeRequest("/api/exit-intent-log", {
        method: "POST",
        body: {
          variant: "default_v1",
          action: "shown",
          session_id: "sess-abc-123",
          page_path: "/compare",
        },
      }),
    );
    expect(res.status).toBe(200);
    const rows = getTable("exit_intent_events");
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe("shown");
    expect(rows[0].modal_variant).toBe("default_v1");
    // Session hash should NOT equal the raw session id
    expect(rows[0].session_hash).not.toBe("sess-abc-123");
    expect(String(rows[0].session_hash).length).toBe(32);
  });

  it("writes a converted event", async () => {
    const res = await exitMod.POST(
      makeRequest("/api/exit-intent-log", {
        method: "POST",
        body: {
          variant: "default_v1",
          action: "converted_subscribe",
          session_id: "s",
          page_path: "/broker/stake",
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(getTable("exit_intent_events")[0].action).toBe(
      "converted_subscribe",
    );
  });
});
