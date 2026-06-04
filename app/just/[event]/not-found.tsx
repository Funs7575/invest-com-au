import RouteNotFound from "@/components/RouteNotFound";

export default function JustEventNotFound() {
  return (
    <RouteNotFound
      iconName="party-popper"
      title="Page Not Found"
      description="We couldn't find a guide for that life event. It may have been renamed or removed."
      primaryCta={{ href: "/", label: "Go Home" }}
      secondaryCta={{ href: "/articles", label: "Read Articles" }}
    />
  );
}
