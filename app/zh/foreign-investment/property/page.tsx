import type { Metadata } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/seo";
import { getSubPageDict } from "@/lib/i18n/dictionaries";
import { BCP47_TAG } from "@/lib/i18n/locales";
import ForeignInvestmentSubPage from "@/components/ForeignInvestmentSubPage";

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const dict = getSubPageDict("property", "zh");
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: `${SITE_URL}/zh/foreign-investment/property`,
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
      locale: BCP47_TAG.zh,
      url: `${SITE_URL}/zh/foreign-investment/property`,
    },
  };
}

export default function ZHPropertyPage() {
  return <ForeignInvestmentSubPage locale="zh" slug="property" />;
}
