import SmartRecommendationsStrip from "@/components/SmartRecommendationsStrip";

export default function CfdLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmartRecommendationsStrip />
      {children}
    </>
  );
}
