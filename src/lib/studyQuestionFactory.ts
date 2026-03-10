import { generateQuestion, type QType, type Question } from '@/lib/MathGenerator';
import { generateMiddleQuestion, type CognitiveType, type MiddleQuestion } from '@/lib/MiddleMathGenerator';
import {
  getMiddleStudyTier,
  getSuneungStudyTier,
  MIDDLE_TYPE_LABELS,
  SUNEUNG_TYPE_LABELS,
  type MiddleStudyTierDefinition,
  type StudyTier,
  type SuneungStudyTierDefinition,
} from '@/lib/studyConfig';

export type StudyTrack = 'suneung' | 'middle';

export type StudyQuestionShape = Question | MiddleQuestion;

export interface StudyQuestionMeta {
  source: 'local' | 'ai';
  sourceLabel: string;
  focusLabel: string;
}

export interface StudyQuestionResponse<TQuestion extends StudyQuestionShape = StudyQuestionShape> {
  question: TQuestion;
  meta: StudyQuestionMeta;
}

interface SuneungDraft {
  latex: string;
  answer: number;
  type: QType;
  hint: string;
  distractors?: number[];
  focusLabel?: string;
}

interface MiddleDraft {
  latex: string;
  answer: number;
  type: string;
  cognitiveType: CognitiveType;
  level: 1 | 2 | 3 | 4 | 5;
  hint: string;
  distractors?: number[];
  focusLabel?: string;
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seed: string, index: number, salt: string): () => number {
  return mulberry32(hashSeed(`${seed}-${index}-${salt}`));
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, values: T[]): T {
  return values[Math.floor(rng() * values.length)];
}

function buildChoices(answer: number, distractors: number[], rng: () => number, count: number = 5): number[] {
  const pool = new Set<number>();

  distractors.forEach((value) => {
    if (Number.isInteger(value) && Number.isFinite(value) && value !== answer) {
      pool.add(value);
    }
  });

  let offset = 1;
  while (pool.size < count - 1) {
    const step = Math.max(1, Math.floor(Math.abs(answer) * 0.12));
    const left = answer - offset * step;
    const right = answer + offset * step;

    if (!pool.has(left) && left !== answer) pool.add(left);
    if (pool.size < count - 1 && !pool.has(right) && right !== answer) pool.add(right);
    offset += 1;
  }

  const all = [answer, ...Array.from(pool).slice(0, count - 1)];
  all.sort((a, b) => a - b);
  return all;
}

function clampLevel(level: number, min: number, max: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(min, Math.min(max, level)) as 1 | 2 | 3 | 4 | 5;
}

function shouldUseAi(seed: string, index: number, tier: StudyTier): boolean {
  const rng = createRng(seed, index, 'ai-switch');
  if (tier === 'advanced') return rng() < 0.75;
  if (tier === 'core') return rng() < 0.35;
  return false;
}

function shouldUseLocalChallenge(seed: string, index: number, tier: StudyTier): boolean {
  const rng = createRng(seed, index, 'local-challenge');
  if (tier === 'advanced') return true;
  if (tier === 'core') return rng() < 0.6;
  return false;
}

function genSuneungChallengeLimit(rng: () => number): SuneungDraft {
  const root = pick(rng, [2, 3, 4]);
  const a = pick(rng, [1, 2, 3]);
  const b = root * root - a;
  const answer = 4 * a * root;

  return {
    latex: `\\lim_{x \\to ${a}} \\frac{x^2-${a * a}}{\\sqrt{x+${b}}-\\sqrt{${a + b}}} = ?`,
    answer,
    type: 'limit_basic',
    hint: `분모를 유리화하면 $(x-${a})$가 생기고, 분자의 $(x^2-${a * a})=(x-${a})(x+${a})$와 약분됩니다.`,
    distractors: [2 * a * root, 2 * answer, 2 * a + 2 * root, answer - 2 * root],
    focusLabel: '유리화와 극한',
  };
}

