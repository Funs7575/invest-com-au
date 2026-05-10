import SmartRecommendationsStrip from "@/components/SmartRecommendationsStrip";

export default function CryptoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmartRecommendationsStrip />
      {children}
    </>
  );
}
