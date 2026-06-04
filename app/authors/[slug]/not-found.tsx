import RouteNotFound from "@/components/RouteNotFound";

export default function AuthorNotFound() {
  return (
    <RouteNotFound
      iconName="user"
      title="Author Not Found"
      description="We couldn't find that author profile. They may have been renamed or removed."
      primaryCta={{ href: "/articles", label: "Read Articles" }}
      secondaryCta={{ href: "/", label: "Go Home" }}
    />
  );
}
