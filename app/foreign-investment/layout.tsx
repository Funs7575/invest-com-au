import SmartRecommendationsStrip from "@/components/SmartRecommendationsStrip";

export default function ForeignInvestmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmartRecommendationsStrip />
      {children}
    </>
  );
}
