import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "./setup";
import SocialProofCounter from "@/components/SocialProofCounter";

/**
 * The counter renders REAL aggregates only, fetched from
 * /api/social-proof (lib/social-proof.ts computes them from
 * analytics_events with a visibility floor). These tests pin the
 * honesty contract:
 *
 *   - above the floor: the server-provided label renders verbatim
 *   - below the floor / loading / error: nothing renders at all
 *     (empty DOM → zero layout shift), and no number is ever invented
 *     client-side (the old implementation fabricated a figure from a
 *     time-of-day sine curve — that must never come back).
 */

const VISIBLE_PAYLOAD = {
  metric: "compare",
  show: true,
  count: 1240,
  label: "1,240 platforms compared on invest.com.au in the past 30 days",
  windowDays: 30,
};

function mockFetchOnce(payload: unknown, status = 200) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("SocialProofCounter", () => {
  it("renders the server-provided label when the aggregate is above the threshold", async () => {
    globalThis.fetch = mockFetchOnce(VISIBLE_PAYLOAD) as unknown as typeof fetch;

    const { container, getByText } = render(<SocialProofCounter variant="badge" />);
    await waitFor(() => {
      expect(
        getByText("1,240 platforms compared on invest.com.au in the past 30 days"),
      ).toBeInTheDocument();
    });
    // Only the real, server-computed figure appears — no invented numbers.
    expect(container.textContent).toContain("1,240");
  });

  it("requests the metric it was given", async () => {
    const fetchMock = mockFetchOnce({ metric: "quiz", show: false });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<SocialProofCounter variant="badge" metric="quiz" />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/social-proof?metric=quiz");
    });
  });

  it("defaults to the compare metric", async () => {
    const fetchMock = mockFetchOnce({ metric: "compare", show: false });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<SocialProofCounter />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/social-proof?metric=compare");
    });
  });

  it("renders nothing below the threshold (show:false) — zero layout shift", async () => {
    const fetchMock = mockFetchOnce({ metric: "compare", show: false });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { container } = render(<SocialProofCounter variant="badge" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    // Let the resolved-but-hidden state settle, then assert no DOM.
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing while the fetch is pending", () => {
    globalThis.fetch = vi.fn(
      () => new Promise<Response>(() => {}),
    ) as unknown as typeof fetch;

    const { container } = render(<SocialProofCounter />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the API errors (non-200)", async () => {
    const fetchMock = mockFetchOnce({ error: "boom" }, 500);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { container } = render(<SocialProofCounter variant="badge" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the fetch rejects", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { container } = render(<SocialProofCounter />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
  });

  it("ignores a malformed payload claiming show without a label", async () => {
    const fetchMock = mockFetchOnce({ metric: "compare", show: true, label: 42 });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { container } = render(<SocialProofCounter />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
  });

  it("never shows the old fabricated 'investors compared platforms today' figure", async () => {
    const fetchMock = mockFetchOnce({ metric: "compare", show: false });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { container } = render(<SocialProofCounter />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await act(async () => {});
    expect(container.textContent).not.toMatch(/investors compar/i);
    expect(container.textContent).not.toMatch(/today/i);
  });

  it("inline variant includes its own trailing separator when visible (dotted meta rows)", async () => {
    globalThis.fetch = mockFetchOnce(VISIBLE_PAYLOAD) as unknown as typeof fetch;

    const { container, getByText } = render(<SocialProofCounter variant="inline" />);
    await waitFor(() => {
      expect(
        getByText("1,240 platforms compared on invest.com.au in the past 30 days"),
      ).toBeInTheDocument();
    });
    expect(container.textContent).toContain("·");
  });

  it("badge variant does not render the separator", async () => {
    globalThis.fetch = mockFetchOnce(VISIBLE_PAYLOAD) as unknown as typeof fetch;

    const { container, getByText } = render(<SocialProofCounter variant="badge" />);
    await waitFor(() => {
      expect(
        getByText("1,240 platforms compared on invest.com.au in the past 30 days"),
      ).toBeInTheDocument();
    });
    expect(container.textContent).not.toContain("·");
  });
});
