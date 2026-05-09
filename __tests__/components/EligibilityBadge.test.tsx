import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import EligibilityBadge from "@/components/EligibilityBadge";

describe("EligibilityBadge", () => {
  describe("returns null when…", () => {
    it("intent country is null", () => {
      const { container } = render(
        <EligibilityBadge
          entity={{ country_eligibility: { allowed_countries: ["GB"] } }}
          intentCountry={null}
        />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("entity has no eligibility metadata + showWhenSilent=false", () => {
      const { container } = render(
        <EligibilityBadge entity={{}} intentCountry="uk" />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("entity is eligible by default + showWhenSilent=false", () => {
      const { container } = render(
        <EligibilityBadge
          entity={{ country_eligibility: {} }}
          intentCountry="uk"
        />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("blocked state (red)", () => {
    it("renders blocked badge when visitor ISO in blocked_countries", () => {
      render(
        <EligibilityBadge
          entity={{ country_eligibility: { blocked_countries: ["US", "GB"] } }}
          intentCountry="uk"
        />,
      );
      const badge = screen.getByTestId("eligibility-badge-blocked");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(/Not available in UK/i);
    });

    it("blocked beats allowed (defense in depth)", () => {
      render(
        <EligibilityBadge
          entity={{
            country_eligibility: {
              allowed_countries: ["GB"],
              blocked_countries: ["GB"],
            },
          }}
          intentCountry="uk"
        />,
      );
      expect(screen.getByTestId("eligibility-badge-blocked")).toBeInTheDocument();
    });

    it("case-insensitive ISO match", () => {
      render(
        <EligibilityBadge
          entity={{ country_eligibility: { blocked_countries: ["gb"] } }}
          intentCountry="uk"
        />,
      );
      expect(screen.getByTestId("eligibility-badge-blocked")).toBeInTheDocument();
    });
  });

  describe("visa-required state (amber)", () => {
    it("renders visa badge when visitor ISO in visa_required", () => {
      render(
        <EligibilityBadge
          entity={{ country_eligibility: { visa_required: ["GB", "CN"] } }}
          intentCountry="cn"
        />,
      );
      const badge = screen.getByTestId("eligibility-badge-visa");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(/Visa required for Chinese/i);
    });

    it("blocked beats visa-required", () => {
      render(
        <EligibilityBadge
          entity={{
            country_eligibility: {
              blocked_countries: ["GB"],
              visa_required: ["GB"],
            },
          }}
          intentCountry="uk"
        />,
      );
      expect(screen.getByTestId("eligibility-badge-blocked")).toBeInTheDocument();
      expect(screen.queryByTestId("eligibility-badge-visa")).not.toBeInTheDocument();
    });
  });

  describe("explicitly allowed state (green)", () => {
    it("renders accepts badge when visitor ISO in allowed_countries", () => {
      render(
        <EligibilityBadge
          entity={{ country_eligibility: { allowed_countries: ["GB", "HK"] } }}
          intentCountry="uk"
        />,
      );
      const badge = screen.getByTestId("eligibility-badge-allowed");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(/Accepts UK clients/i);
    });

    it("does NOT render allowed when visitor ISO not in allow-list", () => {
      const { container } = render(
        <EligibilityBadge
          entity={{ country_eligibility: { allowed_countries: ["HK", "SG"] } }}
          intentCountry="uk"
        />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("showWhenSilent mode", () => {
    it("renders 'Available globally' when no opinion + showWhenSilent=true", () => {
      render(
        <EligibilityBadge
          entity={{ country_eligibility: {} }}
          intentCountry="uk"
          showWhenSilent
        />,
      );
      const badge = screen.getByTestId("eligibility-badge-silent");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(/Available globally/i);
    });

    it("blocked still wins over silent", () => {
      render(
        <EligibilityBadge
          entity={{ country_eligibility: { blocked_countries: ["GB"] } }}
          intentCountry="uk"
          showWhenSilent
        />,
      );
      expect(screen.getByTestId("eligibility-badge-blocked")).toBeInTheDocument();
      expect(screen.queryByTestId("eligibility-badge-silent")).not.toBeInTheDocument();
    });
  });

  describe("compact mode", () => {
    it("renders smaller styling when compact=true", () => {
      render(
        <EligibilityBadge
          entity={{ country_eligibility: { allowed_countries: ["GB"] } }}
          intentCountry="uk"
          compact
        />,
      );
      const badge = screen.getByTestId("eligibility-badge-allowed");
      expect(badge.className).toContain("text-[0.58rem]");
      expect(badge.className).toContain("px-1.5");
    });

    it("renders default styling when compact omitted", () => {
      render(
        <EligibilityBadge
          entity={{ country_eligibility: { allowed_countries: ["GB"] } }}
          intentCountry="uk"
        />,
      );
      const badge = screen.getByTestId("eligibility-badge-allowed");
      expect(badge.className).toContain("text-[0.65rem]");
      expect(badge.className).toContain("px-2");
    });
  });
});
