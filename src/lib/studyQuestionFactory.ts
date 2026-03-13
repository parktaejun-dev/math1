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
  solution: string;
  misconception: string;
  teacherNote?: string;
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
  solution: string;
  misconception: string;
  teacherNote?: string;
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
  if (process.env.ENABLE_STUDY_AI !== 'true') return false;
  const rng = createRng(seed, index, 'ai-switch');
  if (tier === 'advanced') return rng() < 0.2;
  if (tier === 'core') return rng() < 0.1;
  return false;
}

function shouldUseLocalChallenge(seed: string, index: number, tier: StudyTier): boolean {
  void seed;
  void index;
  void tier;
  return true;
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
    solution: `1. 분모를 유리화하면 분모는 $(x+${b})-(${a + b})=x-${a}$가 됩니다.\n2. 분자는 $x^2-${a * a}=(x-${a})(x+${a})$로 인수분해됩니다.\n3. 약분 후 $\\left(x+${a}\\right)\\left(\\sqrt{x+${b}}+\\sqrt{${a + b}}\\right)$에 $x=${a}$를 대입하면 ${answer}입니다.`,
    misconception: `유리화 없이 바로 대입하거나, $x^2-${a * a}$를 인수분해하지 못하면 계산이 막히기 쉽습니다.`,
    teacherNote: '극한-유리화 기본기 점검용. 약분 이후 대입까지 한 줄로 생략하지 않도록 확인하면 좋습니다.',
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
    solution: `1. 대칭 차분식 $\\lim_{h\\to0}\\dfrac{f(${a}+h)-2f(${a})+f(${a}-h)}{h^2}$ 는 $f''(${a})$입니다.\n2. $f'(x)=3x^2+${2 * b}x+${c}$, $f''(x)=6x+${2 * b}$ 입니다.\n3. 따라서 $f''(${a})=6\\cdot${a}+${2 * b}=${answer}$ 입니다.`,
    misconception: `대칭 차분을 $f'(${a})$로 착각하거나, 두 번째 미분에서 ${c}x 항이 사라진다는 점을 놓치기 쉽습니다.`,
    teacherNote: '정의형 미분과 도함수 해석을 연결하는 문항입니다. 식의 형태를 보고 f\'인지 f\'\'인지 먼저 말하게 하면 좋습니다.',
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
    solution: `1. $2x^3$은 홀함수이므로 대칭구간 $[-${a},${a}]$에서 적분값이 0입니다.\n2. 남는 부분은 $\\int_{-${a}}^{${a}} \\left(${3 * k}x^2+${c}\\right)dx$ 입니다.\n3. 짝함수 적분이므로 $2\\int_0^{${a}} \\left(${3 * k}x^2+${c}\\right)dx=2\\left(${k}x^3+${c}x\\right)\\Big|_0^{${a}}=${answer}$ 입니다.`,
    misconception: `홀함수 부분까지 같이 적분하거나, 짝함수 적분에서 2배를 빠뜨리면 오답이 납니다.`,
    teacherNote: '대칭성 인식이 핵심입니다. 먼저 어느 항이 사라지는지 말하게 하면 풀이 시간이 확 줄어듭니다.',
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
    solution: `1. $\\sum_{k=1}^{${n}} (k^2-k)=\\sum_{k=1}^{${n}} k^2-\\sum_{k=1}^{${n}} k$ 입니다.\n2. $\\sum_{k=1}^{${n}} k^2=\\dfrac{${n}(${n}+1)(2\\cdot${n}+1)}{6}$, $\\sum_{k=1}^{${n}} k=\\dfrac{${n}(${n}+1)}{2}$ 입니다.\n3. 정리하면 $\\dfrac{${n}(${n}+1)(${n}-1)}{3}=${answer}$ 입니다.`,
    misconception: `시그마를 항별로 분리하지 않거나, $\\sum k^2$ 공식을 $\\left(\\sum k\\right)^2$로 착각하는 경우가 많습니다.`,
    teacherNote: '공식 암기 여부보다 두 공식을 언제 같이 써야 하는지 판단하는지 보기에 좋습니다.',
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
    solution: `1. 왼쪽 식은 $\\dfrac{x^2-${a * a}}{x-${a}}=x+${a}$ 이므로 좌극한은 ${2 * a}입니다.\n2. 오른쪽 식에 $x=${a}$를 대입하면 ${a * a}+${a}k${c >= 0 ? '+' : ''}${c}$ 입니다.\n3. 연속이려면 두 값이 같아야 하므로 ${a * a}+${a}k${c >= 0 ? '+' : ''}${c}=${2 * a}$, 이를 풀면 $k=${targetK}$ 입니다.`,
    misconception: `왼쪽 식에 바로 ${a}를 대입해 0/0으로 멈추거나, 연속 조건을 함수값만 맞추는 것으로 오해하기 쉽습니다.`,
    teacherNote: '분할함수 문제에서 좌극한-우함숫값을 분리해서 쓰는 습관을 점검할 수 있습니다.',
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
    solution: `1. $f'(x)=3x^2-${3 * (preset.p + preset.q)}x+${coef1}=3(x-${preset.p})(x-${preset.q})$ 입니다.\n2. 도함수 부호가 $+,-,+$로 바뀌므로 $x=${preset.q}$에서 극소가 생깁니다.\n3. $f(${preset.q})=${preset.q}^3-${coef2}\\cdot${preset.q}^2+${coef1}\\cdot${preset.q}+${preset.c}=${answer}$ 이므로 극솟값은 ${answer}입니다.`,
    misconception: `도함수의 근 두 개를 찾고도 어느 점이 극소인지 구분하지 못하면 오답이 납니다.`,
    teacherNote: '극대/극소 판별과 대입 계산을 분리해서 쓰게 하면 서술형 안정도가 올라갑니다.',
    distractors: [preset.q, answer + preset.q, answer - preset.p, preset.c],
    focusLabel: '극소값 계산',
  };
}

