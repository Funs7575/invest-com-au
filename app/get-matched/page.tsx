import type { Metadata } from "next";

import GetMatchedClient from "./GetMatchedClient";
import { CURRENT_YEAR, SITE_URL, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Get Matched — Build your Investment Action Plan (${CURRENT_YEAR})`,
  description:
    "Tell us what you're trying to do. We'll build your action plan and guide you to the right next step — compare platforms, browse opportunities, or get quotes from verified Australian professionals.",
  alternates: { canonical: `${SITE_URL}/get-matched` },
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

interface SearchParams {
  goal?: string;
  intent?: string;
  context?: string;
  team?: string;
  plan_id?: string;
  mode?: string;
}

export default async function GetMatchedPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Get Matched" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <GetMatchedClient
        initialGoal={sp.goal ?? null}
        initialIntent={sp.intent ?? null}
        initialContext={sp.context ?? null}
        initialPlanId={sp.plan_id ? Number(sp.plan_id) : null}
        initialMode={sp.mode === "fast" || sp.mode === "guided" ? sp.mode : "both"}
      />
    </>
  );
}
