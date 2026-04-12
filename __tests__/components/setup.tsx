/**
 * Component test setup.
 *
 * NOTE: @testing-library/react and jsdom must be installed as devDependencies.
 * Run: npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
 *
 * These tests use vitest's environmentMatchGlobs to run in jsdom environment.
 */

// Re-export testing utilities for convenience
export { render, screen, within, waitFor, act } from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

// Import matchers (e.g. toBeInTheDocument)
import "@testing-library/jest-dom/vitest";

// Mock next/navigation
import { vi } from "vitest";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockBack = vi.fn();
const mockForward = vi.fn();
const mockRefresh = vi.fn();
const mockPrefetch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    forward: mockForward,
    refresh: mockRefresh,
    prefetch: mockPrefetch,
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, priority: _priority, ...rest } = props;
    return <img {...rest} />;
  },
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock useShortlist hook (used by ShortlistButton and QuizPromptBar)
const mockToggle = vi.fn();
const mockHas = vi.fn().mockReturnValue(false);

vi.mock("@/lib/hooks/useShortlist", () => ({
  useShortlist: () => ({
    slugs: [],
    count: 0,
    toggle: mockToggle,
    has: mockHas,
    add: vi.fn(),
    remove: vi.fn(),
  }),
}));

// Mock tracking functions (fire-and-forget, no side effects needed in tests)
vi.mock("@/lib/tracking", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    trackClick: vi.fn(),
    trackEvent: vi.fn(),
  };
});

// Mock logger to prevent console noise
vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock sponsorship module — pass through the real functions but mock API calls
vi.mock("@/lib/sponsorship", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getPlacementWinners: vi.fn().mockResolvedValue([]),
    filterByFrequencyCap: vi.fn().mockReturnValue([]),
  };
});

// Mock marketplace frequency cap
vi.mock("@/lib/marketplace/frequency-cap", () => ({
  filterByFrequencyCap: vi.fn().mockReturnValue([]),
}));

// Export mocks for test-level manipulation
export {
  mockPush,
  mockReplace,
  mockBack,
  mockForward,
  mockRefresh,
  mockPrefetch,
  mockToggle,
  mockHas,
};
