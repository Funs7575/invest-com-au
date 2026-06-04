import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, userEvent } from "./setup";
import EligibilityQuizSkipBanner from "@/components/EligibilityQuizSkipBanner";
import { INTENT_COUNTRY_COOKIE } from "@/lib/intent-context";

const DISMISS_KEY = "iv-quiz-skip-banner-dismissed";

/** Clear every cookie currently set on the jsdom document. */
function clearAllCookies() {
  for (const c of document.cookie.split("; ")) {
    const name = c.split("=")[0];
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}

function setIntentCookie(value: string) {
  document.cookie = `${INTENT_COUNTRY_COOKIE}=${value}; path=/`;
}

describe("EligibilityQuizSkipBanner", () => {
  beforeEach(() => {
    clearAllCookies();
    sessionStorage.clear();
  });

  it("renders nothing when there is no intent-country cookie", async () => {
    render(<EligibilityQuizSkipBanner />);
    // Give the mount effect a chance to run, then assert absence.
    await waitFor(() => {
      expect(screen.queryByTestId("quiz-skip-banner")).toBeNull();
    });
  });

  it("renders the banner for a known cookie value (uk) with country display, pitch, and CTA href", async () => {
    setIntentCookie("uk");
    render(<EligibilityQuizSkipBanner />);

    const banner = await screen.findByTestId("quiz-skip-banner");
    expect(banner).toBeInTheDocument();

    // Country display text — "UK" derived from the "UK investors" label.
    expect(banner.textContent).toContain("We see you");
    expect(banner.textContent).toContain("UK");

    // UK-specific pitch mentions pensions.
    expect(banner.textContent).toMatch(/pension/i);

    // CTA href matches the configured UK route exactly.
    const cta = screen.getByTestId("quiz-skip-banner-cta");
    expect(cta).toHaveAttribute(
      "href",
      "/advisors/international-tax-specialists?specialty=UK%20Pension%20Transfer&country=uk",
    );
  });

  it("renders nothing for an unknown/garbage cookie value", async () => {
    setIntentCookie("zz-not-a-country");
    render(<EligibilityQuizSkipBanner />);
    await waitFor(() => {
      expect(screen.queryByTestId("quiz-skip-banner")).toBeNull();
    });
  });

  it("hides the banner and sets the sessionStorage dismiss flag when dismissed", async () => {
    setIntentCookie("uk");
    render(<EligibilityQuizSkipBanner />);

    const dismiss = await screen.findByTestId("quiz-skip-banner-dismiss");
    expect(dismiss).toHaveTextContent(/Take the quiz instead/i);

    await userEvent.click(dismiss);

    await waitFor(() => {
      expect(screen.queryByTestId("quiz-skip-banner")).toBeNull();
    });
    expect(sessionStorage.getItem(DISMISS_KEY)).toBe("1");
  });

  it("never renders when the dismiss flag is already set before mount, even with a valid cookie", async () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setIntentCookie("uk");
    render(<EligibilityQuizSkipBanner />);

    // Allow the mount effect to run.
    await waitFor(() => {
      expect(screen.queryByTestId("quiz-skip-banner")).toBeNull();
    });
  });

  it("shows a country-specific pitch — US mentions FATCA", async () => {
    setIntentCookie("us");
    render(<EligibilityQuizSkipBanner />);

    const banner = await screen.findByTestId("quiz-skip-banner");
    expect(banner.textContent).toContain("FATCA");

    const cta = screen.getByTestId("quiz-skip-banner-cta");
    expect(cta).toHaveAttribute(
      "href",
      "/advisors/international-tax-specialists?specialty=FATCA-Aware%20US%20Expat%20Planning&country=us",
    );
  });
});
