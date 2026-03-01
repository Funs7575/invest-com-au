import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "./setup";
import QuizPromptBar from "@/components/QuizPromptBar";

// We need to control usePathname and useShortlist per-test
const mockUsePathname = vi.fn().mockReturnValue("/");
const mockUseShortlist = vi.fn().mockReturnValue({
  slugs: [],
  count: 0,
  toggle: vi.fn(),
  has: vi.fn().mockReturnValue(false),
  add: vi.fn(),
  remove: vi.fn(),
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => mockUsePathname(),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock("@/lib/hooks/useShortlist", () => ({
  useShortlist: () => mockUseShortlist(),
}));

describe("QuizPromptBar", () => {
  let scrollY: number;

  beforeEach(() => {
    vi.clearAllMocks();
    scrollY = 0;

    // Mock window.scrollY
    Object.defineProperty(window, "scrollY", {
      get: () => scrollY,
      configurable: true,
    });

    // Mock window.innerHeight
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      configurable: true,
    });

    // Mock document.documentElement.scrollHeight
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 4000,
      configurable: true,
    });

    // Mock localStorage
    const store: Record<string, string> = {};
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(
      (key) => store[key] || null
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, val) => {
      store[key] = val;
    });

    mockUsePathname.mockReturnValue("/");
    mockUseShortlist.mockReturnValue({
      slugs: [],
      count: 0,
      toggle: vi.fn(),
      has: vi.fn().mockReturnValue(false),
      add: vi.fn(),
      remove: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null initially when not scrolled", () => {
    const { container } = render(<QuizPromptBar />);

    // Before any scroll events, neither mobile nor desktop bar should render
    // The component returns null when showDesktop and showMobile are both false
    expect(container.innerHTML).toBe("");
  });

  it("renders mobile bar content after scroll trigger", () => {
    // Simulate being scrolled past half the viewport
    scrollY = 500; // > innerHeight * 0.5 = 400
    mockUsePathname.mockReturnValue("/article/some-article");

    render(<QuizPromptBar />);

    // Trigger scroll event
    window.dispatchEvent(new Event("scroll"));

    // The mobile bar should now have "Find My Broker" and "Compare" links
    // NOTE: They may not be visible (CSS hides via sm:hidden) but should exist in DOM
    expect(screen.queryByText("Find My Broker")).toBeInTheDocument();
    expect(screen.queryByText("Compare")).toBeInTheDocument();
  });

  it("hides mobile bar on /quiz page", () => {
    scrollY = 500;
    mockUsePathname.mockReturnValue("/quiz");

    const { container } = render(<QuizPromptBar />);
    window.dispatchEvent(new Event("scroll"));

    // On /quiz, the mobile bar is hidden
    expect(screen.queryByText("Find My Broker")).not.toBeInTheDocument();
  });

  it("hides mobile bar on /compare page", () => {
    scrollY = 500;
    mockUsePathname.mockReturnValue("/compare");

    render(<QuizPromptBar />);
    window.dispatchEvent(new Event("scroll"));

    expect(screen.queryByText("Find My Broker")).not.toBeInTheDocument();
  });

  it("hides mobile bar on broker review pages", () => {
    scrollY = 500;
    mockUsePathname.mockReturnValue("/broker/commsec");

    render(<QuizPromptBar />);
    window.dispatchEvent(new Event("scroll"));

    expect(screen.queryByText("Find My Broker")).not.toBeInTheDocument();
  });

  it("renders desktop bar content after sufficient scroll", () => {
    // scrollPct = scrollY / (scrollHeight - innerHeight)
    // Need scrollPct > 0.25 => scrollY > 0.25 * (4000 - 800) = 800
    scrollY = 900;
    mockUsePathname.mockReturnValue("/article/test");

    render(<QuizPromptBar />);
    window.dispatchEvent(new Event("scroll"));

    // Desktop bar has "Not sure which broker?" text and "Take Quiz" link
    expect(screen.getByText(/Not sure which broker/)).toBeInTheDocument();
  });

  it("hides desktop bar on /quiz page", () => {
    scrollY = 900;
    mockUsePathname.mockReturnValue("/quiz");

    const { container } = render(<QuizPromptBar />);
    window.dispatchEvent(new Event("scroll"));

    // Nothing should render on /quiz
    expect(screen.queryByText(/Not sure which broker/)).not.toBeInTheDocument();
  });

  it("shows shortlist button with count when shortlist has items", () => {
    scrollY = 500;
    mockUsePathname.mockReturnValue("/article/test");
    mockUseShortlist.mockReturnValue({
      slugs: ["commsec", "selfwealth"],
      count: 2,
      toggle: vi.fn(),
      has: vi.fn().mockReturnValue(false),
      add: vi.fn(),
      remove: vi.fn(),
    });

    render(<QuizPromptBar />);
    window.dispatchEvent(new Event("scroll"));

    // Shortlist button appears with count badge
    expect(screen.getByLabelText("My shortlist (2)")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not show shortlist button when shortlist is empty", () => {
    scrollY = 500;
    mockUsePathname.mockReturnValue("/article/test");
    mockUseShortlist.mockReturnValue({
      slugs: [],
      count: 0,
      toggle: vi.fn(),
      has: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
    });

    render(<QuizPromptBar />);
    window.dispatchEvent(new Event("scroll"));

    expect(screen.queryByLabelText(/My shortlist/)).not.toBeInTheDocument();
  });

  it("renders quiz link pointing to /quiz", () => {
    scrollY = 500;
    mockUsePathname.mockReturnValue("/article/test");

    render(<QuizPromptBar />);
    window.dispatchEvent(new Event("scroll"));

    const quizLink = screen.getByText("Find My Broker");
    expect(quizLink.closest("a")).toHaveAttribute("href", "/quiz");
  });

  it("renders compare link pointing to /compare", () => {
    scrollY = 500;
    mockUsePathname.mockReturnValue("/article/test");

    render(<QuizPromptBar />);
    window.dispatchEvent(new Event("scroll"));

    const compareLink = screen.getByText("Compare");
    expect(compareLink.closest("a")).toHaveAttribute("href", "/compare");
  });
});
