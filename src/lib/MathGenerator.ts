/**
 * MathGenerator — seed-based deterministic math problem generator
 * Uses Mulberry32 PRNG for reproducible question generation.
 */

export interface Question {
  id: string;
  latex: string;
  answer: number;
  choices: number[];
  type: string;
  hint?: string;
}

// Mulberry32 PRNG — fast, deterministic, 32-bit state
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convert string seed to numeric seed via simple hash
function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash >>> 0;
}

// Detect if a number is a power of a given base
function isPowerOf(n: number, base: number): boolean {
  if (n <= 0 || base <= 1) return false;
  while (n > 1) {
    if (n % base !== 0) return false;
    n /= base;
  }
  return n === 1;
}

// Detect the base of a number (2 or 3) if it's a perfect power, otherwise 0
function detectBase(n: number): number {
  if (isPowerOf(n, 2)) return 2;
  if (isPowerOf(n, 3)) return 3;
  return 0;
}

// Fixed choices array in ascending order (typical of CSAT)
function generateCSATChoices(answer: number, rng: () => number, type: string = 'generic'): number[] {
  if (!Number.isFinite(answer) || !Number.isInteger(answer) || answer <= 0) {
    throw new Error('generateCSATChoices expects positive integer answer');
  }

  const pool = new Set<number>();

  if (type === 'exp') {
    const base = detectBase(answer);
    if (base > 0) {
      const powers: number[] = [];
      for (let e = 1; e <= 12; e++) {
        const v = Math.pow(base, e);
        if (v > 0 && v <= 10000) powers.push(v);
      }
      powers.filter(v => v !== answer).forEach(v => pool.add(v));
    }
    if (answer * 2 <= 5000) pool.add(answer * 2);
    if (answer * 3 <= 5000) pool.add(answer * 3);
    if (answer % 2 === 0 && answer / 2 > 0) pool.add(answer / 2);
    if (answer % 3 === 0 && answer / 3 > 0) pool.add(answer / 3);

  } else if (type === 'log' || type === 'trig_basic' || type === 'limit_basic' || type === 'continuity' || type === 'extrema') {
    // These generally yield small integer answers (1~10)
    // CSAT style: small neighboring integers
    for (let d = 1; d <= 8; d++) {
      if (d !== answer) pool.add(d);
    }
  } else if (type === 'int') {
    const fracs = [2 / 3, 3 / 4, 4 / 3, 3 / 2, 1 / 2, 5 / 4];
    fracs.forEach(f => {
      const v = Math.round(answer * f);
      if (v > 0 && v !== answer) pool.add(v);
    });
    if (answer > 3) pool.add(answer - 3);
    pool.add(answer + 3);
    if (answer > 5) pool.add(answer - 5);
    pool.add(answer + 5);

  } else if (type === 'diff') {
    const offsets = [2, 4, 6, 8];
    offsets.forEach(o => {
      if (answer > o) pool.add(answer - o);
      pool.add(answer + o);
    });
    if (answer % 2 === 0) pool.add(answer / 2);
    if (answer % 3 === 0) pool.add(answer / 3);
    pool.add(answer * 2);

  } else if (type === 'seq' || type === 'sigma_basic') {
    const offsets = [3, 5, 7, 10, 12, 15];
    offsets.forEach(o => {
      if (answer > o) pool.add(answer - o);
      pool.add(answer + o);
    });
    if (answer > 6) pool.add(answer - 6);

  } else {
    // Generic
    if (answer > 1) pool.add(answer - 1);
    pool.add(answer + 1);
    if (answer > 2) pool.add(answer - 2);
    pool.add(answer + 2);
    if (answer % 2 === 0 && answer / 2 > 0) pool.add(answer / 2);
    pool.add(answer * 2);
  }

  let distractorArray = Array.from(pool).filter(d =>
    d !== answer && d > 0 && Number.isInteger(d)
  );

  for (let i = distractorArray.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [distractorArray[i], distractorArray[j]] = [distractorArray[j], distractorArray[i]];
  }

  const selectedDistractors = new Set<number>();
  for (let i = 0; i < distractorArray.length && selectedDistractors.size < 4; i++) {
    selectedDistractors.add(distractorArray[i]);
  }

  let offset = 1;
  const step = answer < 10 ? 1 : answer < 50 ? 3 : Math.max(5, Math.round(answer * 0.1));
  while (selectedDistractors.size < 4) {
    const candidate1 = answer - offset * step;
    const candidate2 = answer + offset * step;

    if (candidate1 > 0 && candidate1 !== answer && !selectedDistractors.has(candidate1)) {
      selectedDistractors.add(candidate1);
    }
    if (selectedDistractors.size < 4 && candidate2 !== answer && !selectedDistractors.has(candidate2)) {
      selectedDistractors.add(candidate2);
    }
    offset++;
    if (offset > 20) break;
  }

  const finalChoices = [answer, ...Array.from(selectedDistractors)];
  return finalChoices.sort((a, b) => a - b);
}

