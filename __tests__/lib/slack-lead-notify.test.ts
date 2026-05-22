import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { LeadPayload } from "@/lib/slack-lead-notify";

// Mock global fetch before module import so the mock is in place.
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { sendSlackLeadNotification } from "@/lib/slack-lead-notify";

const HOOK_URL = "https://hooks.slack.com/services/T123/B456/abc";

const baseLead: LeadPayload = {
  userName: "Jane Smith",
  userEmail: "jane@example.com",
  userPhone: "0412 345 678",
  userState: "VIC",
  need: "planning",
  context: ["super", "retirement"],
  leadId: 42,
  sourcePage: "/get-matched",
};

describe("sendSlackLeadNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
  });

  it("calls the webhook URL with POST and JSON content-type", async () => {
    await sendSlackLeadNotification(HOOK_URL, baseLead);
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(HOOK_URL);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("maps known need key to human-readable label", async () => {
    await sendSlackLeadNotification(HOOK_URL, { ...baseLead, need: "planning" });
    const payload = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string) as { blocks: unknown[] };
    const sectionBlock = payload.blocks[1] as { fields: Array<{ text: string }> };
    const needField = sectionBlock.fields.find((f) => f.text.includes("Financial Planning"));
    expect(needField).toBeDefined();
  });

  it("falls back to raw need key when no label mapping exists", async () => {
    await sendSlackLeadNotification(HOOK_URL, { ...baseLead, need: "unknown_need_type" });
    const payload = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string) as { blocks: unknown[] };
    const sectionBlock = payload.blocks[1] as { fields: Array<{ text: string }> };
    const needField = sectionBlock.fields.find((f) => f.text.includes("unknown_need_type"));
    expect(needField).toBeDefined();
  });

  it("joins context array with comma separator", async () => {
    await sendSlackLeadNotification(HOOK_URL, { ...baseLead, context: ["super", "retirement"] });
    const payload = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string) as { blocks: unknown[] };
    const sectionBlock = payload.blocks[1] as { fields: Array<{ text: string }> };
    const contextField = sectionBlock.fields.find((f) => f.text.includes("Context"));
    expect(contextField?.text).toMatch(/super.*retirement/);
  });

  it("shows 'General enquiry' when context array is empty", async () => {
    await sendSlackLeadNotification(HOOK_URL, { ...baseLead, context: [] });
    const payload = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string) as { blocks: unknown[] };
    const sectionBlock = payload.blocks[1] as { fields: Array<{ text: string }> };
    const contextField = sectionBlock.fields.find((f) => f.text.includes("Context"));
    expect(contextField?.text).toMatch(/General enquiry/);
  });

  it("shows 'Not provided' for null userName", async () => {
    await sendSlackLeadNotification(HOOK_URL, { ...baseLead, userName: null });
    const payload = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string) as { blocks: unknown[] };
    const sectionBlock = payload.blocks[1] as { fields: Array<{ text: string }> };
    const nameField = sectionBlock.fields.find((f) => f.text.includes("Name"));
    expect(nameField?.text).toMatch(/Not provided/);
  });

  it("shows '—' for null leadId in context element", async () => {
    await sendSlackLeadNotification(HOOK_URL, { ...baseLead, leadId: null });
    const payload = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string) as { blocks: unknown[] };
    const contextBlock = payload.blocks[3] as { elements: Array<{ text: string }> };
    expect(contextBlock.elements[0]?.text).toMatch(/Lead ID: —/);
  });

  it("shows 'direct' when sourcePage is null", async () => {
    await sendSlackLeadNotification(HOOK_URL, { ...baseLead, sourcePage: null });
    const payload = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string) as { blocks: unknown[] };
    const contextBlock = payload.blocks[3] as { elements: Array<{ text: string }> };
    expect(contextBlock.elements[0]?.text).toMatch(/Source: direct/);
  });

  it("propagates fetch errors (caller is responsible for catch)", async () => {
    mockFetch.mockRejectedValue(new Error("network timeout"));
    await expect(
      sendSlackLeadNotification(HOOK_URL, baseLead),
    ).rejects.toThrow("network timeout");
  });
});
