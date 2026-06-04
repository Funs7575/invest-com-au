import RouteNotFound from "@/components/RouteNotFound";

export default function MarketplaceIntentNotFound() {
  return (
    <RouteNotFound
      iconName="store"
      title="Category Not Found"
      description="We couldn't find that marketplace category. It may have been renamed or removed."
      primaryCta={{ href: "/marketplace", label: "Visit Marketplace" }}
      secondaryCta={{ href: "/providers", label: "Browse Providers" }}
    />
  );
}
