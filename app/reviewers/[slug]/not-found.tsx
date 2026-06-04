import RouteNotFound from "@/components/RouteNotFound";

export default function ReviewerNotFound() {
  return (
    <RouteNotFound
      iconName="user-check"
      title="Reviewer Not Found"
      description="We couldn't find that reviewer profile. They may have been renamed or removed."
      primaryCta={{ href: "/articles", label: "Read Articles" }}
      secondaryCta={{ href: "/", label: "Go Home" }}
    />
  );
}
