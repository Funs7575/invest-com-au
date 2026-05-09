import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { submitLead } from "@/lib/submit-lead-client";

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));

vi.stubGlobal("fetch", mockFetch);

describe("submitLead", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("POSTs to /api/submit-lead with JSON payload", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, lead_id: 42, matched: null }),
    });

    const result = await submitLead({
      lead_type: "advisor",
      user_email: "test@example.com",
      source_page: "/find-advisor",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/submit-lead",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, { body: string }])[1].body,
    );
    expect(body.lead_type).toBe("advisor");
    expect(body.user_email).toBe("test@example.com");
    expect(result.lead_id).toBe(42);
  });

  it("throws when server returns non-2xx", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Invalid email" }),
    });

    await expect(
      submitLead({
        lead_type: "advisor",
        user_email: "bad",
        source_page: "/find-advisor",
      }),
    ).rejects.toThrow("Invalid email");
  });

  it("throws generic message when error body is unparseable", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error("bad JSON")),
    });

    await expect(
      submitLead({
        lead_type: "advisor",
        user_email: "test@example.com",
        source_page: "/hub",
      }),
    ).rejects.toThrow("Lead submission failed");
  });

  it("passes dry_run and exclude_advisor_ids through", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ matched: { id: 7 } }),
    });

    await submitLead({
      lead_type: "advisor",
      user_email: "u@x.com",
      source_page: "/find-advisor",
      dry_run: true,
      exclude_advisor_ids: [1, 2],
    });

    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, { body: string }])[1].body,
    );
    expect(body.dry_run).toBe(true);
    expect(body.exclude_advisor_ids).toEqual([1, 2]);
  });
});
