import RouteNotFound from "@/components/RouteNotFound";

export default function ProResearchNotFound() {
  return (
    <RouteNotFound
      iconName="file-text"
      title="Research Not Found"
      description="We couldn't find that Pro research piece. It may have been renamed or removed."
      primaryCta={{ href: "/pro/research", label: "Browse Pro Research" }}
      secondaryCta={{ href: "/research", label: "All Research" }}
    />
  );
}
