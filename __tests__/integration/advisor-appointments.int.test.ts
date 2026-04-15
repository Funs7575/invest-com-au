import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  installSupabaseFake,
  reset,
  seedTable,
  getTable,
} from "./harness";

installSupabaseFake();

const mod = await import("@/app/api/advisor-appointments/route");

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

const futureIso = (minsFromNow: number) =>
  new Date(Date.now() + minsFromNow * 60_000).toISOString();

describe("integration: /api/advisor-appointments", () => {
  beforeEach(() => reset());

  it("GET requires professional_id", async () => {
    const res = await mod.GET(makeRequest("/api/advisor-appointments"));
    expect(res.status).toBe(400);
  });

  it("GET rejects non-numeric professional_id", async () => {
    const res = await mod.GET(
      makeRequest("/api/advisor-appointments?professional_id=abc"),
    );
    expect(res.status).toBe(400);
  });

  it("GET returns only open future slots for the requested professional", async () => {
    seedTable("advisor_booking_appointments", [
      {
        professional_id: 1,
        starts_at: futureIso(60),
        ends_at: futureIso(90),
        duration_minutes: 30,
        status: "open",
      },
      {
        professional_id: 1,
        starts_at: futureIso(-60), // in the past
        ends_at: futureIso(-30),
        duration_minutes: 30,
        status: "open",
      },
      {
        professional_id: 1,
        starts_at: futureIso(120),
        ends_at: futureIso(150),
        duration_minutes: 30,
        status: "taken",
      },
      {
        professional_id: 2, // different advisor
        starts_at: futureIso(60),
        ends_at: futureIso(90),
        duration_minutes: 30,
        status: "open",
      },
    ]);
    const res = await mod.GET(
      makeRequest("/api/advisor-appointments?professional_id=1"),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { items: unknown[] };
    // Only the single future+open row for professional 1
    expect(json.items).toHaveLength(1);
  });

  it("POST rejects missing fields", async () => {
    const res = await mod.POST(
      makeRequest("/api/advisor-appointments", {
        method: "POST",
        body: { slot_id: 1 },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST claims an open slot", async () => {
    seedTable("advisor_booking_appointments", [
      {
        professional_id: 1,
        starts_at: futureIso(60),
        ends_at: futureIso(90),
        duration_minutes: 30,
        status: "open",
      },
    ]);
    const slotId = getTable("advisor_booking_appointments")[0].id;
    const res = await mod.POST(
      makeRequest("/api/advisor-appointments", {
        method: "POST",
        body: {
          slot_id: slotId,
          email: "alice@example.com",
          name: "Alice",
        },
      }),
    );
    expect(res.status).toBe(200);
    const row = getTable("advisor_booking_appointments")[0];
    expect(row.status).toBe("taken");
    expect(row.booked_by_email).toBe("alice@example.com");
    expect(row.booked_by_name).toBe("Alice");
  });

  it("POST refuses to claim an already-taken slot (409)", async () => {
    seedTable("advisor_booking_appointments", [
      {
        professional_id: 1,
        starts_at: futureIso(60),
        ends_at: futureIso(90),
        duration_minutes: 30,
        status: "taken",
        booked_by_email: "first@example.com",
        booked_by_name: "First",
      },
    ]);
    const slotId = getTable("advisor_booking_appointments")[0].id;
    const res = await mod.POST(
      makeRequest("/api/advisor-appointments", {
        method: "POST",
        body: {
          slot_id: slotId,
          email: "second@example.com",
          name: "Second",
        },
      }),
    );
    expect(res.status).toBe(409);
  });

  it("POST refuses past slots", async () => {
    seedTable("advisor_booking_appointments", [
      {
        professional_id: 1,
        starts_at: futureIso(-60),
        ends_at: futureIso(-30),
        duration_minutes: 30,
        status: "open",
      },
    ]);
    const slotId = getTable("advisor_booking_appointments")[0].id;
    const res = await mod.POST(
      makeRequest("/api/advisor-appointments", {
        method: "POST",
        body: {
          slot_id: slotId,
          email: "alice@example.com",
          name: "Alice",
        },
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("slot_in_past");
  });
});
