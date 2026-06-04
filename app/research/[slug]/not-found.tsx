import RouteNotFound from "@/components/RouteNotFound";

export default function ResearchNotFound() {
  return (
    <RouteNotFound
      iconName="file-text"
      title="Research Not Found"
      description="We couldn't find that research piece. It may have been renamed or removed."
      primaryCta={{ href: "/research", label: "Browse Research" }}
      secondaryCta={{ href: "/articles", label: "Read Articles" }}
    />
  );
}
