import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { render, screen, userEvent, waitFor } from "./setup";
import AskQuestionForm from "@/components/AskQuestionForm";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
});

afterEach(() => {
  delete (globalThis as unknown as { fetch?: unknown }).fetch;
});

describe("AskQuestionForm — collapsed state", () => {
  it("renders the open-form trigger with the broker name", () => {
    render(<AskQuestionForm brokerSlug="acme" brokerName="Acme Broker" />);
    expect(
      screen.getByRole("button", {
        name: /Ask a question about Acme Broker/,
      }),
    ).toBeInTheDocument();
  });

  it("does NOT render the form fields until the trigger is clicked", () => {
    render(<AskQuestionForm brokerSlug="acme" brokerName="Acme" />);
    expect(screen.queryByLabelText("Your question")).not.toBeInTheDocument();
  });
});

describe("AskQuestionForm — form open state", () => {
  it("opens the form when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<AskQuestionForm brokerSlug="acme" brokerName="Acme" />);
    await user.click(
      screen.getByRole("button", { name: /Ask a question about Acme/ }),
    );
    expect(screen.getByLabelText("Your question")).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email (optional)")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Submit Question" }),
    ).toBeInTheDocument();
  });

  it("Cancel button closes the form again", async () => {
    const user = userEvent.setup();
    render(<AskQuestionForm brokerSlug="acme" brokerName="Acme" />);
    await user.click(
      screen.getByRole("button", { name: /Ask a question about Acme/ }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("Your question")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Ask a question about Acme/ }),
    ).toBeInTheDocument();
  });
});

describe("AskQuestionForm — validation (client-side)", () => {
  it("rejects questions shorter than 10 characters", async () => {
    const user = userEvent.setup();
    render(<AskQuestionForm brokerSlug="acme" brokerName="Acme" />);
    await user.click(
      screen.getByRole("button", { name: /Ask a question about Acme/ }),
    );
    await user.type(screen.getByLabelText("Your question"), "short");
    await user.type(screen.getByLabelText("Your name"), "Jo");
    await user.click(
      screen.getByRole("button", { name: "Submit Question" }),
    );
    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent("Question must be at least 10 characters");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects names shorter than 2 characters", async () => {
    const user = userEvent.setup();
    render(<AskQuestionForm brokerSlug="acme" brokerName="Acme" />);
    await user.click(
      screen.getByRole("button", { name: /Ask a question about Acme/ }),
    );
    await user.type(
      screen.getByLabelText("Your question"),
      "This is a valid length question?",
    );
    await user.type(screen.getByLabelText("Your name"), "X");
    await user.click(
      screen.getByRole("button", { name: "Submit Question" }),
    );
    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent(/Please enter your name/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("AskQuestionForm — submission", () => {
  it("POSTs the trimmed payload to /api/questions on success", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const user = userEvent.setup();
    render(
      <AskQuestionForm
        brokerSlug="acme"
        brokerName="Acme"
        pageType="article"
        pageSlug="acme-review"
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /Ask a question about Acme/ }),
    );
    await user.type(
      screen.getByLabelText("Your question"),
      "Does this broker support DRP?",
    );
    await user.type(screen.getByLabelText("Your name"), "Jane Doe");
    await user.type(
      screen.getByLabelText("Email (optional)"),
      " jane@example.com ",
    );
    await user.click(
      screen.getByRole("button", { name: "Submit Question" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/questions");
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      broker_slug: "acme",
      page_type: "article",
      page_slug: "acme-review",
      question: "Does this broker support DRP?",
      display_name: "Jane Doe",
      email: "jane@example.com",
    });
  });

  it("omits email from the payload when left blank", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const user = userEvent.setup();
    render(<AskQuestionForm brokerSlug="acme" brokerName="Acme" />);
    await user.click(
      screen.getByRole("button", { name: /Ask a question about Acme/ }),
    );
    await user.type(
      screen.getByLabelText("Your question"),
      "Does this broker support DRP?",
    );
    await user.type(screen.getByLabelText("Your name"), "Jane");
    await user.click(
      screen.getByRole("button", { name: "Submit Question" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(body.email).toBeUndefined();
  });

  it("falls back to brokerSlug for page_slug when pageSlug is missing", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const user = userEvent.setup();
    render(<AskQuestionForm brokerSlug="acme" brokerName="Acme" />);
    await user.click(
      screen.getByRole("button", { name: /Ask a question about Acme/ }),
    );
    await user.type(
      screen.getByLabelText("Your question"),
      "Some valid question here?",
    );
    await user.type(screen.getByLabelText("Your name"), "Jane");
    await user.click(
      screen.getByRole("button", { name: "Submit Question" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(body.page_slug).toBe("acme");
    expect(body.page_type).toBe("broker");
  });

  it("shows the success card after a successful POST", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const user = userEvent.setup();
    render(<AskQuestionForm brokerSlug="acme" brokerName="Acme" />);
    await user.click(
      screen.getByRole("button", { name: /Ask a question about Acme/ }),
    );
    await user.type(
      screen.getByLabelText("Your question"),
      "Does this broker support DRP?",
    );
    await user.type(screen.getByLabelText("Your name"), "Jane");
    await user.click(
      screen.getByRole("button", { name: "Submit Question" }),
    );
    await waitFor(() =>
      expect(
        screen.getByText("Thanks for your question!"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "Ask another question" }),
    ).toBeInTheDocument();
  });

  it("surfaces the server-supplied error message on a 4xx response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Rate limited" }),
    });
    const user = userEvent.setup();
    render(<AskQuestionForm brokerSlug="acme" brokerName="Acme" />);
    await user.click(
      screen.getByRole("button", { name: /Ask a question about Acme/ }),
    );
    await user.type(
      screen.getByLabelText("Your question"),
      "Does this broker support DRP?",
    );
    await user.type(screen.getByLabelText("Your name"), "Jane");
    await user.click(
      screen.getByRole("button", { name: "Submit Question" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Rate limited"),
    );
  });
});

describe("AskQuestionForm — success → reset", () => {
  it("Ask another question button returns to the collapsed entry point", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const user = userEvent.setup();
    render(<AskQuestionForm brokerSlug="acme" brokerName="Acme" />);
    await user.click(
      screen.getByRole("button", { name: /Ask a question about Acme/ }),
    );
    await user.type(
      screen.getByLabelText("Your question"),
      "Does this broker support DRP?",
    );
    await user.type(screen.getByLabelText("Your name"), "Jane");
    await user.click(
      screen.getByRole("button", { name: "Submit Question" }),
    );
    await waitFor(() =>
      expect(
        screen.getByText("Thanks for your question!"),
      ).toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole("button", { name: "Ask another question" }),
    );
    expect(
      screen.getByRole("button", { name: /Ask a question about Acme/ }),
    ).toBeInTheDocument();
  });
});
