import SmartRecommendationsStrip from "@/components/SmartRecommendationsStrip";

export default function AgedCareLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmartRecommendationsStrip />
      {children}
    </>
  );
}
