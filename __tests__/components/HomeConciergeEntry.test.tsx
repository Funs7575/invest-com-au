import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, userEvent, mockPush } from "../components/setup";
import HomeConciergeEntry from "@/components/HomeConciergeEntry";
import * as tracking from "@/lib/tracking";

describe("HomeConciergeEntry", () => {
  beforeEach(() => {
    mockPush.mockClear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("renders the input, submit button, and starter chips", () => {
    render(<HomeConciergeEntry />);
    expect(
      screen.getByRole("textbox", { name: /ask the investment concierge/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("home-concierge-entry-submit")).toBeInTheDocument();
    expect(screen.getAllByTestId("home-concierge-entry-chip").length).toBeGreaterThanOrEqual(4);
  });

  it("submit button is disabled when input is empty", () => {
    render(<HomeConciergeEntry />);
    const btn = screen.getByTestId("home-concierge-entry-submit");
    expect(btn).toBeDisabled();
  });

  it("submitting writes prompt to sessionStorage and navigates to /concierge", async () => {
    const user = userEvent.setup();
    render(<HomeConciergeEntry />);
    const textarea = screen.getByRole("textbox", { name: /ask the investment concierge/i });
    await user.type(textarea, "what's the best ETF for a beginner?");
    await user.click(screen.getByTestId("home-concierge-entry-submit"));

    expect(sessionStorage.getItem("ic_concierge_pending_prompt_v1")).toBe(
      "what's the best ETF for a beginner?",
    );
    expect(mockPush).toHaveBeenCalledWith("/concierge");
  });

  it("clicking a finder-bound chip navigates with the finder query and writes the chip text", async () => {
    const user = userEvent.setup();
    render(<HomeConciergeEntry />);
    const chips = screen.getAllByTestId("home-concierge-entry-chip");
    const advisorChip = chips.find((c) => /financial advisor/i.test(c.textContent ?? ""));
    expect(advisorChip).toBeDefined();
    await user.click(advisorChip!);

    expect(sessionStorage.getItem("ic_concierge_pending_prompt_v1")).toBe(
      "Choosing a financial advisor",
    );
    expect(mockPush).toHaveBeenCalledWith("/concierge?finder=advisor-finder");
  });

  it("trims whitespace + caps prompt at 200 chars before storage", async () => {
    const user = userEvent.setup();
    render(<HomeConciergeEntry />);
    const textarea = screen.getByRole("textbox", { name: /ask the investment concierge/i });
    // The textarea itself enforces maxLength=200, so typing 250 chars
    // lands 200 in the field — verify storage gets the same.
    const long = "a".repeat(250);
    await user.type(textarea, long);
    await user.click(screen.getByTestId("home-concierge-entry-submit"));

    const stored = sessionStorage.getItem("ic_concierge_pending_prompt_v1");
    expect(stored).not.toBeNull();
    expect(stored!.length).toBeLessThanOrEqual(200);
  });

  it("emits a tracking event on submit including source=input", async () => {
    const spy = vi.spyOn(tracking, "trackEvent");
    const user = userEvent.setup();
    render(<HomeConciergeEntry />);
    const textarea = screen.getByRole("textbox", { name: /ask the investment concierge/i });
    await user.type(textarea, "hello world");
    await user.click(screen.getByTestId("home-concierge-entry-submit"));

    expect(spy).toHaveBeenCalledWith(
      "concierge_homepage_entry_submit",
      expect.objectContaining({ source: "input" }),
    );
  });

  it("emits a tracking event on chip click including source=chip", async () => {
    const spy = vi.spyOn(tracking, "trackEvent");
    const user = userEvent.setup();
    render(<HomeConciergeEntry />);
    const chip = screen.getAllByTestId("home-concierge-entry-chip")[0]!;
    await user.click(chip);

    expect(spy).toHaveBeenCalledWith(
      "concierge_homepage_entry_submit",
      expect.objectContaining({ source: "chip" }),
    );
  });

  it("links to the full /concierge page", () => {
    render(<HomeConciergeEntry />);
    const link = screen.getByRole("link", { name: /open full concierge/i });
    expect(link).toHaveAttribute("href", "/concierge");
  });
});
