import RouteNotFound from "@/components/RouteNotFound";

export default function TopicNotFound() {
  return (
    <RouteNotFound
      iconName="hash"
      title="Topic Not Found"
      description="We couldn't find that topic. It may have been renamed or removed."
      primaryCta={{ href: "/articles", label: "Read Articles" }}
      secondaryCta={{ href: "/", label: "Go Home" }}
    />
  );
}