function genSuneungLocalExp(rng: () => number): SuneungDraft {
  const base = pick(rng, [2, 3]);
  const e1 = randomInt(rng, 3, 6);
  const e2 = randomInt(rng, 2, 5);
  const e3 = randomInt(rng, 1, 3);
  const answer = e1 + e2 - e3;

  return {
    latex: `${base}^{${e1}} \\times ${base}^{${e2}} \\div ${base}^{${e3}} = ${base}^n \\text{일 때 } n\\text{의 값은?}`,
    answer,
    type: 'exp',
    hint: `밑이 같을 때 곱셈은 지수의 덧셈, 나눗셈은 지수의 뺄셈입니다.`,
    solution: `1. 같은 밑의 거듭제곱의 곱셈이므로 지수는 ${e1}+${e2}가 됩니다.\n2. 다시 ${base}^{${e3}}로 나누므로 지수에서 ${e3}을 뺍니다.\n3. 따라서 $n=${e1}+${e2}-${e3}=${answer}$ 입니다.`,
    misconception: `곱셈과 나눗셈을 순서대로 보지 않고 지수를 전부 더하거나 전부 곱하면 오답이 납니다.`,
    teacherNote: '지수법칙 기초 정착용. 계산 전에 지수끼리만 정리하는 습관을 확인하기 좋습니다.',
    distractors: [e1 + e2 + e3, e1 - e2 - e3, e1 * e2 - e3, e1 + e2],
    focusLabel: '지수법칙 정리',
  };
}

function genSuneungLocalLog(rng: () => number): SuneungDraft {
  const base = pick(rng, [2, 3]);
  const p = randomInt(rng, 2, 4);
  const q = randomInt(rng, 1, 3);
  const r = randomInt(rng, 1, 3);
  const left = base ** p;
  const mid = base ** q;
  const right = base ** r;
  const answer = p - q + r;

  return {
    latex: `\\log_{${base}} ${left} - \\log_{${base}} ${mid} + \\log_{${base}} ${right} = ?`,
    answer,
    type: 'log',
    hint: `뺄셈은 진수의 나눗셈, 덧셈은 진수의 곱셈으로 묶은 뒤 지수꼴로 바꾸세요.`,
    solution: `1. $\\log_{${base}} ${left} - \\log_{${base}} ${mid}=\\log_{${base}} \\dfrac{${left}}{${mid}}$ 입니다.\n2. 여기에 $\\log_{${base}} ${right}$를 더하면 $\\log_{${base}} \\left(\\dfrac{${left}}{${mid}}\\cdot${right}\\right)$ 입니다.\n3. 진수를 ${base}의 거듭제곱으로 정리하면 ${base}^{${answer}}이므로 값은 ${answer}입니다.`,
    misconception: `로그의 뺄셈을 진수의 뺄셈으로 처리하거나, 거듭제곱을 보지 못하면 실수하기 쉽습니다.`,
    teacherNote: '로그 성질을 식 변형으로 연결하는 기본 문항입니다.',
    distractors: [p + q + r, p - q, p + r, p * r - q],
    focusLabel: '로그 성질 결합',
  };
}

