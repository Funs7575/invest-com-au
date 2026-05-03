import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, userEvent } from "./setup";
import ReportProblemButton from "@/components/ReportProblemButton";

describe("ReportProblemButton", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    Object.defineProperty(window, "innerWidth", {
      value: 1280,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 720,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window.navigator, "userAgent", {
      value: "test-agent/1.0",
      configurable: true,
    });
    // jsdom's window.location is read-only on the descriptor; redefine it.
    Object.defineProperty(window, "location", {
      value: {
        href: "https://invest.com.au/best/share-trading?ref=x",
        pathname: "/best/share-trading",
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the floating trigger button", () => {
    render(<ReportProblemButton />);
    expect(
      screen.getByRole("button", { name: /report a problem/i })
    ).toBeInTheDocument();
  });

  it("opens the modal when the trigger button is clicked", async () => {
    const user = userEvent.setup();
    render(<ReportProblemButton />);

    await user.click(screen.getByRole("button", { name: /report a problem/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/what happened/i)).toBeInTheDocument();
  });

  it("keeps the modal open and shows a validation message when message is empty", async () => {
    const user = userEvent.setup();
    render(<ReportProblemButton />);

    await user.click(screen.getByRole("button", { name: /report a problem/i }));
    await user.click(screen.getByRole("button", { name: /send report/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/describe the problem/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the auto-captured fields plus the user's message to /api/bug-report", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 201,
      json: async () => ({ ok: true, id: "abcdef1234567890" }),
    });

    const user = userEvent.setup();
    render(<ReportProblemButton />);

    await user.click(screen.getByRole("button", { name: /report a problem/i }));
    await user.type(
      screen.getByLabelText(/what happened/i),
      "The save button did not work"
    );
    await user.click(screen.getByRole("button", { name: /send report/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    if (!call) throw new Error("expected fetch call");
    const [url, init] = call as [string, RequestInit];
    expect(url).toBe("/api/bug-report");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({
      page_url: "https://invest.com.au/best/share-trading?ref=x",
      route: "/best/share-trading",
      user_message: "The save button did not work",
      user_agent: "test-agent/1.0",
      viewport: "1280x720",
    });
    expect(body).not.toHaveProperty("email");
    expect(body).not.toHaveProperty("severity_guess");
  });

  it("shows the success state with a truncated reference id on 201", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 201,
      json: async () => ({ ok: true, id: "abcdef1234567890" }),
    });

    const user = userEvent.setup();
    render(<ReportProblemButton />);
    await user.click(screen.getByRole("button", { name: /report a problem/i }));
    await user.type(screen.getByLabelText(/what happened/i), "broken layout");
    await user.click(screen.getByRole("button", { name: /send report/i }));

    await waitFor(() => {
      expect(screen.getByText(/thanks/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/abcdef12/)).toBeInTheDocument();
    expect(screen.queryByText(/abcdef1234/)).not.toBeInTheDocument();
  });

  it("shows the rate-limit message on 429", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 429,
      json: async () => ({ error: "rate_limited" }),
    });

    const user = userEvent.setup();
    render(<ReportProblemButton />);
    await user.click(screen.getByRole("button", { name: /report a problem/i }));
    await user.type(screen.getByLabelText(/what happened/i), "spam clicking");
    await user.click(screen.getByRole("button", { name: /send report/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /too many submissions/i
      );
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
