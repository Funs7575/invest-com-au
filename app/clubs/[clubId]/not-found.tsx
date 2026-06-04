import RouteNotFound from "@/components/RouteNotFound";

export default function ClubNotFound() {
  return (
    <RouteNotFound
      iconName="users"
      title="Club Not Found"
      description="We couldn't find that club. It may have been renamed or removed."
      primaryCta={{ href: "/clubs", label: "Browse Clubs" }}
      secondaryCta={{ href: "/", label: "Go Home" }}
    />
  );
}
