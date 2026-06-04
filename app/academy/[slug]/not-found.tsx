import RouteNotFound from "@/components/RouteNotFound";

export default function AcademyNotFound() {
  return (
    <RouteNotFound
      iconName="book-open"
      title="Lesson Not Found"
      description="We couldn't find that academy lesson. It may have been renamed or removed."
      primaryCta={{ href: "/academy", label: "Visit Academy" }}
      secondaryCta={{ href: "/courses", label: "Browse Courses" }}
    />
  );
}