function genSuneungLocalTrig(rng: () => number): SuneungDraft {
  const answer = pick(rng, [3, 4]);
  const latex = answer === 3
    ? `2\\sin\\frac{\\pi}{6}+2\\cos\\frac{\\pi}{3}+\\tan\\frac{\\pi}{4}=?`
    : `4\\sin\\frac{\\pi}{6}+2\\cos\\frac{\\pi}{3}+\\tan\\frac{\\pi}{4}=?`;

  return {
    latex,
    answer,
    type: 'trig_basic',
    hint: `특수각의 삼각비 $\\sin\\frac{\\pi}{6}, \\cos\\frac{\\pi}{3}, \\tan\\frac{\\pi}{4}$ 값을 먼저 각각 쓰세요.`,
    solution: answer === 3
      ? `1. $\\sin\\frac{\\pi}{6}=\\frac{1}{2},\\ \\cos\\frac{\\pi}{3}=\\frac{1}{2},\\ \\tan\\frac{\\pi}{4}=1$ 입니다.\n2. 따라서 $2\\cdot\\frac{1}{2}+2\\cdot\\frac{1}{2}+1=1+1+1=3$ 입니다.`
      : `1. $\\sin\\frac{\\pi}{6}=\\frac{1}{2},\\ \\cos\\frac{\\pi}{3}=\\frac{1}{2},\\ \\tan\\frac{\\pi}{4}=1$ 입니다.\n2. 따라서 $4\\cdot\\frac{1}{2}+2\\cdot\\frac{1}{2}+1=2+1+1=4$ 입니다.`,
    misconception: `특수각 값을 외우고 있어도 계수를 곱하지 않거나, $\\tan\\frac{\\pi}{4}$를 1이 아닌 값으로 착각하면 오답이 납니다.`,
    teacherNote: '특수각 암기 확인보다는 대입 후 정리까지 정확히 되는지 점검하기 좋습니다.',
    distractors: answer === 3 ? [2, 4, 5, 1] : [2, 3, 5, 6],
    focusLabel: '특수각 삼각비',
  };
}

function genSuneungLocalSeq(rng: () => number): SuneungDraft {
  const c = randomInt(rng, 2, 5);
  const answerIndex = pick(rng, [4, 5, 6]);
  const answer = 2 * answerIndex + c - 1;

  return {
    latex: `\\text{수열의 합 } S_n=n(n+${c})\\text{일 때, } a_${answerIndex}\\text{의 값은?}`,
    answer,
    type: 'seq',
    hint: `수열의 일반항은 $a_n=S_n-S_{n-1}$ 로 구할 수 있습니다.`,
    solution: `1. $a_n=S_n-S_{n-1}$ 이므로 $a_n=n(n+${c})-(n-1)(n+${c}-1)$ 입니다.\n2. 정리하면 $a_n=2n+${c - 1}$ 입니다.\n3. 따라서 $a_${answerIndex}=2\\cdot${answerIndex}+${c - 1}=${answer}$ 입니다.`,
    misconception: `$S_n$ 자체를 일반항으로 착각하거나 $S_n-S_{n-1}$를 계산하지 않으면 틀리기 쉽습니다.`,
    teacherNote: '합에서 일반항을 복원하는 전형 문제입니다. 식 전개를 생략하지 않게 지도하기 좋습니다.',
    distractors: [answer + 2, answer - 2, answerIndex * (answerIndex + c), 2 * answerIndex + c],
    focusLabel: '합에서 일반항 복원',
  };
}

interface SuneungGeneratorEntry {
  type: QType;
  tiers: StudyTier[];
  generate: (rng: () => number) => SuneungDraft;
}

