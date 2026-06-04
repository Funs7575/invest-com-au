import RouteNotFound from "@/components/RouteNotFound";

export default function ListNotFound() {
  return (
    <RouteNotFound
      iconName="list"
      title="List Not Found"
      description="We couldn't find that list. It may have been renamed or removed."
      primaryCta={{ href: "/lists", label: "Browse Lists" }}
      secondaryCta={{ href: "/", label: "Go Home" }}
    />
  );
}
