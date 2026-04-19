import type { Metadata } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/seo";
import { getForeignInvestmentDict } from "@/lib/i18n/dictionaries";
import { BCP47_TAG } from "@/lib/i18n/locales";
import ForeignInvestmentLocalizedPage from "@/components/ForeignInvestmentLocalizedPage";

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const dict = getForeignInvestmentDict("zh");
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: `${SITE_URL}/zh/foreign-investment`,
      languages: {
        [BCP47_TAG.en]: absoluteUrl("/foreign-investment"),
        [BCP47_TAG.zh]: absoluteUrl("/zh/foreign-investment"),
        [BCP47_TAG.ko]: absoluteUrl("/ko/foreign-investment"),
        "x-default": absoluteUrl("/foreign-investment"),
      },
    },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      locale: BCP47_TAG.zh,
      url: `${SITE_URL}/zh/foreign-investment`,
    },
  };
}

export default function ZhForeignInvestmentPage() {
  return <ForeignInvestmentLocalizedPage locale="zh" />;
}
