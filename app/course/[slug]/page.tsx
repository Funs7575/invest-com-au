import { redirect } from "next/navigation";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function OldLessonPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/courses/investing-101/${slug}`);
}
