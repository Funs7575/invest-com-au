import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import ReportDetailClient from "@/app/reports/[slug]/ReportDetailClient";
import type { QuarterlyReport } from "@/lib/types";

const baseReport: QuarterlyReport = {
  id: 1,
  title: "Q1 2026 Broker Industry Report",
  slug: "q1-2026",
  quarter: "Q1",
  year: 2026,
  executive_summary: "Free preview summary for every reader.",
  sections: [
    { heading: "Section A", body: "Detailed paid analysis A." },
    { heading: "Section B", body: "Detailed paid analysis B." },
  ],
  key_findings: ["Finding 1", "Finding 2"],
  fee_changes_summary: [
    { broker: "BrokerX", field: "Brokerage", old_value: "$10", new_value: "$8" },
  ],
  new_entrants: ["NewBrokerCo"],
  status: "published",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("ReportDetailClient — server-side Pro gating", () => {
  it("Pro viewer sees every paid section + table + entrant", () => {
    render(
      <ReportDetailClient
        report={baseReport}
        isPro={true}
        totalSectionsCount={baseReport.sections.length}
      />,
    );

    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Detailed paid analysis A.")).toBeInTheDocument();
    expect(screen.getByText("Section B")).toBeInTheDocument();
    expect(screen.getByText("Fee Changes This Quarter")).toBeInTheDocument();
    expect(screen.getByText("BrokerX")).toBeInTheDocument();
    expect(screen.getByText("NewBrokerCo")).toBeInTheDocument();

    // The upsell CTA must not appear for Pro readers.
    expect(screen.queryByTestId("report-upgrade-cta")).not.toBeInTheDocument();
  });

  it("non-Pro viewer never sees paid section bodies — only the upsell CTA", () => {
    // Server-gated input: paid fields arrive empty for non-Pro.
    const gatedReport: QuarterlyReport = {
      ...baseReport,
      sections: [],
      fee_changes_summary: [],
      new_entrants: [],
    };

    render(
      <ReportDetailClient
        report={gatedReport}
        isPro={false}
        totalSectionsCount={baseReport.sections.length}
      />,
    );

    // Free fields still render
    expect(screen.getByText("Executive Summary")).toBeInTheDocument();
    expect(screen.getByText("Free preview summary for every reader.")).toBeInTheDocument();
    expect(screen.getByText("Finding 1")).toBeInTheDocument();

    // Paid bodies are absent from the DOM (view-source safe)
    expect(screen.queryByText("Detailed paid analysis A.")).not.toBeInTheDocument();
    expect(screen.queryByText("Detailed paid analysis B.")).not.toBeInTheDocument();
    expect(screen.queryByText("Fee Changes This Quarter")).not.toBeInTheDocument();
    expect(screen.queryByText("BrokerX")).not.toBeInTheDocument();
    expect(screen.queryByText("NewBrokerCo")).not.toBeInTheDocument();

    // Upsell CTA appears + links to /pro + names the gated section count
    const cta = screen.getByTestId("report-upgrade-cta");
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveTextContent("Unlock Full Report");
    expect(cta).toHaveTextContent("all 2 sections");
    const link = screen.getByRole("link", { name: /Upgrade to Pro/i });
    expect(link).toHaveAttribute("href", "/pro");
  });

  it("non-Pro viewer with zero total sections does not see the CTA", () => {
    const emptyReport: QuarterlyReport = {
      ...baseReport,
      sections: [],
      fee_changes_summary: [],
      new_entrants: [],
    };

    render(
      <ReportDetailClient
        report={emptyReport}
        isPro={false}
        totalSectionsCount={0}
      />,
    );

    expect(screen.queryByTestId("report-upgrade-cta")).not.toBeInTheDocument();
  });
});
