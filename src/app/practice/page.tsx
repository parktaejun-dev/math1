import StudyHub from '@/components/study/StudyHub';
import { suneungStudyTiers } from '@/lib/studyConfig';

const roadmap = [
  {
    title: '단계를 고릅니다',
    description: '기본, 응용, 심화 중 지금 필요한 난도를 선택하면 해당 세트만 계속 이어서 풀 수 있습니다.',
  },
  {
    title: '한 문제씩 차분하게 풉니다',
    description: '시간 제한 없이 풀이하고, 막히면 힌트를 열어 개념을 다시 확인합니다.',
  },
  {
    title: '직접 다음 문제로 넘어갑니다',
    description: '정답을 맞히거나 모르겠다고 넘긴 뒤, 사용자가 준비됐을 때 다음 문제를 푸는 구조입니다.',
  },
];

export default function PracticePage() {
  return (
    <StudyHub
      accent="navy"
      eyebrow="수능 공부 페이지"
      title="기본부터 고난도까지 이어서 푸는 수능 대비"
      description="수능 실전 버튼은 그대로 타임어택이고, 이 페이지는 공부용입니다. 계산 실수와 풀이 흐름을 차분히 점검하면서 기본 문제부터 심화 문제까지 단계별로 반복할 수 있습니다."
      basePath="/practice"
      timedHref="/play"
      timedLabel="실전 타임어택으로 가기"
      tiers={suneungStudyTiers}
      roadmap={roadmap}
    />
  );
}
