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
  });

  describe("stale dev indicator", () => {
    const originalEnv = process.env.NODE_ENV;

    beforeAll(() => {
      // Tests run in "test" environment, which is not "production"
      // so the dev indicator branch should activate for stale stats
    });

    afterAll(() => {
      // NODE_ENV is read-only in most environments; just document the env
      void originalEnv;
    });

    it("shows a warning indicator in non-production env when stale", () => {
      render(<DatedStatBadge value="old" stalesAt={PAST} />);
      // The ⚠ span renders with aria-label in non-prod
      const warning = screen.queryByLabelText("Stat may be outdated — update stalesAt date");
      // In test env (non-production), should be present
      expect(warning).toBeTruthy();
    });

    it("does not show a warning indicator for fresh stats", () => {
      render(<DatedStatBadge value="fresh" stalesAt={FUTURE} />);
      const warning = screen.queryByLabelText("Stat may be outdated — update stalesAt date");
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
