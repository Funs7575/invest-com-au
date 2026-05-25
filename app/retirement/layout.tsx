import SmartRecommendationsStrip from "@/components/SmartRecommendationsStrip";

export default function RetirementLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmartRecommendationsStrip />
      {children}
    </>
  );
}
