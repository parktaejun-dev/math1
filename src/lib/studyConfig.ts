import type { QType } from './MathGenerator';
import type { CognitiveType } from './MiddleMathGenerator';

export type StudyTier = 'basic' | 'core' | 'advanced' | 'emergency';
export const studyTierOrder: StudyTier[] = ['basic', 'core', 'advanced', 'emergency'];

export interface BaseStudyTierDefinition {
  slug: StudyTier;
  badge: string;
  title: string;
  description: string;
  recommendedFor: string;
  topics: string[];
  focusPoints: string[];
}

export interface SuneungStudyTierDefinition extends BaseStudyTierDefinition {
  level: 1 | 3 | 5;
  allowedTypes: QType[];
}

export interface MiddleStudyTierDefinition extends BaseStudyTierDefinition {
  allowedTypes: string[];
  levelRange: {
    min: 1 | 2 | 3 | 4 | 5;
    max: 1 | 2 | 3 | 4 | 5;
  };
}

export const SUNEUNG_TYPE_LABELS: Record<QType, string> = {
  exp: '지수 계산',
  log: '로그 계산',
  trig_basic: '삼각함수 기본',
  sigma_basic: '시그마 성질',
  seq: '수열의 합 추론',
  limit_basic: '함수의 극한',
  continuity: '함수의 연속',
  diff: '미분계수',
  extrema: '극대·극소',
  int: '정적분',
};

export const MIDDLE_TYPE_LABELS: Record<CognitiveType, string> = {
  reflex: '기본 연산',
  sense: '수 감각',
  pattern: '패턴 파악',
  compute: '계산력',
  think: '깊은 사고',
  geometry: '도형 감각',
  inference: '규칙 추론',
  structure: '경우의 수',
  judgment: '조건 판단',
  logical: '논리 결합',
  backtrack: '역추적',
};

export const suneungStudyTiers: SuneungStudyTierDefinition[] = [
  {
    slug: 'basic',
    badge: 'BASIC',
    title: '기본 개념 다지기',
    description: '지수, 로그, 삼각함수, 극한처럼 자주 나오는 계산형을 차분하게 반복합니다.',
    recommendedFor: '개념 복습 직후, 문제 풀이 감각을 다시 올리고 싶을 때',
    topics: ['지수 계산', '로그 성질', '삼각함수 기본', '함수의 극한'],
    focusPoints: ['한 문제씩 힌트를 보며 풀이 흐름 익히기', '실수하기 쉬운 계산형 보기 구조 적응', '시간 압박 없이 정답 근거 설명하기'],
    level: 1,
    allowedTypes: ['exp', 'log', 'trig_basic', 'limit_basic'],
  },
  {
    slug: 'core',
    badge: 'CORE',
    title: '실전형 응용 훈련',
    description: '연속, 미분, 시그마, 수열까지 넓혀서 수능 초반부를 안정적으로 처리하는 연습입니다.',
    recommendedFor: '기본 개념은 알지만 문제 전환이 아직 불안정할 때',
    topics: ['지수·로그', '삼각함수', '극한·연속', '미분계수', '시그마', '수열'],
    focusPoints: ['여러 단원을 섞어도 흔들리지 않기', '풀이 순서와 계산 전략 점검', '실전형 보기 판단력 강화'],
    level: 3,
    allowedTypes: ['exp', 'log', 'trig_basic', 'limit_basic', 'continuity', 'diff', 'sigma_basic', 'seq'],
  },
  {
    slug: 'advanced',
    badge: 'ADVANCED',
    title: '고난도 대비 심화',
    description: '미분, 적분, 수열 응용, 극대·극소 중심으로 고난도 계산 흐름을 다룹니다.',
    recommendedFor: '개념과 실전형을 어느 정도 소화했고, 상위권 문제로 넘어가고 싶을 때',
    topics: ['미분계수', '함수의 연속', '시그마', '수열의 합', '정적분', '극대·극소'],
    focusPoints: ['길어지는 계산을 구조화해서 풀기', '오답 보기를 버리는 기준 세우기', '고난도 풀이를 끝까지 유지하는 체력 만들기'],
    level: 5,
    allowedTypes: ['diff', 'continuity', 'sigma_basic', 'seq', 'int', 'extrema'],
  },
];

