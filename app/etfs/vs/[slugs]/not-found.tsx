import RouteNotFound from "@/components/RouteNotFound";

export default function EtfVsNotFound() {
  return (
    <RouteNotFound
      iconName="scale"
      title="ETF Not Found"
      description="We couldn't find that ETF comparison. One or more funds may have been renamed or delisted."
      primaryCta={{ href: "/etfs", label: "Browse ETFs" }}
      secondaryCta={{ href: "/best", label: "Best-Of Rankings" }}
    />
  );
}
