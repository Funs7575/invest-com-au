import { describe, it, expect } from "vitest";
import { render, screen, userEvent } from "./setup";
import GlossarySearch from "@/components/GlossarySearch";

const ENTRIES = [
  {
    term: "ASX",
    definition: "Australian Securities Exchange — primary stock exchange.",
    category: "Markets",
  },
  {
    term: "CHESS",
    definition: "Clearing House Electronic Subregister System.",
    category: "Custody",
  },
  {
    term: "ETF",
    definition: "Exchange Traded Fund — basket of securities.",
  },
];

describe("GlossarySearch", () => {
  it("renders the search input with aria-label", () => {
    render(<GlossarySearch entries={ENTRIES} />);
    expect(screen.getByLabelText("Search glossary terms")).toBeInTheDocument();
  });

  it("does NOT render results until query is > 1 character", async () => {
    const user = userEvent.setup();
    render(<GlossarySearch entries={ENTRIES} />);
    const input = screen.getByRole("searchbox");
    await user.type(input, "A");
    expect(screen.queryByText(/result/)).not.toBeInTheDocument();
  });

  it("filters by term substring (case-insensitive)", async () => {
    const user = userEvent.setup();
    render(<GlossarySearch entries={ENTRIES} />);
    await user.type(screen.getByRole("searchbox"), "asx");
    expect(screen.getByText("ASX")).toBeInTheDocument();
    expect(screen.getByText(/1 result/)).toBeInTheDocument();
  });

  it("filters by definition substring (case-insensitive)", async () => {
    const user = userEvent.setup();
    render(<GlossarySearch entries={ENTRIES} />);
    await user.type(screen.getByRole("searchbox"), "fund");
    expect(screen.getByText("ETF")).toBeInTheDocument();
  });

  it("shows 'No terms match' empty state for unmatched queries", async () => {
    const user = userEvent.setup();
    render(<GlossarySearch entries={ENTRIES} />);
    await user.type(screen.getByRole("searchbox"), "zzzzzzzzz");
    expect(screen.getByText(/No terms match/)).toBeInTheDocument();
  });

  it("pluralises 'results' correctly (1 result vs 2 results)", async () => {
    const user = userEvent.setup();
    render(<GlossarySearch entries={ENTRIES} />);
    // "ex" matches "Exchange" in ASX definition + "Exchange Traded Fund" in ETF definition
    await user.type(screen.getByRole("searchbox"), "exchange");
    expect(screen.getByText(/2 results/)).toBeInTheDocument();
  });

  it("renders the category pill for entries that have a category", async () => {
    const user = userEvent.setup();
    render(<GlossarySearch entries={ENTRIES} />);
    await user.type(screen.getByRole("searchbox"), "asx");
    expect(screen.getByText("Markets")).toBeInTheDocument();
  });

  it("omits the category pill for entries without one", async () => {
    const user = userEvent.setup();
    render(<GlossarySearch entries={ENTRIES} />);
    await user.type(screen.getByRole("searchbox"), "etf");
    // ETF entry has no category — Markets / Custody should not appear
    expect(screen.queryByText("Markets")).not.toBeInTheDocument();
    expect(screen.queryByText("Custody")).not.toBeInTheDocument();
  });
});
