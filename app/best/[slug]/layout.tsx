import SmartRecommendationsStrip from "@/components/SmartRecommendationsStrip";

export default function BestSlugLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmartRecommendationsStrip />
      {children}
    </>
  );
}
