import RouteNotFound from "@/components/RouteNotFound";

export default function GrantsStateNotFound() {
  return (
    <RouteNotFound
      iconName="landmark"
      title="State Not Found"
      description="We couldn't find grants for that state or territory. It may have been renamed or removed."
      primaryCta={{ href: "/grants", label: "Browse Grants" }}
      secondaryCta={{ href: "/property", label: "Property Hub" }}
    />
  );
}