// ─── Question Generators ───────────────────────────────────────────

// [0] Exponents
function generateType1Question(rng: () => number): Omit<Question, 'id' | 'choices'> {
  // Irrational exponents using difference of squares: (root^{\sqrt{d} + a})^{\sqrt{d} - a}
  const root = [2, 3][Math.floor(rng() * 2)];
  const validPairs = [
    { d: 3, a: 1 },
    { d: 5, a: 1 },
    { d: 5, a: 2 },
    { d: 7, a: 2 },
    { d: 6, a: 2 },
  ];
  const pair = validPairs[Math.floor(rng() * validPairs.length)];
  const ans = Math.pow(root, pair.d - pair.a * pair.a);

  return {
    latex: `\\left(${root}^{\\sqrt{${pair.d}} + ${pair.a}}\\right)^{\\sqrt{${pair.d}} - ${pair.a}} = ?`,
    answer: ans,
    type: 'exp',
    hint: `지수법칙 $(a^m)^n = a^{mn}$을 적용한 후, 합차공식 $(x+y)(x-y) = x^2 - y^2$을 이용해보세요.`
  };
}

// [1] Differentiation (limits)
function generateType2Question(rng: () => number): Omit<Question, 'id' | 'choices'> {
  let B = 0, C = 0, D = 0, a = 0, answer = 0;
  for (let attempts = 0; attempts < 100; attempts++) {
    B = Math.floor(rng() * 5) - 2;
    C = Math.floor(rng() * 5) - 2;
    D = Math.floor(rng() * 9) + 1;
    a = Math.floor(rng() * 3) + 1;
    answer = 3 * a * a + 2 * B * a + C;
    if (answer > 0) break;
  }
  if (answer <= 0) { B = 1; C = 1; a = 1; answer = 5; }

  let funcStr = `x^3`;
  if (B !== 0) funcStr += B > 0 ? ` + ${B === 1 ? '' : B}x^2` : ` - ${Math.abs(B) === 1 ? '' : Math.abs(B)}x^2`;
  if (C !== 0) funcStr += C > 0 ? ` + ${C === 1 ? '' : C}x` : ` - ${Math.abs(C) === 1 ? '' : Math.abs(C)}x`;
  funcStr += ` + ${D}`;

  const limitTex = `\\lim_{h \\to 0} \\frac{f(${a}+h) - f(${a})}{h}`;
  return {
    latex: `\\begin{gather*} f(x) = ${funcStr} \\\\ ${limitTex} = ? \\end{gather*}`,
    answer,
    type: 'diff',
    hint: `주어진 극한식은 $x=${a}$에서의 미분계수 $f'(${a})$를 뜻합니다. 먼저 다항함수 $f(x)$를 미분하여 $f'(x)$를 구해보세요.`
  };
}

// [2] Sequence sum inference
function generateType3Question(rng: () => number): Omit<Question, 'id' | 'choices'> {
  const N = Math.floor(rng() * 4) + 7;
  const ans = Math.floor(rng() * 20) + 10;
  const c = Math.floor(rng() * 3) + 2;
  const X = ans + c * N;

  return {
    latex: `\\begin{gather*} \\sum_{k=1}^{${N}} (a_k + ${c}) = ${X} \\\\ \\sum_{k=1}^{${N}} a_k = ? \\end{gather*}`,
    answer: ans,
    type: 'seq',
    hint: `시그마의 성질 $\\sum (A_k + B) = \\sum A_k + \\sum B$를 이용하세요. 상수 ${c}를 ${N}번 더하면 ${c * N}이 됩니다.`
  };
}

