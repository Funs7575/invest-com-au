import RouteNotFound from "@/components/RouteNotFound";

export default function AccountLifeEventNotFound() {
  return (
    <RouteNotFound
      iconName="calendar"
      title="Life Event Not Found"
      description="We couldn't find that life event, or it doesn't belong to your account."
      primaryCta={{ href: "/account", label: "Account Home" }}
      secondaryCta={{ href: "/account/plans", label: "Your Plans" }}
    />
  );
}
