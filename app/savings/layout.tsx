import SmartRecommendationsStrip from "@/components/SmartRecommendationsStrip";

export default function SavingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmartRecommendationsStrip />
      {children}
    </>
  );
}