function genSuneungChallengeDiff(rng: () => number): SuneungDraft {
  const a = randomInt(rng, 1, 3);
  const b = randomInt(rng, 2, 5);
  const c = randomInt(rng, 1, 4);
  const answer = 6 * a + 2 * b;

  return {
    latex: `\\begin{gather*} f(x)=x^3+${b}x^2+${c}x \\\\ \\lim_{h\\to0}\\frac{f(${a}+h)-2f(${a})+f(${a}-h)}{h^2}=? \\end{gather*}`,
    answer,
    type: 'diff',
    hint: `이 식은 $f''(${a})$에 해당합니다. 먼저 $f'(x)$, $f''(x)$를 차례로 구해보세요.`,
    distractors: [3 * a + 2 * b, 6 * a + b, answer + 6, Math.max(1, answer - 6)],
    focusLabel: '미분의 대칭 차분',
  };
}

function genSuneungChallengeIntegral(rng: () => number): SuneungDraft {
  const a = randomInt(rng, 1, 3);
  const k = randomInt(rng, 1, 3);
  const c = randomInt(rng, 1, 4);
  const answer = 2 * k * a * a * a + 2 * a * c;

  return {
    latex: `\\int_{-${a}}^{${a}} \\left(2x^3+${3 * k}x^2+${c}\\right)\\,dx = ?`,
    answer,
    type: 'int',
    hint: `구간이 $[-${a}, ${a}]$처럼 대칭이면 홀함수 적분은 0이 됩니다. 남는 짝함수 부분만 계산해보세요.`,
    distractors: [2 * k * a * a * a, 2 * a * c, answer + 2 * a, Math.max(1, answer - 2 * a)],
    focusLabel: '대칭구간 정적분',
  };
}

function genSuneungChallengeSigma(rng: () => number): SuneungDraft {
  const n = randomInt(rng, 4, 7);
  const answer = (n * (n + 1) * (n - 1)) / 3;

  return {
    latex: `\\sum_{k=1}^{${n}} (k^2-k)=?`,
    answer,
    type: 'sigma_basic',
    hint: `$\\sum k^2$와 $\\sum k$를 각각 구한 뒤 빼면 됩니다. 두 공식을 같이 쓰는 문제입니다.`,
    distractors: [answer + n, answer - n, (n * (n + 1)) / 2, n * n],
    focusLabel: '시그마 공식 결합',
  };
}

function genSuneungChallengeContinuity(rng: () => number): SuneungDraft {
  const a = randomInt(rng, 1, 3);
  const targetK = pick(rng, [-3, -2, -1, 1, 2, 3, 4]);
  const c = 2 * a - a * a - targetK * a;

  return {
    latex: `\\text{함수 } f(x)=\\begin{cases}\\dfrac{x^2-${a * a}}{x-${a}} & (x<${a}) \\\\ x^2+kx${c >= 0 ? '+' : ''}${c} & (x\\ge${a})\\end{cases} \\\\ \\text{가 } x=${a}\\text{ 에서 연속일 때 } k=?`,
    answer: targetK,
    type: 'continuity',
    hint: `왼쪽은 약분 후 ${a}를 대입한 극한값, 오른쪽은 다항식에 ${a}를 바로 넣은 값입니다.`,
    distractors: [targetK + 1, targetK - 1, -targetK, targetK + a],
    focusLabel: '분할함수 연속성',
  };
}

function genSuneungChallengeExtrema(rng: () => number): SuneungDraft {
  const presets = [
    { p: 1, q: 3, c: 4 },
    { p: 1, q: 5, c: 7 },
    { p: 2, q: 4, c: 5 },
    { p: 2, q: 6, c: 8 },
  ];
  const preset = pick(rng, presets);
  const coef2 = (3 * (preset.p + preset.q)) / 2;
  const coef1 = 3 * preset.p * preset.q;
  const answer = preset.q ** 3 - coef2 * preset.q ** 2 + coef1 * preset.q + preset.c;

  return {
    latex: `\\text{함수 } f(x)=x^3-${coef2}x^2+${coef1}x+${preset.c} \\text{ 의 극솟값은?}`,
    answer,
    type: 'extrema',
    hint: `먼저 $f'(x)=0$이 되는 지점을 찾고, 그중 극소가 되는 지점에 함숫값을 대입해야 합니다.`,
    distractors: [preset.q, answer + preset.q, answer - preset.p, preset.c],
    focusLabel: '극소값 계산',
  };
}

