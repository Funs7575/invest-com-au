import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "./setup";
import userEvent from "@testing-library/user-event";
import SearchOverlay from "@/components/SearchOverlay";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Fake fetch that simulates /api/search responses
const mockFetch = vi.fn();
global.fetch = mockFetch;

const EMPTY_RESPONSE = {
  brokers: [],
  advisors: [],
  articles: [],
  glossary: [],
  tools: [],
  durationMs: 3,
};

const SAMPLE_RESPONSE = {
  brokers: [{ slug: "commsec", name: "CommSec", tagline: "Australia's #1 broker" }],
  advisors: [{ slug: "jane-smith", name: "Jane Smith", type: "financial-planner", location_display: "Sydney NSW", firm_name: "Smith Wealth" }],
  articles: [{ slug: "cgt-guide", title: "Capital Gains Tax Guide", excerpt: "How CGT works.", category: "tax" }],
  glossary: [{ slug: "cgt", term: "CGT", definition: "Capital Gains Tax", category: "Tax" }],
  tools: [{ slug: "cgt-calculator", title: "CGT Calculator", description: "Capital gains estimator", href: "/cgt-calculator" }],
  durationMs: 10,
};

function makeFetchResponse(body: object, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
  } as Response);
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function renderOpen(onClose = vi.fn()) {
  return render(<SearchOverlay isOpen onClose={onClose} />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SearchOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetch.mockReturnValue(makeFetchResponse(SAMPLE_RESPONSE));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Render / visibility ───────────────────────────────────────────────────

  it("does not render when isOpen=false", () => {
    render(<SearchOverlay isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the dialog when isOpen=true", () => {
    renderOpen();
    expect(screen.getByRole("dialog", { name: "Search" })).toBeInTheDocument();
  });

  it("renders the search input", () => {
    renderOpen();
    expect(screen.getByRole("searchbox", { name: "Search" })).toBeInTheDocument();
  });

  // ── Quick links (empty state) ─────────────────────────────────────────────

  it("shows Quick Links when query is empty", () => {
    renderOpen();
    expect(screen.getByText("Quick Links")).toBeInTheDocument();
    expect(screen.getByText("Compare Platforms")).toBeInTheDocument();
    expect(screen.getByText("Browse Advisors")).toBeInTheDocument();
  });

  it("hides Quick Links once user types 2+ chars", async () => {
    renderOpen();
    const input = screen.getByRole("searchbox");

    await act(async () => {
      await userEvent.type(input, "co");
      vi.runAllTimers(); // flush debounce
    });

    await waitFor(() => {
      expect(screen.queryByText("Quick Links")).not.toBeInTheDocument();
    });
  });

  // ── Debounce ──────────────────────────────────────────────────────────────

  it("does not fire fetch before the 200ms debounce", async () => {
    renderOpen();
    const input = screen.getByRole("searchbox");

    await act(async () => {
      await userEvent.type(input, "co");
      // Only advance 100ms — debounce has not fired yet
      vi.advanceTimersByTime(100);
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fires fetch after 200ms debounce", async () => {
    renderOpen();
    const input = screen.getByRole("searchbox");

    await act(async () => {
      await userEvent.type(input, "co");
      vi.advanceTimersByTime(250);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/search?q=co"),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  // ── Results display ────────────────────────────────────────────────────────

  it("renders broker results after successful search", async () => {
    renderOpen();
    const input = screen.getByRole("searchbox");

    await act(async () => {
      await userEvent.type(input, "CommSec");
      vi.advanceTimersByTime(250);
    });

    await waitFor(() => {
      expect(screen.getByText("CommSec")).toBeInTheDocument();
    });
  });

  it("renders article results", async () => {
    renderOpen();
    const input = screen.getByRole("searchbox");

    await act(async () => {
      await userEvent.type(input, "CGT");
      vi.advanceTimersByTime(250);
    });

    await waitFor(() => {
      expect(screen.getByText("Capital Gains Tax Guide")).toBeInTheDocument();
    });
  });

  it("shows category labels in results", async () => {
    renderOpen();
    const input = screen.getByRole("searchbox");

    await act(async () => {
      await userEvent.type(input, "CommSec");
      vi.advanceTimersByTime(250);
    });

    await waitFor(() => {
      expect(screen.getByText(/Brokers/i)).toBeInTheDocument();
    });
  });

  it("shows 'no results' state when API returns empty", async () => {
    mockFetch.mockReturnValue(makeFetchResponse(EMPTY_RESPONSE));
    renderOpen();
    const input = screen.getByRole("searchbox");

    await act(async () => {
      await userEvent.type(input, "zzz");
      vi.advanceTimersByTime(250);
    });

    await waitFor(() => {
      expect(screen.getByText(/No results for/)).toBeInTheDocument();
    });
  });

  it("shows error state when fetch fails", async () => {
    mockFetch.mockReturnValue(makeFetchResponse({}, false));
    renderOpen();
    const input = screen.getByRole("searchbox");

    await act(async () => {
      await userEvent.type(input, "CommSec");
      vi.advanceTimersByTime(250);
    });

    await waitFor(() => {
      expect(screen.getByText(/Search failed/i)).toBeInTheDocument();
    });
  });

  // ── Keyboard navigation ────────────────────────────────────────────────────

  it("closes on Escape key", async () => {
    const onClose = vi.fn();
    render(<SearchOverlay isOpen onClose={onClose} />);

    await act(async () => {
      const input = screen.getByRole("searchbox");
      input.focus();
      await userEvent.keyboard("{Escape}");
    });

    expect(onClose).toHaveBeenCalled();
  });

  it("navigates results with ArrowDown", async () => {
    renderOpen();
    const input = screen.getByRole("searchbox");

    await act(async () => {
      await userEvent.type(input, "CommSec");
      vi.advanceTimersByTime(250);
    });

    await waitFor(() => screen.getByText("CommSec"));

    await act(async () => {
      await userEvent.keyboard("{ArrowDown}");
    });

    // After ArrowDown, one result should be aria-selected=true
    const selected = screen.getAllByRole("option").find(
      (el) => el.getAttribute("aria-selected") === "true"
    );
    expect(selected).toBeDefined();
  });

  // ── Cmd+K shortcut ────────────────────────────────────────────────────────

  it("dispatches invest:search:open when Cmd+K is pressed and overlay is closed", async () => {
    // Render the overlay in closed state
    render(<SearchOverlay isOpen={false} onClose={vi.fn()} />);

    const eventSpy = vi.fn();
    window.addEventListener("invest:search:open", eventSpy);

    await act(async () => {
      await userEvent.keyboard("{Meta>}k{/Meta}");
    });

    expect(eventSpy).toHaveBeenCalled();
    window.removeEventListener("invest:search:open", eventSpy);
  });

  // ── See all results link ───────────────────────────────────────────────────

  it("shows 'see all results' link after a successful search", async () => {
    renderOpen();
    const input = screen.getByRole("searchbox");

    await act(async () => {
      await userEvent.type(input, "CommSec");
      vi.advanceTimersByTime(250);
    });

    await waitFor(() => {
      expect(screen.getByText(/See all results/i)).toBeInTheDocument();
    });

    const link = screen.getByRole("link", { name: /See all results/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("/search?q=CommSec"));
  });

  // ── Backdrop click ────────────────────────────────────────────────────────

  it("calls onClose when backdrop is clicked", async () => {
    const onClose = vi.fn();
    render(<SearchOverlay isOpen onClose={onClose} />);

    // The backdrop is the first absolute-positioned div
    const backdrop = document.querySelector(".absolute.inset-0") as HTMLElement;
    if (backdrop) {
      await act(async () => {
        backdrop.click();
      });
      expect(onClose).toHaveBeenCalled();
    }
  });
});
