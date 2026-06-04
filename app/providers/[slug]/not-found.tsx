import RouteNotFound from "@/components/RouteNotFound";

export default function ProviderNotFound() {
  return (
    <RouteNotFound
      iconName="building"
      title="Provider Not Found"
      description="We couldn't find that provider. They may have been renamed or removed."
      primaryCta={{ href: "/providers", label: "Browse Providers" }}
      secondaryCta={{ href: "/marketplace", label: "Visit Marketplace" }}
    />
  );
}
