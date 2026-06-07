import type { Metadata } from "next";
import { absoluteUrl, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getSubPageDict } from "@/lib/i18n/dictionaries";
import { BCP47_TAG } from "@/lib/i18n/locales";
import ForeignInvestmentSubPage from "@/components/ForeignInvestmentSubPage";

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const dict = getSubPageDict("tax", "zh");
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: `${SITE_URL}/zh/foreign-investment/tax`,
      languages: {
        [BCP47_TAG.en]: absoluteUrl("/foreign-investment/tax"),
        [BCP47_TAG.zh]: absoluteUrl("/zh/foreign-investment/tax"),
        [BCP47_TAG.ko]: absoluteUrl("/ko/foreign-investment/tax"),
        "x-default": absoluteUrl("/foreign-investment/tax"),
      },
    },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      locale: BCP47_TAG.zh,
      url: `${SITE_URL}/zh/foreign-investment/tax`,
      images: [{ url: `/api/og?title=${encodeURIComponent("Foreign Investor Tax in Australia — Chinese Guide")}&sub=${encodeURIComponent("CGT · Withholding Tax · FIRB · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
    },
  };
}

export default function ZHTaxPage() {
  return <ForeignInvestmentSubPage locale="zh" slug="tax" />;
}
