import SmartRecommendationsStrip from "@/components/SmartRecommendationsStrip";

export default function SharetradingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmartRecommendationsStrip />
      {children}
    </>
  );
}
