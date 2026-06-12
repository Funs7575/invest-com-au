import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "./setup";

import StreakBadge from "@/components/streak/StreakBadge";

const realFetch = global.fetch;

afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});

describe("StreakBadge", () => {
  it("renders the badge after a successful /api/checkin fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ streak: 5 }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { findByLabelText } = render(<StreakBadge />);

    const el = await findByLabelText("5-day curiosity streak — open streak details");
    expect(el).toHaveTextContent("🔥5");
    expect(el).toHaveAttribute("title", "5-day curiosity streak");
    expect(fetchMock).toHaveBeenCalledWith("/api/checkin");
  });

  it("renders nothing when the streak is 0", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ streak: 0 }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { queryByLabelText } = render(<StreakBadge />);

    // Give the effect + promise chain a chance to resolve.
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(queryByLabelText(/curiosity streak/)).toBeNull();
  });

  it("renders nothing when the response is not ok (early return before json)", async () => {
    const json = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { queryByLabelText } = render(<StreakBadge />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(json).not.toHaveBeenCalled();
    expect(queryByLabelText(/curiosity streak/)).toBeNull();
  });

  it("swallows a rejected fetch and renders nothing without throwing", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { queryByLabelText } = render(<StreakBadge />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(queryByLabelText(/curiosity streak/)).toBeNull();
  });
});
