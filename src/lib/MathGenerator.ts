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

// Fixed choices array in ascending order (typical of CSAT)
function generateCSATChoices(answer: number, rng: () => number): number[] {
  if (!Number.isFinite(answer) || !Number.isInteger(answer) || answer <= 0) {
    throw new Error('generateCSATChoices expects positive integer answer');
  }

  // Generate a pool of attractive distractors (common calculation mistakes)
  const pool = new Set<number>();

  // 1. Off-by-one or two errors (addition/subtraction mistakes)
  if (answer > 1) pool.add(answer - 1);
  pool.add(answer + 1);
  if (answer > 2) pool.add(answer - 2);
  pool.add(answer + 2);

  // 2. Multiplication/Division mistakes (e.g. adding instead of multiplying exponents)
  if (answer % 2 === 0 && answer / 2 > 0) pool.add(answer / 2);
  pool.add(answer * 2);
  if (answer % 3 === 0 && answer / 3 > 0) pool.add(answer / 3);
  pool.add(answer * 3);

  // 3. Squaring/Square root mistakes
  const sq = Math.floor(Math.sqrt(answer));
  if (sq * sq === answer && sq > 0) pool.add(sq);
  if (answer <= 50) pool.add(answer * answer); // Prevent distractors from becoming absurdly large

  // Convert pool to array, filter out the answer itself & non-positives
  let distractorArray = Array.from(pool).filter(d => d !== answer && d > 0);

  // Shuffle distractor array to randomly pick 4 tricky distractors
  for (let i = distractorArray.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [distractorArray[i], distractorArray[j]] = [distractorArray[j], distractorArray[i]];
  }

  const selectedDistractors = new Set<number>();
  for (let i = 0; i < distractorArray.length && selectedDistractors.size < 4; i++) {
    selectedDistractors.add(distractorArray[i]);
  }

  // Fallback: If we still need more distractors (e.g. answer is 1 or 2, pool might be small)
  let offset = 1;
  const step = answer < 10 ? 1 : answer < 50 ? 2 : 5;
  while (selectedDistractors.size < 4) {
    let candidate1 = answer - offset * step;
    let candidate2 = answer + offset * step;

    if (candidate1 > 0 && candidate1 !== answer && !selectedDistractors.has(candidate1)) {
      selectedDistractors.add(candidate1);
    }
    if (selectedDistractors.size < 4 && candidate2 !== answer && !selectedDistractors.has(candidate2)) {
      selectedDistractors.add(candidate2);
    }
    offset++;
  }

  // Combine the actual answer and the 4 distractors
  const finalChoices = [answer, ...Array.from(selectedDistractors)];

  // CSAT options are always sorted in ascending order.
  // Because we randomly picked from a pool of both smaller and larger distractors (and completely unrelated numbers),
  // the position of `answer` after sorting will be effectively unpredictable.
  return finalChoices.sort((a, b) => a - b);
}

// ─── Question Generators ───────────────────────────────────────────

// [Type 1] Exponents & Roots (CSAT Question 1)
function generateType1Question(rng: () => number): Omit<Question, 'id' | 'choices'> {
  const subType = Math.floor(rng() * 2);

  if (subType === 0) {
    // Rational exponents: (base1)^(a/q) * (base2)^(b/q) = integer
    // To be elegant, base1 = root^p1, base2 = root^p2
    // CSAT avoids unsimplified fractions and bases like 9^(2/3). 
    // Usually uses bases 2, 4, 8, 16 or 3, 9, 27.
    const roots = [2, 3];
    const root = roots[Math.floor(rng() * roots.length)];
    let q = [2, 3, 4][Math.floor(rng() * 3)];

    let p1 = 1, p2 = 1, a = 1, b = 1;
    let found = false;

    // Find nice combinations where exponents don't cleanly simplify before multiplication,
    // but their sum resolves to an integer.
    for (let attempts = 0; attempts < 100; attempts++) {
      p1 = Math.floor(rng() * 3) + 1; // 1 to 3
      p2 = Math.floor(rng() * 3) + 1; // 1 to 3
      a = Math.floor(rng() * 5) + 1; // 1 to 5
      b = Math.floor(rng() * 5) + 1; // 1 to 5

      // Ensure bases aren't identical to make it more realistic
      if (p1 === p2) continue;

      // Ensure fractions don't trivially simplify to integers before product
      if ((p1 * a) % q === 0 || (p2 * b) % q === 0) continue;

      // Ensure a/q and b/q are irreducible (simplest form) to avoid e.g. 8^(2/4)
      const gcd = (x: number, y: number): number => y === 0 ? x : gcd(y, x % y);
      if (gcd(a, q) !== 1 || gcd(b, q) !== 1) continue;

      // Must result in integer exponent
      if ((p1 * a + p2 * b) % q === 0) {
        found = true;
        break;
      }
    }

    // Fallback if no combo found (extremely rare)
    if (!found) { [p1, a, p2, b, q] = [1, 5, 2, 2, 3]; }

    const base1 = Math.pow(root, p1);
    const base2 = Math.pow(root, p2);
    const finalExp = (p1 * a + p2 * b) / q;
    const ans = Math.pow(root, finalExp);

    return {
      latex: `${base1}^{\\frac{${a}}{${q}}} \\times ${base2}^{\\frac{${b}}{${q}}} = ?`,
      answer: ans,
      type: 'exp',
    };
  } else {
    // Irrational exponents using difference of squares: (root^{\sqrt{d} + a})^{\sqrt{d} - a}
    const root = [2, 3][Math.floor(rng() * 2)];
    // Pick d and a such that d - a^2 > 0 and d is not a perfect square
    const validPairs = [
      { d: 3, a: 1 }, // 3 - 1 = 2 -> root^2
      { d: 5, a: 1 }, // 5 - 1 = 4 -> root^4
      { d: 5, a: 2 }, // 5 - 4 = 1 -> root^1
      { d: 7, a: 2 }, // 7 - 4 = 3 -> root^3
      { d: 6, a: 2 }, // 6 - 4 = 2 -> root^2
    ];
    const pair = validPairs[Math.floor(rng() * validPairs.length)];
    const ans = Math.pow(root, pair.d - pair.a * pair.a);

    return {
      latex: `\\left(${root}^{\\sqrt{${pair.d}} + ${pair.a}}\\right)^{\\sqrt{${pair.d}} - ${pair.a}} = ?`,
      answer: ans,
      type: 'exp',
    };
  }
}

