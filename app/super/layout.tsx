import SmartRecommendationsStrip from "@/components/SmartRecommendationsStrip";

export default function SuperLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmartRecommendationsStrip />
      {children}
    </>
  );
}
