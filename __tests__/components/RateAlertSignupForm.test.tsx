import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "./setup";
import userEvent from "@testing-library/user-event";
import * as nextNavigation from "next/navigation";

// Per-test control over `useSearchParams()` so we can simulate the
// verify/unsubscribe round-trip. The global mock from `setup.tsx` returns
// an empty `URLSearchParams` for every test; we use `vi.spyOn` here so we
// can return a populated one for the token-state tests without rebuilding
// the entire next/navigation mock.
import RateAlertSignupForm from "@/app/rate-alerts/RateAlertSignupForm";

function mockFetchOk(payload: Record<string, unknown> = { success: true }) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
  });
}

function mockFetchError(status: number, error?: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: error ?? "Server error" }),
  });
}

function mockFetchNetworkError() {
  return vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
}

describe("RateAlertSignupForm", () => {
  let originalFetch: typeof globalThis.fetch;
  let searchParamsSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    searchParamsSpy = vi.spyOn(nextNavigation, "useSearchParams");
    // Default: empty params, matching the setup.tsx mock. Individual
    // tests override via `searchParamsSpy.mockReturnValue(...)`.
    searchParamsSpy.mockReturnValue(
      new URLSearchParams() as ReturnType<typeof nextNavigation.useSearchParams>,
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    searchParamsSpy.mockRestore();
  });

  it("renders the form with default product/frequency and threshold filled", () => {
    render(<RateAlertSignupForm />);
    expect(screen.getByTestId("rate-alert-form")).toBeInTheDocument();
    expect(screen.getByTestId("rate-alert-email")).toBeInTheDocument();
    expect(screen.getByTestId("rate-alert-threshold")).toHaveValue(5.25);
    // Default product = savings_account, default frequency = instant.
    expect(
      screen.getByTestId("rate-alert-kind-savings_account"),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("rate-alert-freq-instant")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("rejects an invalid email before hitting the network", async () => {
    const fetchSpy = mockFetchOk();
    globalThis.fetch = fetchSpy;
    const user = userEvent.setup();
    render(<RateAlertSignupForm />);

    await user.type(screen.getByTestId("rate-alert-email"), "not-an-email");
    await user.click(screen.getByTestId("rate-alert-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("rate-alert-error")).toHaveTextContent(
        /valid email/i,
      );
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects an out-of-range threshold before hitting the network", async () => {
    const fetchSpy = mockFetchOk();
    globalThis.fetch = fetchSpy;
    const user = userEvent.setup();
    render(<RateAlertSignupForm />);

    await user.type(screen.getByTestId("rate-alert-email"), "finn@example.com");
    const threshold = screen.getByTestId("rate-alert-threshold");
    await user.clear(threshold);
    await user.type(threshold, "120");
    await user.click(screen.getByTestId("rate-alert-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("rate-alert-error")).toHaveTextContent(
        /target rate/i,
      );
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("POSTs the canonical payload shape to /api/rate-alerts", async () => {
    const fetchSpy = mockFetchOk();
    globalThis.fetch = fetchSpy;
    const user = userEvent.setup();
    render(<RateAlertSignupForm />);

    await user.type(screen.getByTestId("rate-alert-email"), "finn@example.com");
    await user.click(screen.getByTestId("rate-alert-kind-term_deposit"));
    await user.click(screen.getByTestId("rate-alert-freq-weekly"));
    await user.click(screen.getByTestId("rate-alert-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("rate-alert-success")).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/rate-alerts");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      email: "finn@example.com",
      product_kind: "term_deposit",
      threshold_pct: 5.25,
      frequency: "weekly",
    });
    // Honeypot stays empty for a real user.
    expect(body.website).toBe("");
  });

  it("shows the success state with the submitted email after a 200", async () => {
    globalThis.fetch = mockFetchOk();
    const user = userEvent.setup();
    render(<RateAlertSignupForm />);

    await user.type(screen.getByTestId("rate-alert-email"), "watcher@example.com");
    await user.click(screen.getByTestId("rate-alert-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("rate-alert-success")).toBeInTheDocument();
    });
    expect(screen.getByTestId("rate-alert-success")).toHaveTextContent(
      "watcher@example.com",
    );
  });

  it("surfaces the server error message on a non-2xx response", async () => {
    globalThis.fetch = mockFetchError(429, "Too many requests.");
    const user = userEvent.setup();
    render(<RateAlertSignupForm />);

    await user.type(screen.getByTestId("rate-alert-email"), "finn@example.com");
    await user.click(screen.getByTestId("rate-alert-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("rate-alert-error")).toHaveTextContent(
        /too many/i,
      );
    });
  });

  it("falls back to a network-error message on a thrown fetch", async () => {
    globalThis.fetch = mockFetchNetworkError();
    const user = userEvent.setup();
    render(<RateAlertSignupForm />);

    await user.type(screen.getByTestId("rate-alert-email"), "finn@example.com");
    await user.click(screen.getByTestId("rate-alert-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("rate-alert-error")).toBeInTheDocument();
    });
  });

  it("renders the verified state when ?verify=… returns action=verified", async () => {
    searchParamsSpy.mockReturnValue(
      new URLSearchParams(
        "verify=abc123",
      ) as ReturnType<typeof nextNavigation.useSearchParams>,
    );
    globalThis.fetch = mockFetchOk({ success: true, action: "verified" });
    render(<RateAlertSignupForm />);

    await waitFor(() => {
      expect(screen.getByTestId("rate-alert-verified")).toBeInTheDocument();
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/rate-alerts?verify=abc123",
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("renders the unsubscribed state when ?unsubscribe=… returns action=unsubscribed", async () => {
    searchParamsSpy.mockReturnValue(
      new URLSearchParams(
        "unsubscribe=xyz789",
      ) as ReturnType<typeof nextNavigation.useSearchParams>,
    );
    globalThis.fetch = mockFetchOk({ success: true, action: "unsubscribed" });
    render(<RateAlertSignupForm />);

    await waitFor(() => {
      expect(screen.getByTestId("rate-alert-unsubscribed")).toBeInTheDocument();
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/rate-alerts?unsubscribe=xyz789",
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("renders a token-error state when the verify request returns no action", async () => {
    searchParamsSpy.mockReturnValue(
      new URLSearchParams(
        "verify=expired",
      ) as ReturnType<typeof nextNavigation.useSearchParams>,
    );
    globalThis.fetch = mockFetchOk({ error: "Verification failed." });
    render(<RateAlertSignupForm />);

    await waitFor(() => {
      expect(screen.getByTestId("rate-alert-token-error")).toBeInTheDocument();
    });
  });
});