const suneungChallengeGenerators: Array<{ type: QType; generate: (rng: () => number) => SuneungDraft }> = [
  { type: 'limit_basic', generate: genSuneungChallengeLimit },
  { type: 'diff', generate: genSuneungChallengeDiff },
  { type: 'int', generate: genSuneungChallengeIntegral },
  { type: 'sigma_basic', generate: genSuneungChallengeSigma },
  { type: 'continuity', generate: genSuneungChallengeContinuity },
  { type: 'extrema', generate: genSuneungChallengeExtrema },
];

function genMiddleChallengeCompute(rng: () => number): MiddleDraft {
  const x = randomInt(rng, 2, 7);
  const y = randomInt(rng, 1, 6);
  const answer = x * x + y * y;

  return {
    latex: `\\begin{cases} a+b=${x + y} \\\\ a-b=${x - y} \\end{cases} \\quad \\text{일 때, } a^2+b^2\\text{의 값은?}`,
    answer,
    type: 'system_energy',
    cognitiveType: 'compute',
    level: 4,
    hint: `두 식을 더하고 빼서 $a, b$를 먼저 구한 뒤 제곱해서 더하세요.`,
    distractors: [x + y, 2 * x * y, answer + 2, Math.max(1, answer - 2)],
    focusLabel: '연립방정식 응용',
  };
}

function genMiddleChallengeInference(rng: () => number): MiddleDraft {
  const a = randomInt(rng, 1, 3);
  const b = randomInt(rng, 1, 4);
  const c = randomInt(rng, 0, 3);
  const values = [1, 2, 3, 4].map((n) => a * n * n + b * n + c);
  const answer = a * 25 + b * 5 + c;

  return {
    latex: `\\text{수열 } ${values[0]}, ${values[1]}, ${values[2]}, ${values[3]}, \\square \\text{ 의 빈칸에 들어갈 수는?}`,
    answer,
    type: 'quadratic_sequence',
    cognitiveType: 'inference',
    level: 4,
    hint: `차이를 한 번 더 구해보세요. 2차식으로 만든 수열은 두 번째 차이가 일정합니다.`,
    distractors: [values[3] + (values[3] - values[2]), answer + a, answer - a, values[3] + (values[2] - values[1])],
    focusLabel: '이차 패턴 수열',
  };
}

function genMiddleChallengeGeometry(rng: () => number): MiddleDraft {
  const triplet = pick(rng, [
    { a: 3, b: 4, c: 5 },
    { a: 5, b: 12, c: 13 },
    { a: 8, b: 15, c: 17 },
  ]);

  return {
    latex: `\\text{직각삼각형의 한 변의 길이가 } ${triplet.a}, \\text{ 빗변의 길이가 } ${triplet.c}\\text{일 때, 둘레는?}`,
    answer: triplet.a + triplet.b + triplet.c,
    type: 'triangle_perimeter',
    cognitiveType: 'geometry',
    level: 4,
    hint: `피타고라스의 정리로 남은 한 변을 구한 뒤 세 변을 모두 더하세요.`,
    distractors: [triplet.c + triplet.b, triplet.a + triplet.c, triplet.a * triplet.b, triplet.b + triplet.c - triplet.a],
    focusLabel: '도형과 피타고라스',
  };
}

function genMiddleChallengeBacktrack(rng: () => number): MiddleDraft {
  const x = randomInt(rng, 3, 9);
  const add = randomInt(rng, 2, 5);
  const mul = randomInt(rng, 2, 4);
  const sub = randomInt(rng, 3, 6);
  const result = (x + add) * mul - sub;

  return {
    latex: `\\text{어떤 수에 } ${add}\\text{를 더한 뒤 } ${mul}\\text{배하고 } ${sub}\\text{를 뺐더니 } ${result}\\text{가 되었다.} \\\\ \\text{어떤 수는?}`,
    answer: x,
    type: 'backtrack_multi',
    cognitiveType: 'backtrack',
    level: 4,
    hint: `결과 ${result}에서부터 거꾸로 가세요. 먼저 ${sub}를 더하고, ${mul}로 나눈 뒤, 마지막에 ${add}를 빼면 됩니다.`,
    distractors: [x + add, x * mul, result / mul, x - 1],
    focusLabel: '역산 다단계',
  };
}

