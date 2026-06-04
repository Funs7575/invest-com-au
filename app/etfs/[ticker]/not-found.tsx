import RouteNotFound from "@/components/RouteNotFound";

export default function EtfTickerNotFound() {
  return (
    <RouteNotFound
      iconName="trending-up"
      title="ETF Not Found"
      description="We couldn't find that ETF. The ticker may have changed or the fund may have been delisted."
      primaryCta={{ href: "/etfs", label: "Browse ETFs" }}
      secondaryCta={{ href: "/best", label: "Best-Of Rankings" }}
    />
  );
}
