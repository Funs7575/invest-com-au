import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "./setup";

const { mockGetIntentCountry } = vi.hoisted(() => ({
  mockGetIntentCountry: vi.fn(),
}));

vi.mock("@/lib/intent-context-server", () => ({
  getIntentCountry: mockGetIntentCountry,
}));

import HomeCrossBorder from "@/components/HomeCrossBorder";

describe("HomeCrossBorder", () => {
  beforeEach(() => {
    mockGetIntentCountry.mockReset();
  });

  it("renders 4 arrival cards in default order when no country is set", async () => {
    mockGetIntentCountry.mockResolvedValue(null);
    const ui = await HomeCrossBorder();
    render(<>{ui}</>);
    const cards = screen.getAllByText(/Coming from /);
    expect(cards).toHaveLength(4);
    // Default order: UK, India, China, US
    expect(cards[0]).toHaveTextContent("Coming from the UK");
    expect(cards[3]).toHaveTextContent("Coming from the US");
  });

  it("hoists India to position 1 when intent country is 'in'", async () => {
    mockGetIntentCountry.mockResolvedValue("in");
    const ui = await HomeCrossBorder();
    render(<>{ui}</>);
    const cards = screen.getAllByText(/Coming from /);
    expect(cards[0]).toHaveTextContent("Coming from India");
    // Other cards remain present, just shifted
    expect(cards).toHaveLength(4);
  });

  it("hoists US to position 1 when intent country is 'us'", async () => {
    mockGetIntentCountry.mockResolvedValue("us");
    const ui = await HomeCrossBorder();
    render(<>{ui}</>);
    const cards = screen.getAllByText(/Coming from /);
    expect(cards[0]).toHaveTextContent("Coming from the US");
  });

  it("does NOT reorder for a country not in the 4-card set (HK)", async () => {
    // FIN_NOTEBOOK 2026-05-01 stance: don't broaden the cross-border
    // section beyond the 4 inbound-migrant audiences. HK selection
    // shouldn't reshape the UI here — the country-mode strips above
    // already cover that surface area.
    mockGetIntentCountry.mockResolvedValue("hk");
    const ui = await HomeCrossBorder();
    render(<>{ui}</>);
    const cards = screen.getAllByText(/Coming from /);
    expect(cards[0]).toHaveTextContent("Coming from the UK");
    expect(cards).toHaveLength(4);
  });
});