// [3] Definite Integration
function generateType4Question(rng: () => number): Omit<Question, 'id' | 'choices'> {
  let a = 0, b = 0, ans = 0;
  for (let attempts = 0; attempts < 50; attempts++) {
    a = Math.floor(rng() * 3) + 1;
    b = Math.floor(rng() * 4) + 1;
    ans = a * a * a + b * a * a;
    if (ans > 0) break;
  }
  return {
    latex: `\\int_{0}^{${a}} (3x^2 + ${2 * b}x) \\,dx = ?`,
    answer: ans,
    type: 'int',
    hint: `$x^n$을 적분하면 $\\frac{1}{n+1}x^{n+1}$이 됩니다. 적분 후 위끝 ${a}를 대입한 값에서 아래끝 $0$을 대입한 값을 빼세요.`
  }
}

// [4] Logarithm Properties
function generateType5Question(rng: () => number): Omit<Question, 'id' | 'choices'> {
  let base = [2, 3][Math.floor(rng() * 2)];
  let ans = Math.floor(rng() * 4) + 2;
  let p1 = Math.floor(rng() * (ans - 1)) + 1;
  let p2 = ans - p1;
  let b = Math.pow(base, p1);
  let c = Math.pow(base, p2);

  return {
    latex: `\\log_{${base}} ${b} + \\log_{${base}} ${c} = ?`,
    answer: ans,
    type: 'log',
    hint: `밑이 같은 로그의 덧셈은 진수의 곱셈과 같습니다: $\\log_a x + \\log_a y = \\log_a (xy)$. 그 후 $\\log_a a^n = n$을 이용하세요.`
  };
}

// [5] NEW: Trigonometry Basic (Trig sum of special angles)
function generateTrigBasicQuestion(rng: () => number): Omit<Question, 'id' | 'choices'> {
  const terms = [
    { tex: '\\sin\\frac{\\pi}{6}', val: 0.5 },
    { tex: '\\cos\\frac{\\pi}{3}', val: 0.5 },
    { tex: '\\tan\\frac{\\pi}{4}', val: 1 },
    { tex: '\\cos 0', val: 1 },
    { tex: '\\sin\\frac{\\pi}{2}', val: 1 }
  ];
  let ans = 0;
  let latex = '';
  for (let attempts = 0; attempts < 50; attempts++) {
    const t1 = terms[Math.floor(rng() * terms.length)];
    const t2 = terms[Math.floor(rng() * terms.length)];
    const c1 = t1.val === 0.5 ? (Math.floor(rng() * 4) + 1) * 2 : Math.floor(rng() * 4) + 1;
    const c2 = t2.val === 0.5 ? (Math.floor(rng() * 4) + 1) * 2 : Math.floor(rng() * 4) + 1;

    const op = rng() > 0.5 ? '+' : '-';
    ans = op === '+' ? (c1 * t1.val + c2 * t2.val) : (c1 * t1.val - c2 * t2.val);

    if (ans > 0 && Number.isInteger(ans)) {
      const c1Str = c1 === 1 ? '' : c1;
      const c2Str = c2 === 1 ? '' : c2;
      latex = `${c1Str}${t1.tex} ${op} ${c2Str}${t2.tex} = ?`;
      break;
    }
  }
  return {
    latex,
    answer: ans,
    type: 'trig_basic',
    hint: `특수각의 삼각비 값을 떠올려보세요. $\\sin(\\pi/6)=\\cos(\\pi/3)=1/2$, $\\sin(\\pi/2)=\\tan(\\pi/4)=\\cos(0)=1$ 입니다.`
  };
}

// [6] NEW: Limits Basic (0/0 factorization)
function generateLimitBasicQuestion(rng: () => number): Omit<Question, 'id' | 'choices'> {
  const a = Math.floor(rng() * 4) + 1; // 1 to 4
  const b = Math.floor(rng() * 5) + 1; // 1 to 5

  const B = b - a;
  const C = -a * b;

  const B_str = B === 0 ? '' : (B > 0 ? `+ ${B === 1 ? '' : B}x` : `- ${Math.abs(B) === 1 ? '' : Math.abs(B)}x`);
  const C_str = C === 0 ? '' : (C > 0 ? `+ ${C}` : `- ${Math.abs(C)}`);

  const num_str = `x^2 ${B_str} ${C_str}`;

  return {
    latex: `\\lim_{x \\to ${a}} \\frac{${num_str}}{x - ${a}} = ?`,
    answer: a + b,
    type: 'limit_basic',
    hint: `$x=${a}$를 대입하면 분모가 $0$이 됩니다. 분자도 $0$이 되므로, 분자를 인수분해하여 $(x-${a})$ 약분한 뒤 대입하세요.`
  };
}