const suneungLocalGenerators: SuneungGeneratorEntry[] = [
  { type: 'exp', tiers: ['basic', 'core'], generate: genSuneungLocalExp },
  { type: 'log', tiers: ['basic', 'core'], generate: genSuneungLocalLog },
  { type: 'trig_basic', tiers: ['basic', 'core'], generate: genSuneungLocalTrig },
  { type: 'limit_basic', tiers: ['basic', 'core'], generate: genSuneungChallengeLimit },
  { type: 'seq', tiers: ['core', 'advanced'], generate: genSuneungLocalSeq },
  { type: 'diff', tiers: ['core', 'advanced'], generate: genSuneungChallengeDiff },
  { type: 'sigma_basic', tiers: ['core', 'advanced'], generate: genSuneungChallengeSigma },
  { type: 'continuity', tiers: ['core', 'advanced'], generate: genSuneungChallengeContinuity },
  { type: 'int', tiers: ['advanced'], generate: genSuneungChallengeIntegral },
  { type: 'extrema', tiers: ['advanced'], generate: genSuneungChallengeExtrema },
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
    solution: `1. 두 식을 더하면 $2a=${2 * x}$ 이므로 $a=${x}$ 입니다.\n2. 두 식을 빼면 $2b=${2 * y}$ 이므로 $b=${y}$ 입니다.\n3. 따라서 $a^2+b^2=${x}^2+${y}^2=${answer}$ 입니다.`,
    misconception: `두 식을 더하고 빼는 과정에서 2로 나누는 걸 빠뜨리거나, $a^2+b^2$를 $(a+b)^2$로 착각하는 경우가 많습니다.`,
    teacherNote: '연립방정식 해를 구한 뒤 원하는 값을 다시 만드는 2단계 구조입니다.',
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
    solution: `1. 인접한 항의 차를 구하면 등차수열이 아니라는 점이 보입니다.\n2. 두 번째 차이를 보면 일정하므로 이 수열은 2차식 규칙을 따릅니다.\n3. 같은 규칙으로 5번째 항을 계산하면 ${answer}입니다.`,
    misconception: `첫 번째 차이만 보고 등차수열로 처리하면 바로 틀립니다.`,
    teacherNote: '규칙 찾기 문항에서 “1차 차이 확인 → 2차 차이 확인” 절차를 습관화시키기 좋습니다.',
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
    solution: `1. 직각삼각형이므로 남은 한 변의 길이는 $\\sqrt{${triplet.c}^2-${triplet.a}^2}=${triplet.b}$ 입니다.\n2. 둘레는 세 변의 합이므로 ${triplet.a}+${triplet.b}+${triplet.c}=${triplet.a + triplet.b + triplet.c}$ 입니다.`,
    misconception: `빗변을 빼기만 하거나, 구한 나머지 한 변을 둘레에 포함하지 않는 실수가 자주 나옵니다.`,
    teacherNote: '피타고라스 계산 뒤 바로 끝내지 말고 “무엇을 묻는가”를 다시 확인시키는 용도입니다.',
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
    solution: `1. 결과 ${result}에서 거꾸로 시작해 ${sub}를 더하면 ${(x + add) * mul}입니다.\n2. 이를 ${mul}로 나누면 ${x + add}가 됩니다.\n3. 마지막으로 ${add}를 빼면 어떤 수는 ${x}입니다.`,
    misconception: `앞에서부터 식을 세우지 않고 직감으로 계산하거나, 역연산 순서를 뒤집으면 오답이 납니다.`,
    teacherNote: '역산 문항은 연산 순서의 역순 복원이 핵심입니다. 문장에 번호를 매겨 읽히면 효과가 좋습니다.',
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
    solution: `1. 4의 배수는 ${count4}개, 6의 배수는 ${count6}개, 9의 배수는 ${count9}개입니다.\n2. 겹치는 수를 빼야 하므로 12의 배수 ${count12}개와 18의 배수 ${count18}개를 뺍니다.\n3. 따라서 전체 개수는 ${count4}+${count6}+${count9}-${count12}-${count18}=${answer}개입니다.`,
    misconception: `겹치는 배수를 빼지 않으면 중복 계산이 됩니다. 세 집합 문제를 두 집합 공식처럼 처리하는 실수가 많습니다.`,
    teacherNote: '포함배제를 처음 배우는 학생에게는 집합 표시를 같이 적게 하면 이해도가 올라갑니다.',
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
    solution: `1. 4의 배수 여부는 마지막 두 자리만으로 결정됩니다.\n2. 따라서 가능한 끝 두 자리 조합을 먼저 찾고, 남은 숫자를 천의 자리와 백의 자리에 배열합니다. 이때 천의 자리에는 0이 올 수 없습니다.\n3. 이 조건을 모두 반영하면 가능한 수는 ${count}개입니다.`,
    misconception: `네 자리 수 전체를 한꺼번에 세거나, 맨 앞자리에 0이 올 수 없다는 조건을 빼먹으면 오답이 납니다.`,
    teacherNote: '경우의 수는 “끝자리 조건 먼저”와 “맨 앞자리 제한”을 나눠 세게 하면 오류가 줄어듭니다.',
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
    solution: `1. 두 비에서 공통인 B를 기준으로 비를 통일하면 $A:B:C=${preset.combined.a}:${preset.combined.b}:${preset.combined.c}$ 입니다.\n2. 따라서 ${preset.relationLabel}의 비는 ${preset.relationLabel === 'A+C' ? `${preset.combined.a}+${preset.combined.c}` : `${preset.combined.c}-${preset.combined.a}`}=${preset.relationMultiplier} 입니다.\n3. 실제 값이 ${relationValue}이므로 확대배수는 ${scale}, 따라서 $B=${preset.combined.b}\\times${scale}=${answer}$ 입니다.`,
    misconception: `비를 통일하지 않고 바로 더하거나 빼면 비례 관계가 깨집니다.`,
    teacherNote: '비 문제는 공통항 맞추기 습관이 있는지 확인하기 좋습니다.',
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
    solution: `1. 십의 자리 숫자를 $a$, 일의 자리 숫자를 $b$라 두면 $a+b=${preset.sum}$ 입니다.\n2. 원래 수와 자리 바꾼 수의 차는 $(10a+b)-(10b+a)=9(a-b)$ 이므로 $9(a-b)=${diff}$, 즉 $a-b=${preset.gap}$ 입니다.\n3. 연립하면 $a=${(preset.sum + preset.gap) / 2}$, $b=${(preset.sum - preset.gap) / 2}$ 이므로 $N=${preset.answer}$ 입니다.`,
    misconception: `자리 바꾼 수를 $ab$처럼 문자 두 개로만 처리하거나, 차를 10(a-b)로 잘못 세우는 경우가 많습니다.`,
    teacherNote: '자리값 개념과 식 세우기를 동시에 점검할 수 있는 문항입니다.',
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
    solution: `1. 가로를 $x$, 세로를 $y$라 두면 $x+y=${preset.width + preset.height}$ 입니다.\n2. 대각선이 ${preset.diagonal}이므로 $x^2+y^2=${preset.diagonal ** 2}$ 입니다.\n3. $(x+y)^2=x^2+2xy+y^2$ 에 대입하면 ${preset.width + preset.height}^2=${preset.diagonal ** 2}+2xy$, 따라서 $2xy=${2 * answer}$, 넓이 $xy=${answer}$ 입니다.`,
    misconception: `피타고라스 정리로 바로 한 변을 정하려 하거나, $(x+y)^2$ 전개에서 $2xy$를 빼먹으면 틀리기 쉽습니다.`,
    teacherNote: '조건 두 개를 결합해 미지수를 직접 구하지 않고 넓이를 구하는 사고를 평가하기 좋습니다.',
    distractors: [preset.width + preset.height, preset.diagonal * 2, answer + preset.width, answer - preset.width],
    focusLabel: '직사각형 추론',
  };
}

