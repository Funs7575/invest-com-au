import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waitFor, screen } from "@testing-library/react";
import { render } from "./setup";
import SocialProofCounter from "@/components/SocialProofCounter";

/**
 * The counter may only ever show a REAL figure: the old implementation
 * fabricated "X investors compared platforms today" from a time-of-day
 * curve (killed in #1489, ACL s18). It now fetches a genuine trailing-7-day
 * distinct-session count from /api/social-proof and renders nothing unless
 * the server confirms the real number clears the threshold — these tests
 * pin that a fabricated counter can't quietly come back.
 */

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function jsonResponse(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
}

describe("SocialProofCounter", () => {
  it("renders nothing while loading and when below threshold", async () => {
    fetchMock.mockReturnValue(jsonResponse({ show: false, count: null, periodDays: 7 }));
    const { container } = render(<SocialProofCounter />);
    // Pre-response: nothing (no skeleton, no placeholder number).
    expect(container).toBeEmptyDOMElement();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the honest 7-day figure when the API confirms it", async () => {
    fetchMock.mockReturnValue(jsonResponse({ show: true, count: 1234, periodDays: 7 }));
    render(<SocialProofCounter surface="compare" />);
    await waitFor(() =>
      expect(
        screen.getByText("1,234 investors compared platforms in the last 7 days"),
      ).toBeTruthy(),
    );
  });

  it("uses surface-specific honest copy and passes the surface to the API", async () => {
    fetchMock.mockReturnValue(jsonResponse({ show: true, count: 88, periodDays: 7 }));
    render(<SocialProofCounter variant="badge" surface="calculator" />);
    await waitFor(() =>
      expect(screen.getByText("88 people ran calculations in the last 7 days")).toBeTruthy(),
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/social-proof?surface=calculator");
  });

  it("fails to nothing when the fetch rejects", async () => {
    fetchMock.mockReturnValue(Promise.reject(new Error("network")));
    const { container } = render(<SocialProofCounter />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("never shows an invented activity figure when the API stays silent", async () => {
    fetchMock.mockReturnValue(jsonResponse({ show: false, count: null, periodDays: 7 }));
    const { container } = render(<SocialProofCounter />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container.textContent).not.toMatch(/investors compar/i);
  });
});
