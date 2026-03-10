import StudyHub from '@/components/study/StudyHub';
import { middleStudyTiers } from '@/lib/studyConfig';

const roadmap = [
  {
    title: '기초부터 심화까지 고릅니다',
    description: '중학교 시험 대비용으로 기본 계산, 응용, 사고력 단계를 나눠 원하는 세트만 집중해서 풀 수 있습니다.',
  },
  {
    title: '힌트와 함께 복기합니다',
    description: '정답만 빠르게 넘기지 않고, 왜 그렇게 푸는지 힌트를 보며 개념을 다시 연결할 수 있습니다.',
  },
  {
    title: '취약 단원을 반복합니다',
    description: '정답률과 풀이량을 보면서 같은 단계를 한 번 더 돌리거나 더 어려운 단계로 옮겨갈 수 있습니다.',
  },
];

export default function MiddlePracticePage() {
  return (
    <StudyHub
      accent="amber"
      eyebrow="중등 공부 페이지"
      title="학교 시험 대비용 중등 수학 공부 허브"
      description="중등 실전 버튼은 그대로 빠른 게임형 풀이이고, 이 페이지는 공부용 서브페이지입니다. 기본 연산부터 응용, 심화 사고력까지 단계별로 묶어서 반복 학습할 수 있습니다."
      basePath="/middle/practice"
      timedHref="/middle/play"
      timedLabel="실전 타임어택으로 가기"
      tiers={middleStudyTiers}
      roadmap={roadmap}
    />
  );
}
