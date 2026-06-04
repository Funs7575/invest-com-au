import RouteNotFound from "@/components/RouteNotFound";

export default function CostNotFound() {
  return (
    <RouteNotFound
      iconName="dollar-sign"
      title="Page Not Found"
      description="We couldn't find that cost guide. It may have been renamed or removed."
      primaryCta={{ href: "/costs", label: "Browse Cost Guides" }}
      secondaryCta={{ href: "/", label: "Go Home" }}
    />
  );
}
