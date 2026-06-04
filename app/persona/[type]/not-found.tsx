import RouteNotFound from "@/components/RouteNotFound";

export default function PersonaTypeNotFound() {
  return (
    <RouteNotFound
      iconName="user"
      title="Persona Not Found"
      description="We couldn't find a guide for that investor persona. It may have been renamed or removed."
      primaryCta={{ href: "/", label: "Go Home" }}
      secondaryCta={{ href: "/articles", label: "Read Articles" }}
    />
  );
}
