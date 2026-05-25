import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "./setup";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Thin component that exposes the ThemeContext values for assertions. */
function ThemeConsumer() {
  const { theme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
    </div>
  );
}

/** Wrapper that renders Provider + consumer. */
function Fixture() {
  return (
    <ThemeProvider>
      <ThemeConsumer />
    </ThemeProvider>
  );
}

// ─── Setup / teardown ────────────────────────────────────────────────────────

let localStorageMock: Record<string, string> = {};
let matchMediaDark = false;

beforeEach(() => {
  localStorageMock = {};
  matchMediaDark = false;

  vi.spyOn(Storage.prototype, "getItem").mockImplementation(
    (key: string) => localStorageMock[key] ?? null,
  );
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(
    (key: string, value: string) => {
      localStorageMock[key] = value;
    },
  );

  // matchMedia stub — returns a minimal EventTarget-based mock.
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("dark") ? matchMediaDark : false,
      media: query,
      onchange: null,
      addEventListerner: vi.fn(),
      removeEventListener: vi.fn(),
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Reset the <html> element class between tests.
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── ThemeProvider ────────────────────────────────────────────────────────────

describe("ThemeProvider", () => {
  it("defaults to system theme when localStorage is empty", async () => {
    // localStorage is empty (no stored preference) — provider should
    // settle on 'system' after mount.
    await act(async () => {
      render(<Fixture />);
    });
    expect(screen.getByTestId("theme").textContent).toBe("system");
  });

  it("reads a stored 'dark' preference from localStorage on mount", async () => {
    localStorageMock["theme"] = "dark";

    await act(async () => {
      render(<Fixture />);
    });

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("reads a stored 'light' preference from localStorage on mount", async () => {
    localStorageMock["theme"] = "light";

    await act(async () => {
      render(<Fixture />);
    });

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("falls back to system dark when no preference is stored and OS is dark", async () => {
    matchMediaDark = true;

    await act(async () => {
      render(<Fixture />);
    });

    expect(screen.getByTestId("theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("throws when useTheme is used outside ThemeProvider", () => {
    // Suppress React's error boundary console.error noise for this test.
    const consoleError = console.error;
    console.error = vi.fn();

    try {
      expect(() => render(<ThemeConsumer />)).toThrow();
    } finally {
      console.error = consoleError;
    }
  });
});

// ─── ThemeToggle ─────────────────────────────────────────────────────────────

describe("ThemeToggle", () => {
  it("renders a button after hydration", async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>,
      );
    });

    expect(screen.getByRole("button", { name: /Theme/i })).toBeInTheDocument();
  });

  it("cycles light → dark → system on successive clicks", async () => {
    localStorageMock["theme"] = "light";

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
          <ThemeConsumer />
        </ThemeProvider>,
      );
    });

    // Initial state = light
    expect(screen.getByTestId("theme").textContent).toBe("light");

    // Click → dark
    await user.click(screen.getByRole("button", { name: /Theme/i }));
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(localStorageMock["theme"]).toBe("dark");

    // Click → system
    await user.click(screen.getByRole("button", { name: /Theme/i }));
    expect(screen.getByTestId("theme").textContent).toBe("system");
    expect(localStorageMock["theme"]).toBe("system");

    // Click → light again
    await user.click(screen.getByRole("button", { name: /Theme/i }));
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(localStorageMock["theme"]).toBe("light");
  });

  it("applies the dark class to <html> when switching to dark", async () => {
    localStorageMock["theme"] = "light";

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>,
      );
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);

    await user.click(screen.getByRole("button", { name: /Theme/i }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("persists the chosen theme across re-mounts via localStorage", async () => {
    localStorageMock["theme"] = "light";

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    let unmount!: () => void;
    await act(async () => {
      ({ unmount } = render(
        <ThemeProvider>
          <ThemeToggle />
          <ThemeConsumer />
        </ThemeProvider>,
      ));
    });

    await user.click(screen.getByRole("button", { name: /Theme/i })); // → dark
    expect(localStorageMock["theme"]).toBe("dark");

    unmount();

    // Re-mount a fresh tree — should pick up 'dark' from the (still-set) mock.
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );
    });

    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });
});
