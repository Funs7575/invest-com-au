import { describe, it, expect } from "vitest";
import { render, screen, within } from "./setup";
import HubHero from "@/components/HubHero";
import type { HubHero as HubHeroConfig } from "@/lib/verticals";

const FUTURE = "2099-12-31";
const PAST = "2000-01-01";

const baseHero: HubHeroConfig = {
  headline: "SMSF Investment & Services Hub",
  subhead: "Find ASIC-approved SMSF auditors and specialist advisers.",
  primaryCta: {
    label: "Find an SMSF Specialist",
    href: "/quiz?vertical=smsf",
    lever: "lead_routing",
  },
};

const baseCrumbs = [
  { name: "Home", href: "/" },
  { name: "SMSF" },
];

describe("HubHero", () => {
  describe("core layout", () => {
    it("renders the headline as an H1", () => {
      render(<HubHero hero={baseHero} breadcrumbs={baseCrumbs} />);
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toHaveTextContent("SMSF Investment & Services Hub");
    });

    it("renders the subhead text", () => {
      render(<HubHero hero={baseHero} breadcrumbs={baseCrumbs} />);
      expect(
        screen.getByText("Find ASIC-approved SMSF auditors and specialist advisers."),
      ).toBeInTheDocument();
    });

    it("renders the primary CTA as a link with the configured href", () => {
      render(<HubHero hero={baseHero} breadcrumbs={baseCrumbs} />);
      const cta = screen.getByTestId("hub-hero-primary-cta");
      expect(cta).toHaveAttribute("href", "/quiz?vertical=smsf");
      expect(cta).toHaveTextContent("Find an SMSF Specialist");
    });

    it("tags the primary CTA with its monetisation lever for analytics", () => {
      render(<HubHero hero={baseHero} breadcrumbs={baseCrumbs} />);
      expect(screen.getByTestId("hub-hero-primary-cta")).toHaveAttribute(
        "data-lever",
        "lead_routing",
      );
    });
  });

  describe("breadcrumb nav", () => {
    it("renders all crumbs", () => {
      render(<HubHero hero={baseHero} breadcrumbs={baseCrumbs} />);
      const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
      expect(within(nav).getByText("Home")).toBeInTheDocument();
      expect(within(nav).getByText("SMSF")).toBeInTheDocument();
    });

    it("renders the last crumb as plain text (current page, no link)", () => {
      render(<HubHero hero={baseHero} breadcrumbs={baseCrumbs} />);
      // SMSF is the last crumb — should NOT be inside an anchor
      const smsfText = screen.getByText("SMSF");
      expect(smsfText.closest("a")).toBeNull();
    });

    it("renders earlier crumbs as anchors when href is provided", () => {
      render(<HubHero hero={baseHero} breadcrumbs={baseCrumbs} />);
      const homeLink = screen.getByRole("link", { name: "Home" });
      expect(homeLink).toHaveAttribute("href", "/");
    });

    it("omits the breadcrumb nav entirely when crumbs is empty", () => {
      render(<HubHero hero={baseHero} breadcrumbs={[]} />);
      expect(
        screen.queryByRole("navigation", { name: /breadcrumb/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("stats bar", () => {
    it("does not render the stats grid when stats is undefined", () => {
      render(<HubHero hero={baseHero} breadcrumbs={baseCrumbs} />);
      expect(screen.queryByTestId("hub-hero-stats")).not.toBeInTheDocument();
    });

    it("does not render the stats grid when stats is empty", () => {
      render(
        <HubHero
          hero={{ ...baseHero, stats: [] }}
          breadcrumbs={baseCrumbs}
        />,
      );
      expect(screen.queryByTestId("hub-hero-stats")).not.toBeInTheDocument();
    });

    it("renders each stat label and value", () => {
      render(
        <HubHero
          hero={{
            ...baseHero,
            stats: [
              { label: "SMSFs in Australia", value: "600,000", dataAsOf: "2026-01-01", stalesAt: FUTURE },
              { label: "Assets under management", value: "$900B", dataAsOf: "2026-01-01", stalesAt: FUTURE },
              { label: "Australians 55+ run an SMSF", value: "1 in 3", dataAsOf: "2026-01-01", stalesAt: FUTURE },
            ],
          }}
          breadcrumbs={baseCrumbs}
        />,
      );
      expect(screen.getByText("600,000")).toBeInTheDocument();
      expect(screen.getByText("$900B")).toBeInTheDocument();
      expect(screen.getByText("1 in 3")).toBeInTheDocument();
      expect(screen.getByText("SMSFs in Australia")).toBeInTheDocument();
    });

    it("wraps each stat value in a DatedStatBadge with the configured stalesAt", () => {
      const { container } = render(
        <HubHero
          hero={{
            ...baseHero,
            stats: [
              { label: "Test stat", value: "$2.1B", dataAsOf: "2026-01-01", stalesAt: "2099-06-30" },
            ],
          }}
          breadcrumbs={baseCrumbs}
        />,
      );
      const badge = container.querySelector("[data-stales-at]");
      expect(badge).not.toBeNull();
      expect(badge!.getAttribute("data-stales-at")).toMatch(/^2099-06-30/);
    });

    it("flags stale stats so the build-time CI gate (V-NEW-01) can detect them", () => {
      const { container } = render(
        <HubHero
          hero={{
            ...baseHero,
            stats: [
              { label: "Stale stat", value: "old", dataAsOf: "2000-01-01", stalesAt: PAST },
            ],
          }}
          breadcrumbs={baseCrumbs}
        />,
      );
      expect(container.querySelector("[data-stale='true']")).not.toBeNull();
    });

    it("uses the 4-col grid when 4 stats are provided", () => {
      render(
        <HubHero
          hero={{
            ...baseHero,
            stats: [
              { label: "A", value: "1", dataAsOf: "2026-01-01", stalesAt: FUTURE },
              { label: "B", value: "2", dataAsOf: "2026-01-01", stalesAt: FUTURE },
              { label: "C", value: "3", dataAsOf: "2026-01-01", stalesAt: FUTURE },
              { label: "D", value: "4", dataAsOf: "2026-01-01", stalesAt: FUTURE },
            ],
          }}
          breadcrumbs={baseCrumbs}
        />,
      );
      const stats = screen.getByTestId("hub-hero-stats");
      expect(stats.className).toContain("md:grid-cols-4");
    });

    it("uses the 3-col grid for ≤3 stats (matches existing /smsf hero)", () => {
      render(
        <HubHero
          hero={{
            ...baseHero,
            stats: [
              { label: "A", value: "1", dataAsOf: "2026-01-01", stalesAt: FUTURE },
              { label: "B", value: "2", dataAsOf: "2026-01-01", stalesAt: FUTURE },
              { label: "C", value: "3", dataAsOf: "2026-01-01", stalesAt: FUTURE },
            ],
          }}
          breadcrumbs={baseCrumbs}
        />,
      );
      const stats = screen.getByTestId("hub-hero-stats");
      expect(stats.className).toContain("grid-cols-3");
      expect(stats.className).not.toContain("md:grid-cols-4");
    });

    it("caps overflow stats at 4 (BLUEPRINT §2 contract)", () => {
      render(
        <HubHero
          hero={{
            ...baseHero,
            stats: [
              { label: "A", value: "v1", dataAsOf: "2026-01-01", stalesAt: FUTURE },
              { label: "B", value: "v2", dataAsOf: "2026-01-01", stalesAt: FUTURE },
              { label: "C", value: "v3", dataAsOf: "2026-01-01", stalesAt: FUTURE },
              { label: "D", value: "v4", dataAsOf: "2026-01-01", stalesAt: FUTURE },
              { label: "E", value: "v5-overflow", dataAsOf: "2026-01-01", stalesAt: FUTURE },
            ],
          }}
          breadcrumbs={baseCrumbs}
        />,
      );
      // First 4 render
      expect(screen.getByText("v1")).toBeInTheDocument();
      expect(screen.getByText("v4")).toBeInTheDocument();
      // 5th is dropped
      expect(screen.queryByText("v5-overflow")).not.toBeInTheDocument();
    });

    it("renders an attribution link when stat.source is provided", () => {
      render(
        <HubHero
          hero={{
            ...baseHero,
            stats: [
              {
                label: "Total committed",
                value: "$2.1B",
                dataAsOf: "2026-01-01",
                stalesAt: FUTURE,
                source: "https://www.ato.gov.au/example",
              },
            ],
          }}
          breadcrumbs={baseCrumbs}
        />,
      );
      const sourceLink = screen.getByRole("link", { name: /attribution/i });
      expect(sourceLink).toHaveAttribute("href", "https://www.ato.gov.au/example");
      expect(sourceLink).toHaveAttribute("rel", "nofollow noopener");
      expect(sourceLink).toHaveAttribute("target", "_blank");
    });
  });

  describe("secondary CTA", () => {
    it("renders the secondary CTA when provided", () => {
      render(
        <HubHero
          hero={{
            ...baseHero,
            secondaryCta: {
              label: "Download R&D checklist",
              href: "/grants/rd-tax-incentive",
              lever: "lead_magnet",
            },
          }}
          breadcrumbs={baseCrumbs}
        />,
      );
      const cta = screen.getByTestId("hub-hero-secondary-cta");
      expect(cta).toHaveAttribute("href", "/grants/rd-tax-incentive");
      expect(cta).toHaveTextContent("Download R&D checklist");
      expect(cta).toHaveAttribute("data-lever", "lead_magnet");
    });

    it("omits the secondary CTA when not configured", () => {
      render(<HubHero hero={baseHero} breadcrumbs={baseCrumbs} />);
      expect(screen.queryByTestId("hub-hero-secondary-cta")).not.toBeInTheDocument();
    });
  });

  describe("theming", () => {
    it("applies the default slate-900 panel when no className override is supplied", () => {
      render(<HubHero hero={baseHero} breadcrumbs={baseCrumbs} />);
      const section = screen.getByTestId("hub-hero");
      expect(section.className).toContain("bg-slate-900");
      expect(section.className).toContain("text-white");
    });

    it("allows overriding the section className for hub-specific theming", () => {
      render(
        <HubHero
          hero={baseHero}
          breadcrumbs={baseCrumbs}
          className="bg-emerald-900 text-white py-12"
        />,
      );
      const section = screen.getByTestId("hub-hero");
      expect(section.className).toContain("bg-emerald-900");
      expect(section.className).not.toContain("bg-slate-900");
    });
  });

  describe("/grants hero parity", () => {
    // Sanity check — verifies the component can render the existing /grants
    // hero shape so W-14's migration is a config swap, not a re-style.
    it("renders the /grants four-stat hero shape end-to-end", () => {
      render(
        <HubHero
          hero={{
            headline: "Australian Business Grants & Non-Dilutive Funding 2026",
            subhead:
              "Access $400M+ in available government grants. R&D Tax Incentive, EMDG, Industry Growth Program and state programs — without giving up equity.",
            stats: [
              { label: "Cash back · R&D Tax Incentive", value: "43.5%", dataAsOf: "2026-01-01", stalesAt: FUTURE },
              { label: "EMDG · per year", value: "$80K", dataAsOf: "2026-01-01", stalesAt: FUTURE },
              { label: "Industry Growth Program", value: "$5M", dataAsOf: "2026-01-01", stalesAt: FUTURE },
              { label: "FY2025 R&D deadline", value: "30 Apr", dataAsOf: "2026-01-01", stalesAt: FUTURE },
            ],
            primaryCta: {
              label: "Check My Eligibility",
              href: "/grants/eligibility-quiz",
              lever: "lead_routing",
            },
            secondaryCta: {
              label: "R&D Tax Incentive",
              href: "/grants/rd-tax-incentive",
              lever: "lead_magnet",
            },
          }}
          breadcrumbs={[
            { name: "Home", href: "/" },
            { name: "Grants" },
          ]}
        />,
      );
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Australian Business Grants",
      );
      expect(screen.getByText("43.5%")).toBeInTheDocument();
      expect(screen.getByText("$80K")).toBeInTheDocument();
      expect(screen.getByText("$5M")).toBeInTheDocument();
      expect(screen.getByText("30 Apr")).toBeInTheDocument();
      expect(screen.getByTestId("hub-hero-primary-cta")).toHaveAttribute(
        "href",
        "/grants/eligibility-quiz",
      );
      expect(screen.getByTestId("hub-hero-secondary-cta")).toHaveAttribute(
        "href",
        "/grants/rd-tax-incentive",
      );
    });
  });
});
