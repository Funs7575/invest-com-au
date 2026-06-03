import { describe, it, expect } from "vitest";
import { parseAction, REPORTABLE_CATEGORIES } from "../../bots/ai/actions";

describe("parseAction — valid actions", () => {
  it("accepts click with a ref", () => {
    const r = parseAction({ type: "click", ref: "e12", note: "the CTA" });
    expect(r).toEqual({ ok: true, action: { type: "click", ref: "e12", note: "the CTA" } });
  });
  it("accepts type and truncates very long text", () => {
    const r = parseAction({ type: "type", ref: "e1", text: "x".repeat(5000) });
    expect(r.ok).toBe(true);
    if (r.ok && r.action.type === "type") expect(r.action.text.length).toBe(2000);
  });
  it("accepts a same-site navigate path", () => {
    const r = parseAction({ type: "navigate", path: "/compare" });
    expect(r.ok).toBe(true);
  });
  it("accepts scroll up/down", () => {
    expect(parseAction({ type: "scroll", direction: "down" }).ok).toBe(true);
    expect(parseAction({ type: "scroll", direction: "up" }).ok).toBe(true);
  });
  it("accepts a report_issue in an allowed category", () => {
    const r = parseAction({
      type: "report_issue",
      severity: "high",
      category: "ux",
      title: "Confusing CTA",
      detail: "Two buttons say Continue",
    });
    expect(r.ok).toBe(true);
  });
  it("accepts finish and defaults outcome to success", () => {
    const r = parseAction({ type: "finish" });
    expect(r.ok).toBe(true);
    if (r.ok && r.action.type === "finish") expect(r.action.outcome).toBe("success");
  });
});

describe("parseAction — rejects bad input (safety boundary)", () => {
  it("rejects non-objects", () => {
    expect(parseAction("click").ok).toBe(false);
    expect(parseAction(null).ok).toBe(false);
    expect(parseAction(["click"]).ok).toBe(false);
  });
  it("rejects a missing type", () => {
    expect(parseAction({ ref: "e1" }).ok).toBe(false);
  });
  it("rejects unknown action types", () => {
    expect(parseAction({ type: "eval", code: "alert(1)" }).ok).toBe(false);
  });
  it("rejects click without a ref", () => {
    expect(parseAction({ type: "click" }).ok).toBe(false);
  });
  it("rejects type without text", () => {
    expect(parseAction({ type: "type", ref: "e1" }).ok).toBe(false);
  });
  it("rejects off-site or protocol-relative navigation", () => {
    expect(parseAction({ type: "navigate", path: "https://evil.example" }).ok).toBe(false);
    expect(parseAction({ type: "navigate", path: "//evil.example" }).ok).toBe(false);
    expect(parseAction({ type: "navigate", path: "compare" }).ok).toBe(false);
  });
  it("rejects an out-of-set report_issue category", () => {
    // mechanical categories are owned by the automated checks, not the AI
    expect(
      parseAction({ type: "report_issue", severity: "high", category: "http-error", title: "x" }).ok,
    ).toBe(false);
    expect(REPORTABLE_CATEGORIES).not.toContain("http-error");
  });
  it("rejects a bad severity", () => {
    expect(
      parseAction({ type: "report_issue", severity: "boom", category: "ux", title: "x" }).ok,
    ).toBe(false);
  });
  it("rejects report_issue without a title", () => {
    expect(parseAction({ type: "report_issue", severity: "low", category: "ux" }).ok).toBe(false);
  });
  it("rejects a bad finish outcome", () => {
    expect(parseAction({ type: "finish", outcome: "exploded" }).ok).toBe(false);
  });
});
