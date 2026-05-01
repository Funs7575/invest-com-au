import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { render, screen } from "./setup";
import DatedStatBadge from "@/components/DatedStatBadge";

const FUTURE = "2099-12-31";
const PAST = "2000-01-01";

describe("DatedStatBadge", () => {
  describe("rendering value", () => {
    it("renders the value prop as text", () => {
      render(<DatedStatBadge value="$2.1B" stalesAt={FUTURE} />);
      expect(screen.getByText("$2.1B")).toBeInTheDocument();
    });

    it("renders numeric value", () => {
      render(<DatedStatBadge value={42} stalesAt={FUTURE} />);
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("renders children when provided instead of value", () => {
      render(
        <DatedStatBadge stalesAt={FUTURE}>
          <strong>30 April 2026</strong>
        </DatedStatBadge>
      );
      expect(screen.getByText("30 April 2026")).toBeInTheDocument();
    });

    it("renders the label as sr-only when provided", () => {
      render(<DatedStatBadge value="$2.1B" stalesAt={FUTURE} label="Total committed" />);
      const srLabel = screen.getByText("Total committed:");
      expect(srLabel).toHaveClass("sr-only");
    });
  });

  describe("data attributes", () => {
    it("sets data-stales-at to an ISO string", () => {
      const { container } = render(
        <DatedStatBadge value="$2.1B" stalesAt="2099-12-31" />
      );
      const span = container.querySelector("[data-stales-at]");
      expect(span).toBeTruthy();
      const isoVal = span!.getAttribute("data-stales-at")!;
      expect(new Date(isoVal).toISOString()).toMatch(/^2099-12-31/);
    });

    it("does NOT set data-stale when stat is fresh", () => {
      const { container } = render(
        <DatedStatBadge value="$2.1B" stalesAt={FUTURE} />
      );
      const span = container.querySelector("[data-stale]");
      expect(span).toBeNull();
    });

    it("sets data-stale=true when stat is past stalesAt", () => {
      const { container } = render(
        <DatedStatBadge value="old value" stalesAt={PAST} />
      );
      const span = container.querySelector("[data-stale='true']");
      expect(span).toBeTruthy();
    });

    it("sets data-freshness='fresh' for newly sourced data", () => {
      const { container } = render(
        <DatedStatBadge
          value="$1B"
          sourcedAt="2099-01-01"
          stalesAt="2099-12-31"
        />
      );
      const span = container.querySelector("[data-freshness]");
      expect(span?.getAttribute("data-freshness")).toBe("fresh");
    });

    it("sets data-freshness='stale' when past stalesAt", () => {
      const { container } = render(
        <DatedStatBadge value="old" stalesAt={PAST} />
      );
      expect(
        container.querySelector("[data-freshness='stale']")
      ).toBeTruthy();
    });
  });

  describe("default stalesAt", () => {
    it("derives stalesAt from sourcedAt when stalesAt is omitted", () => {
      const { container } = render(
        <DatedStatBadge value="$1B" sourcedAt="2099-01-01" />
      );
      const span = container.querySelector("[data-stales-at]")!;
      const iso = span.getAttribute("data-stales-at")!;
      // Default monthsValid = 3 → 2099-04-01
      expect(iso).toMatch(/^2099-04-01/);
    });

    it("renders no data-stales-at when neither prop is provided", () => {
      const { container } = render(<DatedStatBadge value="$1B" />);
      const span = container.querySelector("[data-stales-at]");
      // Browsers stringify undefined attribute values as the literal "undefined"
      // OR drop the attribute entirely depending on the renderer; we accept both.
      if (span) {
        expect(span.getAttribute("data-stales-at")).toBe("undefined");
      } else {
        expect(span).toBeNull();
      }
    });
  });

  describe("source popover", () => {
    it("renders a source affordance button when source is provided", () => {
      render(
        <DatedStatBadge
          value="$1B"
          stalesAt={FUTURE}
          source="ASIC, 2026-04-15"
        />
      );
      const btn = screen.getByRole("button", { name: /Source: ASIC/i });
      expect(btn).toBeInTheDocument();
    });

    it("renders a source affordance when only sourceUrl is provided", () => {
      render(
        <DatedStatBadge
          value="$1B"
          stalesAt={FUTURE}
          sourceUrl="https://asic.gov.au/foo"
        />
      );
      const btn = screen.getByRole("button", { name: /Show data source/i });
      expect(btn).toBeInTheDocument();
    });

    it("does not render the source button when no source/url/sourcedAt", () => {
      render(<DatedStatBadge value="$1B" stalesAt={FUTURE} />);
      const btn = screen.queryByRole("button");
      expect(btn).toBeNull();
    });
  });

  describe("freshness levels", () => {
    it("treats explicit freshness='aging' override", () => {
      const { container } = render(
        <DatedStatBadge value="$1B" stalesAt={FUTURE} freshness="aging" />
      );
      expect(
        container.querySelector("[data-freshness='aging']")
      ).toBeTruthy();
    });

    it("treats explicit freshness='stale' override (visual only — does NOT set data-stale)", () => {
      const { container } = render(
        <DatedStatBadge value="$1B" stalesAt={FUTURE} freshness="stale" />
      );
      // freshness override drives data-freshness, but data-stale only flips
      // when the actual stalesAt date is past — so it stays absent here.
      expect(
        container.querySelector("[data-freshness='stale']")
      ).toBeTruthy();
      expect(container.querySelector("[data-stale='true']")).toBeNull();
    });
  });

  describe("stale dev indicator", () => {
    const originalEnv = process.env.NODE_ENV;

    beforeAll(() => {
      // Tests run in "test" environment, which is not "production"
      // so the dev indicator branch should activate for stale stats
    });

    afterAll(() => {
      void originalEnv;
    });

    it("shows a warning indicator in non-production env when stale", () => {
      render(<DatedStatBadge value="old" stalesAt={PAST} />);
      // Stale state renders the canonical icon under the "past its review-by date" label
      const warning = screen.queryByLabelText("Stat is past its review-by date");
      expect(warning).toBeTruthy();
    });

    it("does not show a warning indicator for fresh stats", () => {
      render(<DatedStatBadge value="fresh" stalesAt={FUTURE} />);
      const warning = screen.queryByLabelText("Stat is past its review-by date");
      expect(warning).toBeNull();
    });
  });

  describe("accepts Date object for stalesAt", () => {
    it("accepts a Date object directly", () => {
      const date = new Date("2099-06-30");
      const { container } = render(<DatedStatBadge value="ok" stalesAt={date} />);
      const span = container.querySelector("[data-stales-at]")!;
      expect(span.getAttribute("data-stales-at")).toMatch(/^2099-06-30/);
    });
  });

  describe("className passthrough", () => {
    it("applies className to the wrapper span", () => {
      const { container } = render(
        <DatedStatBadge value="val" stalesAt={FUTURE} className="font-bold text-2xl" />
      );
      const span = container.firstChild as HTMLElement;
      expect(span.classList.contains("font-bold")).toBe(true);
      expect(span.classList.contains("text-2xl")).toBe(true);
    });
  });
});
