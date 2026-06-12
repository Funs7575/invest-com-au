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
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
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

// Mock useUser hook (used by BookmarkButton and other auth-aware components).
// Returns unauthenticated state to keep component tests Supabase-free.
// Overridable per test for authed scenarios (vitest isolates module state
// per test file, so overrides never leak across files):
//   import { mockUseUser } from "../setup";
//   mockUseUser.mockReturnValue({ user: { id: "u1" }, loading: false });
// vi.hoisted so the vi.mock factory never sees a TDZ binding (see
// CLAUDE.md § vi.mock hoisting); vitest disallows exporting the hoisted
// binding itself, so the export is a separate reference.
const hoistedUseUser = vi.hoisted(() => ({
  mockUseUser: vi.fn((): { user: { id: string } | null; loading: boolean } => ({
    user: null,
    loading: false,
  })),
}));
export const mockUseUser = hoistedUseUser.mockUseUser;
vi.mock("@/lib/hooks/useUser", () => ({
  useUser: () => hoistedUseUser.mockUseUser(),
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