function genMiddleBasicReflex(rng: () => number): MiddleDraft {
  const a = pick(rng, [-9, -8, -7, -6, 6, 7, 8, 9]);
  const b = pick(rng, [-5, -4, -3, 3, 4, 5]);
  const c = pick(rng, [-4, -3, 3, 4]);
  const answer = a + b - c;

  return {
    latex: `${a} + (${b}) - (${c}) = ?`,
    answer,
    type: 'sign_mix',
    cognitiveType: 'reflex',
    level: 2,
    hint: `빼기 앞의 괄호를 먼저 정리해 부호를 정확히 바꾸세요.`,
    solution: `1. 식을 $${a}${b >= 0 ? '+' : ''}${b}${c >= 0 ? '-' : '+'}${Math.abs(c)}$ 로 다시 쓰면 됩니다.\n2. 순서대로 계산하면 값은 ${answer}입니다.`,
    misconception: `마지막 괄호 앞의 빼기를 처리하지 않고 부호를 그대로 두면 오답이 납니다.`,
    teacherNote: '정수와 부호 계산 기본기 점검용입니다.',
    distractors: [a + b + c, a - b - c, answer + 2, answer - 2],
    focusLabel: '부호 계산',
  };
}

function genMiddleBasicComputeLocal(rng: () => number): MiddleDraft {
  const a = randomInt(rng, 2, 5);
  const x = pick(rng, [-4, -3, -2, 2, 3, 4]);
  const b = randomInt(rng, 3, 9);
  const c = a * x + b;

  return {
    latex: `${a}x + ${b} = ${c} \\quad (x=?)`,
    answer: x,
    type: 'linear_eq_local',
    cognitiveType: 'compute',
    level: 2,
    hint: `상수항을 먼저 이항한 뒤 계수로 나누세요.`,
    solution: `1. 양변에서 ${b}를 빼면 ${a}x=${a * x} 입니다.\n2. 양변을 ${a}로 나누면 $x=${x}$ 입니다.`,
    misconception: `이항 후 부호를 바꾸지 않거나, 마지막에 계수 ${a}로 나누는 걸 빠뜨리는 실수가 많습니다.`,
    teacherNote: '일차방정식 풀이 절차를 말로 설명하게 하기 좋습니다.',
    distractors: [-x, x + 1, x - 1, c - b],
    focusLabel: '일차방정식',
  };
}

