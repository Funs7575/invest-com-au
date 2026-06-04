import RouteNotFound from "@/components/RouteNotFound";

export default function TagNotFound() {
  return (
    <RouteNotFound
      iconName="tag"
      title="Tag Not Found"
      description="We couldn't find that tag. It may have been renamed or removed."
      primaryCta={{ href: "/articles", label: "Read Articles" }}
      secondaryCta={{ href: "/", label: "Go Home" }}
    />
  );
}
