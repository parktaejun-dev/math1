import { notFound } from 'next/navigation';
import MiddleStudySession from '@/components/study/MiddleStudySession';
import { getMiddleStudyTier } from '@/lib/studyConfig';

export default async function MiddlePracticeTierPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  const config = getMiddleStudyTier(tier);

  if (!config) {
    notFound();
  }

  return <MiddleStudySession tier={config} />;
}