function genMiddleBasicPatternLocal(rng: () => number): MiddleDraft {
  const start = randomInt(rng, 2, 6);
  const gap = randomInt(rng, 2, 5);
  const values = [start, start + gap, start + 2 * gap, start + 3 * gap];
  const answer = start + 4 * gap;

  return {
    latex: `\\text{수열 } ${values.join(', ')}, \\square \\text{ 에서 빈칸에 들어갈 수는?}`,
    answer,
    type: 'arithmetic_pattern',
    cognitiveType: 'pattern',
    level: 2,
    hint: `앞뒤 차이를 먼저 확인해 일정한지 보세요.`,
    solution: `1. 인접한 항의 차는 모두 ${gap}입니다.\n2. 따라서 등차수열이므로 다음 항은 ${values[3]}+${gap}=${answer}입니다.`,
    misconception: `곱셈 규칙으로 오해하거나 마지막 두 항만 보고 다른 간격을 쓰면 틀립니다.`,
    teacherNote: '규칙 찾기의 가장 기본 형태입니다. 차이를 먼저 보게 하는 습관을 주면 좋습니다.',
    distractors: [values[3] + gap + 1, values[3] + gap - 1, values[3] * 2, values[3] + 2 * gap],
    focusLabel: '등차 규칙 찾기',
  };
}

function genMiddleBasicSenseLocal(rng: () => number): MiddleDraft {
  const a = randomInt(rng, 3, 9);
  const b = randomInt(rng, 1, a - 1);
  const answer = Math.abs(a - b) + b;

  return {
    latex: `|${a}-${b}| + |-${b}| = ?`,
    answer,
    type: 'absolute_value_mix',
    cognitiveType: 'sense',
    level: 2,
    hint: `절댓값은 부호를 떼고 크기만 남긴 값입니다.`,
    solution: `1. $|${a}-${b}|=|${a - b}|=${Math.abs(a - b)}$ 입니다.\n2. $|-${b}|=${b}$ 입니다.\n3. 따라서 합은 ${Math.abs(a - b)}+${b}=${answer}$ 입니다.`,
    misconception: `절댓값 안의 음수를 그대로 두거나, $|a-b|$를 $a-b$로 바로 쓰면 오답이 납니다.`,
    teacherNote: '절댓값 개념을 수직선 해석과 연결해 확인하기 좋습니다.',
    distractors: [a - b - b, a + b, Math.abs(a - b), b],
    focusLabel: '절댓값 해석',
  };
}

