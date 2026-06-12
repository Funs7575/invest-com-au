import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "./setup";
import FollowUpPanel from "@/app/advisor-portal/follow-up/FollowUpPanel";
import type { Advisor, Lead } from "@/app/advisor-portal/types";

const ADVISOR: Advisor = { id: 7, name: "Dana", slug: "dana", type: "financial_adviser" };
const LEADS: Lead[] = [
  { id: 1, user_name: "Sam Smith", user_email: "sam@x.com", status: "new", bill_amount_cents: 0, billed: false, created_at: "2026-06-10T00:00:00Z", pipeline_stage: "new" },
];

function mockFetchOnce(payload: unknown, ok = true) {
  vi.spyOn(global, "fetch").mockResolvedValue({
    ok,
    json: async () => payload,
    statusText: ok ? "OK" : "ERR",
  } as Response);
}

const RENDER_LIST = () => <div data-testid="classic-list">CLASSIC LIST</div>;

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("FollowUpPanel — kanban only renders when the flag is on", () => {
  it("renders ONLY the existing list when the CRM endpoint reports the flag is off", async () => {
    mockFetchOnce({ enabled: false });
    render(<FollowUpPanel leads={LEADS} advisor={ADVISOR} renderList={RENDER_LIST} onMoveStage={vi.fn()} />);

    // The classic list shows immediately (pass-through before the fetch resolves too).
    expect(screen.getByTestId("classic-list")).toBeInTheDocument();

    // After the fetch resolves with enabled:false, the Board toggle never appears.
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Board/i })).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("classic-list")).toBeInTheDocument();
  });

  it("renders the kanban (Board toggle + columns) when the flag is on", async () => {
    mockFetchOnce({ enabled: true, tasks: [], sequences: [], enrolments: [] });
    render(<FollowUpPanel leads={LEADS} advisor={ADVISOR} renderList={RENDER_LIST} onMoveStage={vi.fn()} />);

    // Board/List toggle appears only in flag-on mode.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Board/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /List/i })).toBeInTheDocument();
    // The pipeline board is present (board view is the default). "Negotiating"
    // appears both as a column header and as a per-card stage <option>, so use
    // getAllByText rather than asserting a single node.
    expect(screen.getByRole("list", { name: /Lead pipeline board/i })).toBeInTheDocument();
    expect(screen.getAllByText("Negotiating").length).toBeGreaterThan(0);
    // The lead card is rendered in its stage column.
    expect(screen.getByText("Sam Smith")).toBeInTheDocument();
  });

  it("falls back to the existing list when the CRM fetch fails (never breaks the leads view)", async () => {
    mockFetchOnce({}, false);
    render(<FollowUpPanel leads={LEADS} advisor={ADVISOR} renderList={RENDER_LIST} onMoveStage={vi.fn()} />);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Board/i })).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("classic-list")).toBeInTheDocument();
  });
});