// [7] NEW: Continuity
function generateContinuityQuestion(rng: () => number): Omit<Question, 'id' | 'choices'> {
  let A = 0, B = 0, c = 0, K = 0;
  for (let i = 0; i < 50; i++) {
    A = Math.floor(rng() * 3) + 1;
    B = Math.floor(rng() * 5) + 1;
    c = Math.floor(rng() * 3) + 1;
    K = A * c + B - c * c;
    if (K > 0) break;
  }
  if (K <= 0) { A = 2; B = 3; c = 1; K = 4; }

  const latex = `\\text{함수 } f(x) = \\begin{cases} ${A === 1 ? '' : A}x + ${B} & (x < ${c}) \\\\ x^2 + k & (x \\ge ${c}) \\end{cases} \\\\ \\text{가 실수 전체에서 연속일 때, } k = ?`;
  return {
    latex,
    answer: K,
    type: 'continuity',
    hint: `함수가 $x=${c}$에서 연속이려면 좌극한과 우극한이 같아야 합니다. 위 식에 ${c}를 대입한 값과 아래 식에 ${c}를 대입한 값이 같다고 두고 $k$를 구하세요.`
  };
}

// [8] NEW: Sigma Formulas
function generateSigmaBasicQuestion(rng: () => number): Omit<Question, 'id' | 'choices'> {
  const N = Math.floor(rng() * 3) + 4; // 4 to 6
  const A = Math.floor(rng() * 2) + 1; // 1 to 2
  const B = Math.floor(rng() * 3) + 1; // 1 to 3

  const sumK = (N * (N + 1)) / 2;
  const ans = A * sumK + B * N;

  const Astr = A === 1 ? '' : A;
  const latex = `\\sum_{k=1}^{${N}} (${Astr}k + ${B}) = ?`;
  return {
    latex,
    answer: ans,
    type: 'sigma_basic',
    hint: `자연수의 거듭제곱의 합 공식을 떠올려보세요. $\\sum_{k=1}^n k = \\frac{n(n+1)}{2}$ 입니다.`
  };
}

// [9] NEW: Extrema
function generateExtremaQuestion(rng: () => number): Omit<Question, 'id' | 'choices'> {
  const pairs = [
    [1, 3], [1, 5], [3, 5], [2, 4], [2, 6]
  ];
  const pair = pairs[Math.floor(rng() * pairs.length)];
  const A = pair[0];
  const B = pair[1]; // local min at larger root
  const C = Math.floor(rng() * 10) + 1;

  const coef2 = (3 * (A + B)) / 2;
  const coef1 = 3 * A * B;

  const funcStr = `x^3 - ${coef2}x^2 + ${coef1}x + ${C}`;
  const latex = `\\text{함수 } f(x) = ${funcStr} \\text{ 가} \\\\ x=a \\text{ 에서 극솟값을 가질 때, } a = ?`;

  return {
    latex,
    answer: B,
    type: 'extrema',
    hint: `함수 $f(x)$가 극값을 가질 때 $f'(x)=0$이 됩니다. 미분하여 $f'(x)=0$을 만족하는 $x$를 찾고, 그 중 극소가 되는 위치(보통 더 큰 근)를 찾아보세요.`
  };
}

// ─── Main API ──────────────────────────────────────────────────────

export type QType = 'exp' | 'diff' | 'seq' | 'int' | 'log' | 'trig_basic' | 'limit_basic' | 'continuity' | 'sigma_basic' | 'extrema';

const generators = [
  generateType1Question,       // 0: exp
  generateType2Question,       // 1: diff
  generateType3Question,       // 2: seq
  generateType4Question,       // 3: int
  generateType5Question,       // 4: log
  generateTrigBasicQuestion,   // 5: trig_basic
  generateLimitBasicQuestion,  // 6: limit_basic
  generateContinuityQuestion,  // 7: continuity
  generateSigmaBasicQuestion,  // 8: sigma_basic
  generateExtremaQuestion      // 9: extrema
];