function genMiddleChallengeBacktrackAdvanced(rng: () => number): MiddleDraft {
  const x = randomInt(rng, 4, 8);
  const add = randomInt(rng, 3, 6);
  const mul = randomInt(rng, 3, 5);
  const div = pick(rng, [2, 3]);
  const result = ((x + add) * mul) / div;

  return {
    latex: `\\text{어떤 수에 } ${add}\\text{를 더한 뒤 } ${mul}\\text{배하고 } ${div}\\text{로 나누었더니 } ${result}\\text{가 되었다. 어떤 수는?}`,
    answer: x,
    type: 'backtrack_fractional',
    cognitiveType: 'backtrack',
    level: 5,
    hint: `결과 ${result}에서부터 역순으로 ${div}를 곱하고, ${mul}로 나눈 뒤, ${add}를 빼세요.`,
    solution: `1. 역산하면 먼저 ${result}에 ${div}를 곱해 ${(x + add) * mul}을 얻습니다.\n2. 이를 ${mul}로 나누면 ${x + add}입니다.\n3. 마지막으로 ${add}를 빼면 어떤 수는 ${x}입니다.`,
    misconception: `역연산 순서를 거꾸로 적용하지 않거나, 나누기와 곱하기의 역관계를 혼동하면 틀립니다.`,
    teacherNote: '중등 심화에서 충분히 쓸 수 있는 다단계 역산 문항입니다.',
    distractors: [x + add, x * mul, result * div, result],
    focusLabel: '역산 구조화',
  };
}

interface MiddleChallengeGeneratorEntry {
  cognitiveType: CognitiveType;
  tiers: StudyTier[];
  generate: (rng: () => number) => MiddleDraft;
}

const middleChallengeGenerators: MiddleChallengeGeneratorEntry[] = [
  { cognitiveType: 'reflex', tiers: ['basic'], generate: genMiddleBasicReflex },
  { cognitiveType: 'compute', tiers: ['basic'], generate: genMiddleBasicComputeLocal },
  { cognitiveType: 'pattern', tiers: ['basic'], generate: genMiddleBasicPatternLocal },
  { cognitiveType: 'sense', tiers: ['basic'], generate: genMiddleBasicSenseLocal },
  { cognitiveType: 'compute', tiers: ['core'], generate: genMiddleChallengeCompute },
  { cognitiveType: 'inference', tiers: ['core'], generate: genMiddleChallengeInference },
  { cognitiveType: 'geometry', tiers: ['core'], generate: genMiddleChallengeGeometry },
  { cognitiveType: 'backtrack', tiers: ['core'], generate: genMiddleChallengeBacktrack },
  { cognitiveType: 'logical', tiers: ['advanced'], generate: genMiddleChallengeLogical },
  { cognitiveType: 'structure', tiers: ['advanced'], generate: genMiddleChallengeStructure },
  { cognitiveType: 'think', tiers: ['advanced'], generate: genMiddleChallengeThink },
  { cognitiveType: 'judgment', tiers: ['advanced'], generate: genMiddleChallengeJudgment },
  { cognitiveType: 'geometry', tiers: ['advanced'], generate: genMiddleChallengeGeometryAdvanced },
  { cognitiveType: 'backtrack', tiers: ['advanced'], generate: genMiddleChallengeBacktrackAdvanced },
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
    const candidates = suneungLocalGenerators.filter(
      ({ type, tiers }) => tiers.includes(tier.slug) && tier.allowedTypes.includes(type)
    );

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
          solution: draft.solution,
          misconception: draft.misconception,
          teacherNote: draft.teacherNote,
        },
        meta: {
          source: 'local',
          sourceLabel: tier.slug === 'advanced' ? '교사용 심화 문항' : tier.slug === 'core' ? '교사용 응용 문항' : '교사용 기본 문항',
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
      sourceLabel: tier.slug === 'basic' ? '교사용 기본 문항' : '교사용 보조 문항',
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
          solution: draft.solution,
          misconception: draft.misconception,
          teacherNote: draft.teacherNote,
        },
        meta: {
          source: 'local',
          sourceLabel: tier.slug === 'advanced' ? '교사용 심화 문항' : tier.slug === 'core' ? '교사용 응용 문항' : '교사용 기본 문항',
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
      sourceLabel: tier.slug === 'basic' ? '교사용 기본 문항' : '교사용 보조 문항',
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
