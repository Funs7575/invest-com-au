import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import LaneResults from "@/app/get-matched/_components/LaneResults";
import type { LaneResolution } from "@/lib/getmatched/resolve-lanes";
import type { TopMatch } from "@/lib/getmatched/types";

const RESOLUTION: LaneResolution = {
  hero: "advisor",
  secondary: ["listings"],
  lanes: [
    { kind: "advisor", weight: 85, reasons: ["You told us which professional you need"] },
    { kind: "listings", weight: 62, reasons: ["There are live property-related opportunities to browse"] },
    { kind: "brief", weight: 20, reasons: [] },
  ],
};

const ADVISOR: TopMatch = {
  kind: "advisor",
  slug: "jane-tax",
  name: "Jane Tax",
  logo_url: null,
  rating: 4.8,
  rating_count: 21,
  one_line_why: "Specialises in Crypto Tax",
  cta_label: "View profile",
  cta_href: "/advisor/jane-tax",
  vertical: null,
};

const ADVISOR2: TopMatch = {
  ...ADVISOR,
  slug: "tom-tax",
  name: "Tom Tax",
  ref_id: 43,
  one_line_why: "8+ years' experience",
  location_display: "Brisbane",
  fee_description: "From $250/hr",
  specialties_preview: ["Crypto Tax", "CGT"],
  cta_href: "/advisor/tom-tax",
};

function renderLanes(over: Partial<Parameters<typeof LaneResults>[0]> = {}) {
  return render(
    <LaneResults
      resolution={RESOLUTION}
      topMatches={[ADVISOR]}
      planId={7}
      shareToken="tok_abc12345"
      ephemeral={false}
      initialSaved={[]}
      {...over}
    />,
  );
}

describe("LaneResults (Decision Engine P5 surface)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ saved_items: [{ kind: "advisor", ref: "jane-tax", label: "Jane Tax", saved_at: "x" }] }),
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the hero lane with its factual reasons and the real advisor match", () => {
    renderLanes();
    expect(screen.getByText("Talk to the right professional")).toBeInTheDocument();
    expect(screen.getByText("Best next step")).toBeInTheDocument();
    expect(screen.getByText("You told us which professional you need")).toBeInTheDocument();
    expect(screen.getByText("Jane Tax")).toBeInTheDocument();
    expect(screen.getByText("Specialises in Crypto Tax")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View profile/ })).toHaveAttribute("href", "/advisor/jane-tax");
  });

  it("renders composite secondaries with the both-paths framing", () => {
    renderLanes();
    expect(screen.getByText(/points more than one way/)).toBeInTheDocument();
    expect(screen.getByText("Browse matching opportunities")).toBeInTheDocument();
    // Non-composite lanes (brief at 20) don't render as blocks.
    expect(screen.queryByText("Describe it once — let professionals respond")).not.toBeInTheDocument();
  });

  it("saves an option via the share-token API and shows the My Options rail", async () => {
    renderLanes();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByText("My options (1)")).toBeInTheDocument());
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(String(call[0])).toBe("/api/get-matched/plans/7/save-item");
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body).toMatchObject({ share_token: "tok_abc12345", action: "add", item: { kind: "advisor", ref: "jane-tax" } });
    // Saving is never contacting — the rail says so.
    expect(screen.getByText(/Saving never contacts anyone/)).toBeInTheDocument();
  });

  it("P7: compares matches side by side without contacting anyone", () => {
    renderLanes({ topMatches: [ADVISOR, ADVISOR2] });
    fireEvent.click(screen.getByRole("button", { name: /Compare your 2 matches/ }));
    const table = screen.getByTestId("advisor-compare-table");
    expect(table).toBeInTheDocument();
    expect(screen.getByText("Brisbane")).toBeInTheDocument();
    expect(screen.getByText("From $250/hr")).toBeInTheDocument();
    expect(screen.getByText("Crypto Tax · CGT")).toBeInTheDocument();
    expect(screen.getByText(/Comparing never contacts anyone/)).toBeInTheDocument();
    // No lead side-effects from comparing.
    expect(fetch).not.toHaveBeenCalled();
  });

  it("hides saving entirely in ephemeral mode (no plan to save to)", () => {
    renderLanes({ ephemeral: true });
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("reverts the optimistic save and alerts when the API fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    renderLanes();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Couldn't update/));
    expect(screen.queryByText("My options (1)")).not.toBeInTheDocument();
  });
});
