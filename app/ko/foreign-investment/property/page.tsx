import type { Metadata } from "next";
import { absoluteUrl, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getSubPageDict } from "@/lib/i18n/dictionaries";
import { BCP47_TAG } from "@/lib/i18n/locales";
import ForeignInvestmentSubPage from "@/components/ForeignInvestmentSubPage";

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const dict = getSubPageDict("property", "ko");
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: `${SITE_URL}/ko/foreign-investment/property`,
      languages: {
        [BCP47_TAG.en]: absoluteUrl("/foreign-investment/property"),
        [BCP47_TAG.zh]: absoluteUrl("/zh/foreign-investment/property"),
        [BCP47_TAG.ko]: absoluteUrl("/ko/foreign-investment/property"),
        "x-default": absoluteUrl("/foreign-investment/property"),
      },
    },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      locale: BCP47_TAG.ko,
      url: `${SITE_URL}/ko/foreign-investment/property`,
      images: [{ url: `/api/og?title=${encodeURIComponent("Foreign Property Investment Australia — Korean Guide")}&sub=${encodeURIComponent("FIRB · Residential · Stamp Duty · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
    },
  };
}

export default function KOPropertyPage() {
  return <ForeignInvestmentSubPage locale="ko" slug="property" />;
}
