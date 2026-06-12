// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { showRichToast, showToast } from "@/components/Toast";

function stubMatchMedia(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

const toastEl = () => document.getElementById("__imperative_toast");

describe("imperative toast engine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubMatchMedia(false);
  });

  afterEach(() => {
    // Drain the queue between tests so dedupe/queue state resets.
    vi.runAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("showToast renders a status pill with the message", () => {
    showToast("Saved — Stake test one");
    const el = toastEl();
    expect(el).not.toBeNull();
    expect(el?.getAttribute("role")).toBe("status");
    expect(el?.textContent).toContain("Saved — Stake test one");
  });

  it("removes the toast after its duration", () => {
    showToast("Ephemeral test", "success", 1000);
    expect(toastEl()).not.toBeNull();
    vi.advanceTimersByTime(1000 + 250);
    expect(toastEl()).toBeNull();
  });

  it("showRichToast renders title, body and action link", () => {
    showRichToast({
      title: "Saved — your shortlist is born",
      body: "Everything you save lives in one place.",
      actionLabel: "Where saves live →",
      actionHref: "/account/my-saves",
    });
    const el = toastEl();
    expect(el?.textContent).toContain("Saved — your shortlist is born");
    expect(el?.textContent).toContain("Everything you save lives in one place.");
    const link = el?.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/account/my-saves");
  });

  it("milestone variant appends confetti particles (motion allowed)", () => {
    showRichToast({ title: "Milestone test", milestone: true });
    expect(toastEl()?.querySelectorAll(".confetti-particle").length).toBeGreaterThan(0);
  });

  it("milestone variant skips confetti under reduced motion", () => {
    stubMatchMedia(true);
    showRichToast({ title: "Reduced motion milestone" });
    showRichToast({ title: "Reduced motion milestone two", milestone: true });
    // first toast showing; queue holds second — drain first
    vi.advanceTimersByTime(4000);
    expect(toastEl()?.querySelectorAll(".confetti-particle").length ?? 0).toBe(0);
  });

  it("queues a second toast instead of replacing the visible one", () => {
    showToast("First of queue", "success", 1000);
    showToast("Second of queue", "success", 1000);
    expect(toastEl()?.textContent).toContain("First of queue");
    vi.advanceTimersByTime(1250);
    expect(toastEl()?.textContent).toContain("Second of queue");
  });

  it("drops exact repeats while one is visible (double-click protection)", () => {
    showToast("Repeat me", "success", 1000);
    showToast("Repeat me", "success", 1000);
    vi.advanceTimersByTime(1250);
    expect(toastEl()).toBeNull();
  });
});
