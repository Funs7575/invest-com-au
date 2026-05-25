import type { Metadata } from "next";
import SuburbsClient from "./SuburbsClient";
import ComplianceFooter from "@/components/ComplianceFooter";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Suburb Research — Property Investment Data — invest.com.au",
  description:
    "Research Australian suburbs with median prices, rental yields, vacancy rates, capital growth, and population data. Data-driven property investment decisions.",
  openGraph: {
    title: "Suburb Research — invest.com.au",
    description: "Research suburbs with median prices, rental yields, and capital growth data.",
    url: "/property/suburbs",
  },
  alternates: { canonical: "/property/suburbs" },
};

const SUBURBS_FAQS = faqJsonLd([
  {
    q: "How do I research a suburb for property investment?",
    a: "Effective suburb research combines quantitative data — median house and unit prices, rental yields, vacancy rates, and historical capital growth — with qualitative factors such as infrastructure projects, school catchments, zoning changes, and demographic trends. Use the suburb research tool on Invest.com.au to compare key metrics across suburbs in one place.",
  },
  {
    q: "What data is most important when choosing a suburb to invest in?",
    a: "The most important metrics are rental yield (income return), vacancy rate (supply-demand balance), historical capital growth (long-run appreciation), days on market (liquidity), and population growth trajectory. A suburb with strong rental demand but low vacancy typically signals a healthy investment market. Always cross-reference multiple data points rather than relying on a single metric.",
  },
  {
    q: "What is a good rental yield for Australian property?",
    a: "A gross rental yield of 4–6% is generally considered healthy for Australian residential property, though this varies significantly by city and property type. Regional areas and units tend to produce higher yields, while inner-city houses in Sydney and Melbourne often yield 2–3% gross. Net yield (after costs such as rates, insurance, property management, and maintenance) is typically 1–2 percentage points lower than gross yield.",
  },
  {
    q: "How do I find suburbs with strong capital growth in Australia?",
    a: "Suburbs with strong historical capital growth tend to share characteristics such as proximity to employment hubs, improving infrastructure (new train stations, motorways), gentrification indicators (cafe openings, boutique retail), low housing supply relative to demand, and strong population and household formation growth. Filter by 5- and 10-year median price growth in the suburb research tool to identify consistent outperformers.",
  },
  {
    q: "What is the difference between median price and average price?",
    a: "The median price is the middle value in a set of sales — half of all properties sold for more, half for less. The average (mean) price sums all sale prices and divides by the number of sales. Median is preferred for property analysis because it is not distorted by a small number of very high or very low outlier sales, making it a more reliable benchmark for what a 'typical' property costs in a suburb.",
  },
]);

export default function SuburbResearchPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Property", url: absoluteUrl("/properties") },
    { name: "Suburb Research" },
  ]);
  return (
    <>
      <JsonLd data={breadcrumb} testId="suburbs-jsonld" />
      <JsonLd data={SUBURBS_FAQS} testId="suburbs-faq-jsonld" />
      <SuburbsClient />
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <ComplianceFooter variant="property" />
      </div>
    </>
  );
}
