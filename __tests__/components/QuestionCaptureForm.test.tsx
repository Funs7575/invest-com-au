import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "./setup";
import userEvent from "@testing-library/user-event";
import QuestionCaptureForm from "@/components/QuestionCaptureForm";

const SHORT_Q = "Too short";
const VALID_Q = "What is the cheapest broker for buying US shares inside an SMSF?";
const LONG_Q = "x".repeat(501);

function mockFetchOk(slug = "what-is-the-cheapest-broker-a1b2c3") {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ slug, status: "pending_moderation" }),
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

describe("QuestionCaptureForm", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("renders the form with all fields", () => {
    render(<QuestionCaptureForm />);
    expect(screen.getByTestId("qq-capture-form")).toBeInTheDocument();
    expect(screen.getByTestId("qq-question-input")).toBeInTheDocument();
    expect(screen.getByTestId("qq-category-select")).toBeInTheDocument();
    expect(screen.getByTestId("qq-email-input")).toBeInTheDocument();
    expect(screen.getByTestId("qq-submit-btn")).toBeInTheDocument();
  });

  it("pre-fills category from prop", () => {
    render(<QuestionCaptureForm category="share_broker" />);
    expect(screen.getByTestId("qq-category-select")).toHaveValue("share_broker");
  });

  it("shows validation error when question is too short", async () => {
    const user = userEvent.setup();
    render(<QuestionCaptureForm />);

    await user.type(screen.getByTestId("qq-question-input"), SHORT_Q);
    await user.click(screen.getByTestId("qq-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("qq-question-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("qq-question-error")).toHaveTextContent(
      "at least 10 characters",
    );
  });

  it("shows validation error when question exceeds 500 chars", async () => {
    const user = userEvent.setup();
    render(<QuestionCaptureForm />);

    const textarea = screen.getByTestId("qq-question-input");
    await user.click(textarea);
    await user.paste(LONG_Q);

    await user.click(screen.getByTestId("qq-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("qq-question-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("qq-question-error")).toHaveTextContent("500 characters");
  });

  it("shows validation error for malformed email", async () => {
    const user = userEvent.setup();
    render(<QuestionCaptureForm />);

    await user.type(screen.getByTestId("qq-question-input"), VALID_Q);
    await user.type(screen.getByTestId("qq-email-input"), "not-an-email");
    await user.click(screen.getByTestId("qq-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("qq-email-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("qq-email-error")).toHaveTextContent("valid email");
  });

  it("accepts a valid question with no email and shows pending state", async () => {
    globalThis.fetch = mockFetchOk();
    const user = userEvent.setup();
    render(<QuestionCaptureForm />);

    await user.type(screen.getByTestId("qq-question-input"), VALID_Q);
    await user.click(screen.getByTestId("qq-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("qq-pending-state")).toBeInTheDocument();
    });
    expect(screen.getByTestId("qq-pending-state")).toHaveTextContent("submitted");
  });

  it("posts correct payload to /api/answers/ask", async () => {
    const mockFetch = mockFetchOk();
    globalThis.fetch = mockFetch;
    const user = userEvent.setup();
    render(<QuestionCaptureForm category="super_fund" />);

    await user.type(screen.getByTestId("qq-question-input"), VALID_Q);
    await user.type(screen.getByTestId("qq-email-input"), "finn@example.com");
    await user.click(screen.getByTestId("qq-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("qq-pending-state")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/answers/ask");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body.question).toBe(VALID_Q);
    expect(body.email).toBe("finn@example.com");
    expect(body.category).toBe("super_fund");
  });

  it("shows rate-limit message on 429", async () => {
    globalThis.fetch = mockFetchError(429);
    const user = userEvent.setup();
    render(<QuestionCaptureForm />);

    await user.type(screen.getByTestId("qq-question-input"), VALID_Q);
    await user.click(screen.getByTestId("qq-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("qq-server-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("qq-server-error")).toHaveTextContent("Too many");
  });

  it("shows network error message on fetch failure", async () => {
    globalThis.fetch = mockFetchNetworkError();
    const user = userEvent.setup();
    render(<QuestionCaptureForm />);

    await user.type(screen.getByTestId("qq-question-input"), VALID_Q);
    await user.click(screen.getByTestId("qq-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("qq-server-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("qq-server-error")).toHaveTextContent("Network error");
  });

  it("omits email from payload when left blank", async () => {
    const mockFetch = mockFetchOk();
    globalThis.fetch = mockFetch;
    const user = userEvent.setup();
    render(<QuestionCaptureForm />);

    await user.type(screen.getByTestId("qq-question-input"), VALID_Q);
    await user.click(screen.getByTestId("qq-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("qq-pending-state")).toBeInTheDocument();
    });

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body.email).toBeUndefined();
  });
});
