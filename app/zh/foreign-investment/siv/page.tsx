import type { Metadata } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/seo";
import { getSubPageDict } from "@/lib/i18n/dictionaries";
import { BCP47_TAG } from "@/lib/i18n/locales";
import ForeignInvestmentSubPage from "@/components/ForeignInvestmentSubPage";

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const dict = getSubPageDict("siv", "zh");
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: `${SITE_URL}/zh/foreign-investment/siv`,
      languages: {
        [BCP47_TAG.en]: absoluteUrl("/foreign-investment/siv"),
        [BCP47_TAG.zh]: absoluteUrl("/zh/foreign-investment/siv"),
        [BCP47_TAG.ko]: absoluteUrl("/ko/foreign-investment/siv"),
        "x-default": absoluteUrl("/foreign-investment/siv"),
      },
    },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      locale: BCP47_TAG.zh,
      url: `${SITE_URL}/zh/foreign-investment/siv`,
    },
  };
}

export default function ZHSivPage() {
  return <ForeignInvestmentSubPage locale="zh" slug="siv" />;
}