function genMiddleChallengeLogical(rng: () => number): MiddleDraft {
  const end = pick(rng, [36, 72, 90]);
  const count4 = Math.floor(end / 4);
  const count6 = Math.floor(end / 6);
  const count9 = Math.floor(end / 9);
  const count12 = Math.floor(end / 12);
  const count18 = Math.floor(end / 18);
  const answer = count4 + count6 + count9 - count12 - count18;

  return {
    latex: `\\text{1부터 } ${end}\\text{까지의 자연수 중 } 4\\text{의 배수 또는 }6\\text{의 배수 또는 }9\\text{의 배수인 수의 개수는?}`,
    answer,
    type: 'logical_union',
    cognitiveType: 'logical',
    level: 5,
    hint: `세 집합 포함배제입니다. 4, 6, 9의 배수 개수를 모두 더하고, 겹치는 12의 배수와 18의 배수는 한 번씩 빼세요.`,
    distractors: [count4 + count6 + count9, answer + count12, answer - count18, count4 + count6 - count12],
    focusLabel: '포함배제 원리',
  };
}

function genMiddleChallengeStructure(rng: () => number): MiddleDraft {
  const digits = pick(rng, [
    [0, 1, 2, 3, 4, 6],
    [0, 2, 3, 4, 5, 6],
  ]);
  let count = 0;

  for (let i = 0; i < digits.length; i++) {
    for (let j = 0; j < digits.length; j++) {
      for (let k = 0; k < digits.length; k++) {
        for (let m = 0; m < digits.length; m++) {
          if (i === j || i === k || i === m || j === k || j === m || k === m) continue;
          const first = digits[i];
          const second = digits[j];
          const third = digits[k];
          const fourth = digits[m];

          if (first === 0) continue;

          const value = first * 1000 + second * 100 + third * 10 + fourth;
          if (value % 4 !== 0) continue;

          count += 1;
        }
      }
    }
  }

  return {
    latex: `${digits.join(',')}\\text{ 중 서로 다른 네 숫자를 골라 만든 네 자리 수 중 } 4\\text{의 배수의 개수는?}`,
    answer: count,
    type: 'even_arrangement',
    cognitiveType: 'structure',
    level: 5,
    hint: `4의 배수 조건은 마지막 두 자리만 보면 됩니다. 가능한 끝자리 조합을 먼저 고르고, 남은 두 자리를 앞에서 배열하세요.`,
    distractors: [count - 8, count + 8, count - 12, count + 12],
    focusLabel: '경우의 수 분류',
  };
}

function genMiddleChallengeThink(rng: () => number): MiddleDraft {
  const preset = pick(rng, [
    {
      first: '2:3',
      second: '4:5',
      combined: { a: 8, b: 12, c: 15 },
      relationLabel: 'A+C',
      relationMultiplier: 23,
    },
    {
      first: '3:4',
      second: '2:3',
      combined: { a: 9, b: 12, c: 18 },
      relationLabel: 'C-A',
      relationMultiplier: 9,
    },
  ]);
  const scale = randomInt(rng, 2, 4);
  const relationValue = preset.relationMultiplier * scale;
  const answer = preset.combined.b * scale;

  return {
    latex: `\\text{세 수 } A,B,C\\text{에 대하여 } A:B=${preset.first},\\ B:C=${preset.second}\\text{이다. } ${preset.relationLabel}=${relationValue}\\text{일 때 } B\\text{의 값은?}`,
    answer,
    type: 'ratio_chain',
    cognitiveType: 'think',
    level: 5,
    hint: `두 비를 바로 합치지 말고 공통인 B의 비를 먼저 맞추세요. 그 뒤 ${preset.relationLabel}에 해당하는 비의 합 또는 차를 이용하면 됩니다.`,
    distractors: [answer - scale, answer + scale, preset.combined.c * scale, preset.combined.a * scale],
    focusLabel: '비율 결합 추론',
  };
}