export const middleStudyTiers: MiddleStudyTierDefinition[] = [
  {
    slug: 'basic',
    badge: 'BASIC',
    title: '기초 계산과 개념 복습',
    description: '부호, 절댓값, 1차방정식, 규칙 찾기처럼 중학 시험의 기본기를 반복합니다.',
    recommendedFor: '교과서 예제나 학교 시험 범위를 처음 다시 정리할 때',
    topics: ['정수와 절댓값', '기본 연산', '1차방정식', '패턴 찾기', '수 감각'],
    focusPoints: ['실수 없이 계산 마무리하기', '기본 개념을 식으로 바꾸는 연습', '막히면 힌트 보고 바로 복기하기'],
    allowedTypes: ['reflex', 'sense', 'pattern', 'compute'],
    levelRange: { min: 1, max: 2 },
  },
  {
    slug: 'core',
    badge: 'CORE',
    title: '학교 시험 대비 응용',
    description: '도형, 추론, 조건 판단, 역산 문제를 섞어서 서술형 전 단계 수준까지 올립니다.',
    recommendedFor: '기본 계산은 되지만 응용 문제에서 자주 막힐 때',
    topics: ['계산력', '패턴 파악', '규칙 추론', '도형', '조건 판단', '역산'],
    focusPoints: ['조건을 읽고 필요한 식 먼저 세우기', '도형과 수열 문제를 번갈아 풀기', '오답 이유를 직접 말로 정리하기'],
    allowedTypes: ['compute', 'pattern', 'inference', 'geometry', 'judgment', 'backtrack'],
    levelRange: { min: 2, max: 4 },
  },
  {
    slug: 'advanced',
    badge: 'ADVANCED',
    title: '심화 사고력 훈련',
    description: '논리 결합, 경우의 수, 도형 심화, 역추적 문제로 상위권 서술형 감각까지 끌어올립니다.',
    recommendedFor: '중학교 시험 상위권 문제와 특목·자사고 대비를 함께 보고 싶을 때',
    topics: ['깊은 사고', '논리 결합', '도형 심화', '경우의 수', '조건 판단', '역추적'],
    focusPoints: ['조건을 쪼개고 다시 합치는 사고 훈련', '복합 문제를 단계별로 나누어 풀기', '정답보다 풀이 구조를 먼저 점검하기'],
    allowedTypes: ['think', 'logical', 'geometry', 'structure', 'judgment', 'backtrack'],
    levelRange: { min: 3, max: 5 },
  },
  {
    slug: 'emergency',
    badge: '긴급처방',
    title: '인수분해와 제곱근',
    description: '가장 많이 막히는 인수분해와 제곱근을 집중적으로 훈련하여 약점을 극복합니다.',
    recommendedFor: '인수분해와 제곱근의 기본 계산이 아직 흔들리는 학생',
    topics: ['인수분해', '제곱근 근사값', '이차방정식 근'],
    focusPoints: ['제곱근의 뜻과 성질 익히기', '완전제곱식과 인수분해 공식 암기', '식을 거꾸로 유추하는 감각 키우기'],
    allowedTypes: ['factorization', 'sqrt_approx', 'quadratic_roots'],
    levelRange: { min: 3, max: 4 },
  },
];

export function getSuneungStudyTier(slug: string): SuneungStudyTierDefinition | undefined {
  return suneungStudyTiers.find((tier) => tier.slug === slug);
}

export function getMiddleStudyTier(slug: string): MiddleStudyTierDefinition | undefined {
  return middleStudyTiers.find((tier) => tier.slug === slug);
}

export function getStudyTierIndex(tier: StudyTier): number {
  return studyTierOrder.indexOf(tier);
}

export function getStudyTierFromIndex(index: number): StudyTier {
  return studyTierOrder[Math.max(0, Math.min(studyTierOrder.length - 1, index))];
}
