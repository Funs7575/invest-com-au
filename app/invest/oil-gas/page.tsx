import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getSector,
  listSectorStocks,
  listSectorEtfs,
  listSectorNewsBriefs,
} from "@/lib/commodities";
import CommodityHub from "@/components/commodities/CommodityHub";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";

export const revalidate = 1800; // 30 min — news briefs refresh fairly often

export const metadata: Metadata = {
  title: `Invest in Australian Oil & Gas (${CURRENT_YEAR})`,
  description:
    "Independent Australian guide to oil & gas investing. ASX-listed majors (WDS, STO, BPT), crude oil and global energy ETFs (OOO, FUEL), tax considerations, and ESG risk.",
  alternates: { canonical: `${SITE_URL}/invest/oil-gas` },
  openGraph: {
    title: `Invest in Australian Oil & Gas (${CURRENT_YEAR})`,
    description:
      "ASX-listed majors, ETFs, tax considerations, and ESG risk — independent research for Australian investors.",
    url: `${SITE_URL}/invest/oil-gas`,
  },
};

/**
 * /invest/oil-gas — commodity sector hub driven by commodity_sectors.
 *
 * This page is deliberately a thin shell: the entire render is
 * delegated to CommodityHub so adding a sister vertical (lithium,
 * uranium, rare earths) is a 10-line file plus a seed row.
 *
 * On a DB outage we return 404 rather than an empty shell to
 * avoid accidentally publishing a low-quality page to Google.
 */
export default async function OilGasPage() {
  const sector = await getSector("oil-gas");
  if (!sector) notFound();

  const [stocks, etfs, newsBriefs] = await Promise.all([
    listSectorStocks("oil-gas"),
    listSectorEtfs("oil-gas"),
    listSectorNewsBriefs("oil-gas"),
  ]);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: sector.display_name },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <CommodityHub
        sector={sector}
        stocks={stocks}
        etfs={etfs}
        newsBriefs={newsBriefs}
      />
    </>
  );
}
