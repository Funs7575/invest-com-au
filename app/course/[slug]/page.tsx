import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function OldLessonPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/courses/investing-101/${slug}`);
}
