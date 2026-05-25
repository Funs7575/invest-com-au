import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import ScenarioPlannerClient from "./ScenarioPlannerClient";

export const metadata: Metadata = {
  title: "Scenario Planner — Model Your Retirement, Super & Investment Tax",
  description:
    "Chain your retirement projection, super contributions, and investment income tax into one model. Save and compare up to 3 scenarios side-by-side.",
  alternates: { canonical: "/scenarios/plan" },
  openGraph: {
    title: "Scenario Planner — invest.com.au",
    description:
      "See how your super, salary sacrifice, and investment income interact in a single factual projection. Save multiple scenarios and compare them.",
    images: [
      {
        url: "/api/og?title=Scenario+Planner&subtitle=Model+your+retirement%2C+super+%26+investment+tax&type=tool",
        width: 1200,
        height: 630,
      },
    ],
  },
  robots: "index, follow",
};

export default async function ScenarioPlannerPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const bcLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Scenarios", url: absoluteUrl("/scenarios") },
    { name: "Scenario Planner" },
  ]);

  // Resolve the `?scenario=` param so the client component can deep-link
  // into a saved scenario after hydration. We accept both numeric index and
  // human-readable label (matching is done client-side in resolveScenarioParam).
  const resolved = searchParams ? await searchParams : {};
  const scenarioParam = typeof resolved["scenario"] === "string"
    ? resolved["scenario"]
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bcLd) }}
      />
      <ScenarioPlannerClient initialScenarioParam={scenarioParam} />
    </>
  );
}