export function generateQuestion(seed: string, index: number = 0, level: number = 1, allowedTypes?: QType[]): Question {
  const combinedSeed = hashSeed(`${seed}-${index}`);
  const rng = mulberry32(combinedSeed);

  // Progressive difficulty scaling with smoother curve
  let availableGenerators: ((rng: () => number) => Omit<Question, 'id' | 'choices'>)[] = [];

  if (allowedTypes && allowedTypes.length > 0) {
    const typeToIndexMap: Record<QType, number> = {
      'exp': 0,
      'diff': 1,
      'seq': 2,
      'int': 3,
      'log': 4,
      'trig_basic': 5,
      'limit_basic': 6,
      'continuity': 7,
      'sigma_basic': 8,
      'extrema': 9
    };
    availableGenerators = allowedTypes
      .map(t => generators[typeToIndexMap[t]])
      .filter(Boolean); // Guard against any invalid type names
    if (availableGenerators.length === 0) {
      // Fallback to level-1 defaults if all types were invalid
      availableGenerators = [generators[0], generators[4], generators[5], generators[6]];
    }
  } else {
    if (level === 1) {
      // Level 1: exp, log, trig_basic, limit_basic
      availableGenerators = [generators[0], generators[4], generators[5], generators[6]];
    } else if (level === 2) {
      // Level 2: + diff, continuity
      availableGenerators = [generators[0], generators[4], generators[5], generators[6], generators[1], generators[7]];
    } else if (level === 3) {
      // Level 3: + sigma_basic, seq (drop easiest ones to increase challenge)
      availableGenerators = [generators[5], generators[6], generators[1], generators[7], generators[8], generators[2]];
    } else if (level === 4) {
      // Level 4: + int, extrema
      availableGenerators = [generators[1], generators[7], generators[8], generators[2], generators[3], generators[9]];
    } else {
      // Level 5 (Max): Full variety, all types unlocked
      availableGenerators = generators; // all 10
    }
  }

  let typeIndex = 0;
  let partial: Omit<Question, 'id' | 'choices'> | null = null;

  // Anti-repetition: don't pick the same type as the immediate previous question
  let prevType: string | null = null;
  if (index > 0) {
    const prevSeed = hashSeed(`${seed}-${index - 1}`);
    const prevRng = mulberry32(prevSeed);
    
    // We need to re-evaluate what availableGenerators would have been for index-1
    // For simplicity, we just simulate the selection process for index-1
    // Note: level might have changed, but usually it's same or lower.
    // This is an approximation but very effective for preventing immediate repeats.
    const prevLevel = level; // Approximation
    let prevAvailable: any[] = [];
    if (level === 1) prevAvailable = [generators[0], generators[4], generators[5], generators[6]];
    else if (level === 2) prevAvailable = [generators[0], generators[4], generators[5], generators[6], generators[1], generators[7]];
    else if (level === 3) prevAvailable = [generators[5], generators[6], generators[1], generators[7], generators[8], generators[2]];
    else if (level === 4) prevAvailable = [generators[1], generators[7], generators[8], generators[2], generators[3], generators[9]];
    else prevAvailable = generators;

    const prevTypeIdx = Math.floor(prevRng() * prevAvailable.length);
    const dummy = prevAvailable[prevTypeIdx](prevRng);
    prevType = dummy.type;
  }

  for (let attempts = 0; attempts < 50; attempts++) {
    typeIndex = Math.floor(rng() * availableGenerators.length);
    partial = availableGenerators[typeIndex](rng);

    if (Number.isInteger(partial.answer) && partial.answer > 0) {
      // If we have more than one type available, avoid the previous type
      if (availableGenerators.length > 1 && partial.type === prevType && attempts < 10) {
        continue;
      }
      break;
    }
  }

  if (!partial || !Number.isInteger(partial.answer) || partial.answer <= 0) {
    partial = { latex: "2 + 3 = ?", answer: 5, type: 'exp' };
  }

  const allChoices = generateCSATChoices(partial.answer, rng, partial.type);

  return {
    id: `${seed}-${index}`,
    ...partial,
    choices: allChoices,
  };
}

export function generateQuestionBatch(
  seed: string,
  count: number
): Question[] {
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    // Generate questions matching level logic (assuming level starts scaling later)
    // Actually, batch is just generating standard questions from start. Level scaling is handled locally inside game component based on current combo.
    questions.push(generateQuestion(seed, i, 1)); // We can't know level here unless passed. So we won't use this batch method effectively in game. 
    // The game calls generateQuestion individually with a specific level.
  }
  return questions;
}
