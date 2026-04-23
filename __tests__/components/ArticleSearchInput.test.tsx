import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent, mockReplace } from "./setup";
import ArticleSearchInput from "@/components/ArticleSearchInput";

describe("ArticleSearchInput", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("renders a search input with accessible label", () => {
    render(<ArticleSearchInput />);
    const input = screen.getByLabelText("Search articles");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  it("debounces URL updates to 300ms after typing", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ArticleSearchInput />);
    const input = screen.getByLabelText("Search articles");

    await user.type(input, "etfs");
    // Before 300ms — no router.replace call
    expect(mockReplace).not.toHaveBeenCalled();

    // Fast-forward past the debounce window
    vi.advanceTimersByTime(300);
    expect(mockReplace).toHaveBeenCalledTimes(1);
    const href = mockReplace.mock.calls[0]?.[0] as string;
    expect(href).toBe("/articles?q=etfs");
    // scroll:false used for in-page search to avoid losing position
    expect(mockReplace.mock.calls[0]?.[1]).toEqual({ scroll: false });
  });

  it("deletes q param when the input is cleared", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ArticleSearchInput />);
    const input = screen.getByLabelText("Search articles");

    await user.type(input, "x");
    vi.advanceTimersByTime(300);
    mockReplace.mockClear();

    await user.clear(input);
    vi.advanceTimersByTime(300);
    const href = mockReplace.mock.calls[0]?.[0] as string;
    expect(href).toBe("/articles?");
  });

  it("trims whitespace-only input to 'no search'", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ArticleSearchInput />);
    const input = screen.getByLabelText("Search articles");

    await user.type(input, "   ");
    vi.advanceTimersByTime(300);
    const href = mockReplace.mock.calls[0]?.[0] as string;
    expect(href).toBe("/articles?");
  });

  it("coalesces rapid keystrokes into a single URL update", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ArticleSearchInput />);
    const input = screen.getByLabelText("Search articles");

    // Simulate fast typing — each keystroke is within 300ms of the last
    await user.type(input, "abc");
    vi.advanceTimersByTime(100);
    await user.type(input, "def");
    vi.advanceTimersByTime(100);
    await user.type(input, "ghi");
    vi.advanceTimersByTime(100);

    // No update yet — debounce still pending
    expect(mockReplace).not.toHaveBeenCalled();

    // After full 300ms wait — one call, with the final combined value
    vi.advanceTimersByTime(300);
    expect(mockReplace).toHaveBeenCalledTimes(1);
    const href = mockReplace.mock.calls[0]?.[0] as string;
    expect(href).toBe("/articles?q=abcdefghi");
  });
});