// [Type 2] Polynomial differentiation (CSAT limits)
function generateType2Question(rng: () => number): Omit<Question, 'id' | 'choices'> {
  // f(x) = x^3 + Bx^2 + Cx + D, find lim h->0 (f(a+h)-f(a))/h or lim x->a (f(x)-f(a))/(x-a)
  let B = 0, C = 0, D = 0, a = 0, answer = 0;

  // Ensure the answer is strictly positive to fit CSAT norms
  // Retry loop using the same RNG instead of recursion
  for (let attempts = 0; attempts < 100; attempts++) {
    B = Math.floor(rng() * 5) - 2; // -2 to 2
    C = Math.floor(rng() * 5) - 2; // -2 to 2
    D = Math.floor(rng() * 9) + 1; // 1 to 9
    a = Math.floor(rng() * 3) + 1; // 1 to 3

    // f'(x) = 3x^2 + 2Bx + C
    answer = 3 * a * a + 2 * B * a + C;

    if (answer > 0) break;
  }

  // Fallback in highly improbable case
  if (answer <= 0) { B = 1; C = 1; a = 1; answer = 5; }

  const subType = Math.floor(rng() * 2);

  let funcStr = `x^3`;
  if (B !== 0) funcStr += B > 0 ? ` + ${B === 1 ? '' : B}x^2` : ` - ${Math.abs(B) === 1 ? '' : Math.abs(B)}x^2`;
  if (C !== 0) funcStr += C > 0 ? ` + ${C === 1 ? '' : C}x` : ` - ${Math.abs(C) === 1 ? '' : Math.abs(C)}x`;
  funcStr += ` + ${D}`;

  let limitTex = '';
  if (subType === 0) {
    limitTex = `\\lim_{h \\to 0} \\frac{f(${a}+h) - f(${a})}{h}`;
  } else {
    // Sometimes CSAT asks lim_{x->a} (f(x)-f(a))/(x-a) which is the same as f'(a)
    limitTex = `\\lim_{x \\to ${a}} \\frac{f(x) - f(${a})}{x - ${a}}`;
  }

  return {
    latex: `\\begin{gather*} f(x) = ${funcStr} \\\\ ${limitTex} = ? \\end{gather*}`,
    answer,
    type: 'diff',
  };
}