function genMiddleChallengeJudgment(rng: () => number): MiddleDraft {
  const preset = pick(rng, [
    { sum: 11, gap: 3, answer: 74 },
    { sum: 13, gap: 3, answer: 85 },
    { sum: 14, gap: 4, answer: 95 },
  ]);
  const diff = 9 * preset.gap;

  return {
    latex: `\\text{두 자리 자연수 } N\\text{의 십의 자리와 일의 자리 숫자의 합이 } ${preset.sum}\\text{이고, } N\\text{에서 자리 수를 바꾼 수를 빼면 } ${diff}\\text{이다. } N\\text{의 값은?}`,
    answer: preset.answer,
    type: 'digit_condition',
    cognitiveType: 'judgment',
    level: 5,
    hint: `십의 자리 숫자를 a, 일의 자리 숫자를 b라 두면 a+b=${preset.sum}, 9(a-b)=${diff}가 됩니다.`,
    distractors: [Number(String(preset.answer).split('').reverse().join('')), preset.answer - 9, preset.answer + 9, preset.answer - preset.gap],
    focusLabel: '자리수 조건 해석',
  };
}

function genMiddleChallengeGeometryAdvanced(rng: () => number): MiddleDraft {
  const preset = pick(rng, [
    { width: 5, height: 12, diagonal: 13 },
    { width: 8, height: 15, diagonal: 17 },
    { width: 7, height: 24, diagonal: 25 },
  ]);
  const answer = preset.width * preset.height;

  return {
    latex: `\\text{직사각형의 가로와 세로의 합이 } ${preset.width + preset.height}\\text{이고 대각선의 길이가 } ${preset.diagonal}\\text{일 때, 넓이는?}`,
    answer,
    type: 'rectangle_area',
    cognitiveType: 'geometry',
    level: 5,
    hint: `가로를 x, 세로를 y라 두면 x+y와 x^2+y^2를 알 수 있습니다. (x+y)^2=x^2+2xy+y^2를 이용해 xy를 구하세요.`,
    distractors: [preset.width + preset.height, preset.diagonal * 2, answer + preset.width, answer - preset.width],
    focusLabel: '직사각형 추론',
  };
}

interface MiddleChallengeGeneratorEntry {
  cognitiveType: CognitiveType;
  tiers: StudyTier[];
  generate: (rng: () => number) => MiddleDraft;
}

const middleChallengeGenerators: MiddleChallengeGeneratorEntry[] = [
  { cognitiveType: 'compute', tiers: ['core'], generate: genMiddleChallengeCompute },
  { cognitiveType: 'inference', tiers: ['core'], generate: genMiddleChallengeInference },
  { cognitiveType: 'geometry', tiers: ['core'], generate: genMiddleChallengeGeometry },
  { cognitiveType: 'backtrack', tiers: ['core'], generate: genMiddleChallengeBacktrack },
  { cognitiveType: 'logical', tiers: ['advanced'], generate: genMiddleChallengeLogical },
  { cognitiveType: 'structure', tiers: ['advanced'], generate: genMiddleChallengeStructure },
  { cognitiveType: 'think', tiers: ['advanced'], generate: genMiddleChallengeThink },
  { cognitiveType: 'judgment', tiers: ['advanced'], generate: genMiddleChallengeJudgment },
  { cognitiveType: 'geometry', tiers: ['advanced'], generate: genMiddleChallengeGeometryAdvanced },
];

function createBaseSuneungQuestion(seed: string, index: number, tier: SuneungStudyTierDefinition): Question {
  return generateQuestion(`${seed}-base`, index, tier.level, tier.allowedTypes);
}

function createBaseMiddleQuestion(seed: string, index: number, tier: MiddleStudyTierDefinition): MiddleQuestion {
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = generateMiddleQuestion(`${seed}-base-${attempt}`, index, tier.allowedTypes);
    if (candidate.level >= tier.levelRange.min && candidate.level <= tier.levelRange.max) {
      return candidate;
    }
  }

  return generateMiddleQuestion(`${seed}-base-fallback`, index, tier.allowedTypes);
}

