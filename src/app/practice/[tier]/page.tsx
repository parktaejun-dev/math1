import { notFound } from 'next/navigation';
import SuneungStudySession from '@/components/study/SuneungStudySession';
import { getSuneungStudyTier } from '@/lib/studyConfig';

export default async function PracticeTierPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  const config = getSuneungStudyTier(tier);

  if (!config) {
    notFound();
  }

  return <SuneungStudySession tier={config} />;
}
