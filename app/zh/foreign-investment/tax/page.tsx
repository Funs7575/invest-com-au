import type { Metadata } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/seo";
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
    },
  };
}

export default function ZHTaxPage() {
  return <ForeignInvestmentSubPage locale="zh" slug="tax" />;
}