export function createLocalSuneungStudyQuestion(seed: string, index: number, tier: SuneungStudyTierDefinition): StudyQuestionResponse<Question> {
  if (shouldUseLocalChallenge(seed, index, tier.slug)) {
    const rng = createRng(seed, index, `suneung-challenge-${tier.slug}`);
    const candidates = suneungChallengeGenerators.filter(({ type }) => tier.allowedTypes.includes(type));

    if (candidates.length > 0) {
      const draft = pick(rng, candidates).generate(rng);
      return {
        question: {
          id: `study-suneung-${tier.slug}-${index}`,
          latex: draft.latex,
          answer: draft.answer,
          choices: buildChoices(draft.answer, draft.distractors || [], rng),
          type: draft.type,
          hint: draft.hint,
        },
        meta: {
          source: 'local',
          sourceLabel: tier.slug === 'advanced' ? '로컬 심화 출제' : '로컬 응용 출제',
          focusLabel: draft.focusLabel || SUNEUNG_TYPE_LABELS[draft.type],
        },
      };
    }
  }

  const question = createBaseSuneungQuestion(seed, index, tier);
  return {
    question: {
      ...question,
      id: `study-suneung-${tier.slug}-${index}`,
    },
    meta: {
      source: 'local',
      sourceLabel: tier.slug === 'basic' ? '기본 학습 출제' : '로컬 기본 출제',
      focusLabel: SUNEUNG_TYPE_LABELS[question.type as QType] ?? question.type,
    },
  };
}

export function createLocalMiddleStudyQuestion(seed: string, index: number, tier: MiddleStudyTierDefinition): StudyQuestionResponse<MiddleQuestion> {
  if (shouldUseLocalChallenge(seed, index, tier.slug)) {
    const rng = createRng(seed, index, `middle-challenge-${tier.slug}`);
    const candidates = middleChallengeGenerators.filter(
      ({ cognitiveType, tiers }) => tiers.includes(tier.slug) && tier.allowedTypes.includes(cognitiveType)
    );

    if (candidates.length > 0) {
      const draft = pick(rng, candidates).generate(rng);
      return {
        question: {
          id: `study-middle-${tier.slug}-${index}`,
          latex: draft.latex,
          answer: draft.answer,
          choices: buildChoices(draft.answer, draft.distractors || [], rng, 4),
          type: draft.type,
          cognitiveType: draft.cognitiveType,
          level: draft.level,
          hint: draft.hint,
        },
        meta: {
          source: 'local',
          sourceLabel: tier.slug === 'advanced' ? '로컬 심화 출제' : '로컬 응용 출제',
          focusLabel: draft.focusLabel || MIDDLE_TYPE_LABELS[draft.cognitiveType],
        },
      };
    }
  }

  const question = createBaseMiddleQuestion(seed, index, tier);
  return {
    question: {
      ...question,
      id: `study-middle-${tier.slug}-${index}`,
    },
    meta: {
      source: 'local',
      sourceLabel: tier.slug === 'basic' ? '기본 학습 출제' : '로컬 기본 출제',
      focusLabel: MIDDLE_TYPE_LABELS[question.cognitiveType] ?? question.cognitiveType,
    },
  };
}

export function getStudyTierConfig(track: StudyTrack, tier: StudyTier) {
  return track === 'suneung' ? getSuneungStudyTier(tier) : getMiddleStudyTier(tier);
}

export function shouldAttemptAiQuestion(track: StudyTrack, tier: StudyTier, seed: string, index: number): boolean {
  if (track === 'middle') return false;
  const config = getStudyTierConfig(track, tier);
  if (!config) return false;
  return shouldUseAi(seed, index, tier);
}

export function getSuneungFocusLabel(type: string): string {
  return SUNEUNG_TYPE_LABELS[type as QType] ?? type;
}

export function getMiddleFocusLabel(type: string): string {
  return MIDDLE_TYPE_LABELS[type as CognitiveType] ?? type;
}

export function sanitizeNumericChoices(answer: number, rawChoices: unknown, seed: string, index: number): number[] {
  const rng = createRng(seed, index, 'choice-sanitize');
  const choices = Array.isArray(rawChoices)
    ? rawChoices.filter((value): value is number => typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value))
    : [];

  return buildChoices(answer, choices.filter((value) => value !== answer), rng);
}

export function sanitizeMiddleLevel(level: unknown, tier: MiddleStudyTierDefinition): 1 | 2 | 3 | 4 | 5 {
  const numericLevel = typeof level === 'number' && Number.isFinite(level) ? Math.round(level) : tier.levelRange.max;
  return clampLevel(numericLevel, tier.levelRange.min, tier.levelRange.max);
}
