import RouteNotFound from "@/components/RouteNotFound";

export default function LeadMagnetNotFound() {
  return (
    <RouteNotFound
      iconName="download"
      title="Resource Not Found"
      description="We couldn't find that resource. It may have been renamed or removed."
      primaryCta={{ href: "/", label: "Go Home" }}
      secondaryCta={{ href: "/articles", label: "Read Articles" }}
    />
  );
}