// [Type 3] Arithmetic series / Sigma properties
function generateType3Question(rng: () => number): Omit<Question, 'id' | 'choices'> {
  const N = Math.floor(rng() * 4) + 7; // 7 ~ 10

  // sum_{k=1}^N (a_k + B) = C, sum_{k=1}^N (a_k - B) = D => find \sum a_k
  // Or sum_{k=1}^N a_k = X, find sum_{k=1}^N (2a_k + c) = ?

  const subType = Math.floor(rng() * 2);

  if (subType === 0) {
    // Given \sum_{k=1}^N a_k = X, find \sum_{k=1}^N (A a_k + B)
    const sumA = Math.floor(rng() * 20) + 10; // 10 to 29
    const A = Math.floor(rng() * 3) + 2; // 2 to 4
    const B = Math.floor(rng() * 4) + 1; // 1 to 4

    const ans = A * sumA + B * N;

    return {
      latex: `\\begin{gather*} \\sum_{k=1}^{${N}} a_k = ${sumA} \\\\ \\sum_{k=1}^{${N}} (${A}a_k + ${B}) = ? \\end{gather*}`,
      answer: ans,
      type: 'seq',
    };
  } else {
    // sum_{k=1}^N (a_k + c) = X => find sum_{k=1}^N a_k
    const ans = Math.floor(rng() * 20) + 10;
    const c = Math.floor(rng() * 3) + 2; // 2 to 4
    const X = ans + c * N;

    return {
      latex: `\\begin{gather*} \\sum_{k=1}^{${N}} (a_k + ${c}) = ${X} \\\\ \\sum_{k=1}^{${N}} a_k = ? \\end{gather*}`,
      answer: ans,
      type: 'seq',
    };
  }
}

// ─── Main API ──────────────────────────────────────────────────────

// [Type 4] Definite Integration (CSAT Polynomials)
function generateType4Question(rng: () => number): Omit<Question, 'id' | 'choices'> {
  let a = 0, b = 0, ans = 0;
  for (let attempts = 0; attempts < 50; attempts++) {
    a = Math.floor(rng() * 3) + 1; // 1 to 3
    b = Math.floor(rng() * 4) + 1; // 1 to 4
    ans = a * a * a + b * a * a;
    if (ans > 0) break;
  }
  return {
    latex: `\\int_{0}^{${a}} (3x^2 + ${2 * b}x) \\,dx = ?`,
    answer: ans,
    type: 'int'
  }
}

// [Type 5] Logarithm Properties
function generateType5Question(rng: () => number): Omit<Question, 'id' | 'choices'> {
  let base = [2, 3][Math.floor(rng() * 2)];
  let ans = Math.floor(rng() * 4) + 2; // 2 to 5
  let p1 = Math.floor(rng() * (ans - 1)) + 1;
  let p2 = ans - p1;
  let b = Math.pow(base, p1);
  let c = Math.pow(base, p2);

  const isSub = Math.floor(rng() * 2) === 0;
  if (isSub) {
    const sumAns = p1;
    const p2_new = Math.floor(rng() * 3) + 1;
    const p1_new = sumAns + p2_new;
    b = Math.pow(base, p1_new);
    c = Math.pow(base, p2_new);
    return {
      latex: `\\log_{${base}} ${b} - \\log_{${base}} ${c} = ?`,
      answer: sumAns,
      type: 'log'
    };
  } else {
    return {
      latex: `\\log_{${base}} ${b} + \\log_{${base}} ${c} = ?`,
      answer: ans,
      type: 'log'
    };
  }
}

// ─── Main API ──────────────────────────────────────────────────────

export type QType = 'exp' | 'diff' | 'seq' | 'int' | 'log';

const generators = [generateType1Question, generateType2Question, generateType3Question, generateType4Question, generateType5Question];

export function generateQuestion(seed: string, index: number = 0, level: number = 1): Question {
  // Create unique seed for each question index
  const combinedSeed = hashSeed(`${seed}-${index}`);
  const rng = mulberry32(combinedSeed);

  // Limit generators based on level
  let availableGenerators = [generators[0]];
  if (level === 2) availableGenerators = [generators[0], generators[1]];
  else if (level === 3) availableGenerators = [generators[1], generators[2], generators[3]];
  else if (level === 4) availableGenerators = [generators[2], generators[3], generators[4]];
  else if (level >= 5) availableGenerators = [generators[3], generators[4]];

  // Select question type
  let typeIndex = 0;
  let partial: Omit<Question, 'id' | 'choices'> | null = null;

  // Retry loop to ensure answer is an integer and positive.
  for (let attempts = 0; attempts < 50; attempts++) {
    typeIndex = Math.floor(rng() * availableGenerators.length);
    partial = availableGenerators[typeIndex](rng);

    if (Number.isInteger(partial.answer) && partial.answer > 0) {
      break;
    }
  }

  // Fallback if somehow failed to get valid question
  if (!partial || !Number.isInteger(partial.answer) || partial.answer <= 0) {
    partial = { latex: "2 + 3 = ?", answer: 5, type: 'exp' };
  }

  // Generate sorted choices matching CSAT style
  const allChoices = generateCSATChoices(partial.answer, rng);

  return {
    id: `${seed}-${index}`,
    ...partial,
    choices: allChoices,
  };
}

// Generate a batch of questions
export function generateQuestionBatch(
  seed: string,
  count: number
): Question[] {
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    questions.push(generateQuestion(seed, i));
  }
  return questions;
}

