/**
 * MiddleMathGenerator — Cognitive Flow based problem generator for Middle School Math
 * Uses Mulberry32 PRNG for reproducible question generation.
 */

export type CognitiveType = "compute" | "pattern" | "geometry" | "inference" | "structure" | "sense" | "judgment" | "backtrack" | "logical" | "reflex" | "think";

export interface MiddleQuestion {
    id: string;
    latex: string;
    answer: number;
    choices: number[];
    level: 1 | 2 | 3 | 4 | 5;
    cognitiveType: CognitiveType;
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

// Fixed choices array emphasizing Cognitive Distractors (Not just numerical proximity)
function generateCognitiveDistractors(answer: number, rng: () => number, type: string): number[] {
    const pool = new Set<number>();

    if (type === 'quadrant') {
        [1, 2, 3, 4].forEach(v => { if (v !== answer) pool.add(v); });
    } else if (type === 'sign_integer') {
        pool.add(-answer);
        const absAns = Math.abs(answer);
        pool.add(absAns + 2);
        pool.add(-(absAns + 2));
        pool.add(answer > 0 ? answer + 4 : answer - 4);
    } else if (type === 'exponent_basic') {
        pool.add(answer * 2);
        pool.add(Math.floor(answer / 2));
    } else if (type === 'prime_factor') {
        pool.add(answer + 1);
        pool.add(Math.max(1, answer - 1));
        pool.add(answer * 2);
    } else if (type === 'linear_eq') {
        if (answer !== 0) pool.add(-answer);
        pool.add(answer + 1);
        pool.add(answer - 1);
    } else if (type === 'mean_median') {
        pool.add(answer + 1);
        pool.add(Math.max(1, answer - 1));
    } else if (type === 'pythagoras_svg') {
        pool.add(answer + 1);
        pool.add(Math.max(1, answer - 1));
        pool.add(answer + 2);
    } else if (type === 'inscribed_angle_svg') {
        if (answer % 2 === 0) pool.add(answer / 2);
        pool.add(answer * 2);
        pool.add(answer + 10);
        pool.add(Math.max(10, answer - 10));
    } else if (type === 'divisor_count') {
        // Cognitive illusion: simple sum of exponents, missing the +1
        pool.add(Math.max(1, answer - 1));
        pool.add(Math.max(1, answer - 2));
        pool.add(answer + 1);
        pool.add(answer + 2);
    } else if (type === 'quadratic_roots' || type === 'quadratic_vertex') {
        // Sign error on roots / vertex
        if (answer !== 0) pool.add(-answer);
        pool.add(answer + 1);
        pool.add(answer - 1);
    } else if (type === 'triangle_outer') {
        // Missing the 180 restriction or wrong complementary angle
        pool.add(180 - answer);
        pool.add(answer + 10);
        pool.add(Math.max(10, answer - 10));
    } else if (type === 'sequence') {
        // Continuing with wrong delta
        pool.add(answer + 2);
        pool.add(answer - 2);
        pool.add(answer + 1);
    } else if (type === 'probability') {
        pool.add(answer * 2);
        pool.add(Math.max(1, Math.floor(answer / 2)));
        pool.add(answer + 1);
    } else if (type === 'logical_condition' || type === 'backtrack_basic') {
        // Adding/subtracting instead of multiplying/dividing, off-by-one
        pool.add(answer + 1);
        pool.add(Math.max(1, answer - 1));
        pool.add(answer * 2);
        if (answer % 2 === 0) pool.add(answer / 2);
    } else {
        // Fallback cognitive distractors
        pool.add(answer > 0 ? -answer : Math.abs(answer) || 1);
        pool.add(answer + 1);
        pool.add(Math.max(1, answer - 1));
    }

    // Filter to valid distinct distractors
    let distractorArray = Array.from(pool).filter(d =>
        d !== answer && Number.isInteger(d) && !Number.isNaN(d)
    );

    // Shuffle distractors
    for (let i = distractorArray.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [distractorArray[i], distractorArray[j]] = [distractorArray[j], distractorArray[i]];
    }

    // Pick top up to 4
    const selectedDistractors = new Set<number>();
    for (let i = 0; i < distractorArray.length && selectedDistractors.size < 4; i++) {
        selectedDistractors.add(distractorArray[i]);
    }

    // Fill remaining if needed with sequential offsets
    let offset = 1;
    while (selectedDistractors.size < 4) {
        const candidate1 = answer + offset;
        const candidate2 = Math.max(1, answer - offset); // Avoid 0 if possible, but fine if needed long term
        if (!selectedDistractors.has(candidate1) && candidate1 !== answer) selectedDistractors.add(candidate1);
        if (selectedDistractors.size < 4 && !selectedDistractors.has(candidate2) && candidate2 !== answer) selectedDistractors.add(candidate2);
        offset++;
    }

    const finalChoices = [answer, ...Array.from(selectedDistractors)].sort((a, b) => a - b);
    return finalChoices;
}

// ─── Question Generators ───────────────────────────────────────────

// [Level 1 - reflex] Quadrant
function genQuadrant(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    const x = (Math.floor(rng() * 5) + 1) * (rng() > 0.5 ? 1 : -1);
    const y = (Math.floor(rng() * 5) + 1) * (rng() > 0.5 ? 1 : -1);
    let ans = 0;
    if (x > 0 && y > 0) ans = 1;
    else if (x < 0 && y > 0) ans = 2;
    else if (x < 0 && y < 0) ans = 3;
    else if (x > 0 && y < 0) ans = 4;

    return {
        latex: `\\text{점 } (${x}, ${y}) \\text{ 은 제 몇 사분면?}`,
        answer: ans,
        type: 'quadrant',
        cognitiveType: 'reflex',
        level: 1,
        hint: `x, y의 부호(+, -)를 보고 직관적으로 판단하세요.`
    };
}

// [Level 1 - reflex] Sign Integer Addition
function genSignInteger(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    const a = (Math.floor(rng() * 9) + 1) * (rng() > 0.5 ? 1 : -1);
    const b = (Math.floor(rng() * 9) + 1) * (rng() > 0.5 ? 1 : -1);
    const ans = a + b;

    const bStr = b < 0 ? `(${b})` : `${b}`;
    return {
        latex: `${a} + ${bStr} = ?`,
        answer: ans,
        type: 'sign_integer',
        cognitiveType: 'reflex',
        level: 1
    };
}

// [Level 2 - pattern] Exponent Basic
function genExponentBasic(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    const base = [2, 3, 5, 7][Math.floor(rng() * 4)];
    const e1 = Math.floor(rng() * 4) + 2;
    const e2 = Math.floor(rng() * 4) + 2;
    const ans = e1 + e2;

    return {
        latex: `${base}^{${e1}} \\times ${base}^{${e2}} = ${base}^x \\quad (x=?)`,
        answer: ans,
        type: 'exponent_basic',
        cognitiveType: 'pattern',
        level: 2,
        hint: `밑이 같을 때 곱셈은 지수의 덧셈입니다.`
    };
}

// [Level 2 - compute] Linear Equation
function genLinearEq(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    const a = Math.floor(rng() * 4) + 2; // 2~5
    const x = (Math.floor(rng() * 5) + 1) * (rng() > 0.5 ? 1 : -1); // -5~5, no 0
    const b = Math.floor(rng() * 10) + 1;
    const c = a * x + b;

    return {
        latex: `${a}x + ${b} = ${c} \\quad (x=?)`,
        answer: x,
        type: 'linear_eq',
        cognitiveType: 'compute',
        level: 2,
        hint: `항을 이항할 때 부호가 바뀝니다.`
    };
}

// [Level 2 - pattern] Divisor Count
function genDivisorCount(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    const primes = [2, 3, 5, 7];
    const p1 = primes[Math.floor(rng() * primes.length)];
    let p2 = primes[Math.floor(rng() * primes.length)];
    while (p1 === p2) p2 = primes[Math.floor(rng() * primes.length)];

    const e1 = Math.floor(rng() * 3) + 1; // 1~3
    const e2 = Math.floor(rng() * 3) + 1; // 1~3

    const ans = (e1 + 1) * (e2 + 1);

    return {
        latex: `${p1}^{${e1}} \\times ${p2}^{${e2}}\\text{의 약수의 개수는?}`,
        answer: ans,
        type: 'divisor_count',
        cognitiveType: 'pattern',
        level: 2,
        hint: `소인수분해된 형태에서 각 지수에 1을 더해 곱합니다.`
    };
}

// [Level 2 - sense] Finite Decimal
function genFiniteDecimal(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    // 1 for finite, 2 for infinite (repeating)
    const isFinite = rng() > 0.5;
    let num = Math.floor(rng() * 9) + 1;
    let den = 1;

    if (isFinite) {
        // Denominator must only have prime factors 2 and 5 after simplification
        const twos = Math.floor(rng() * 3); // 0~2
        const fives = Math.floor(rng() * 3); // 0~2
        den = (2 ** twos) * (5 ** fives);
        if (den === 1) den = Math.random() > 0.5 ? 2 : 5; // ensure it's a fraction
        // Optional: multiplier to obfuscate
        const mult = [3, 7][Math.floor(rng() * 2)];
        num *= mult;
        den *= mult;
    } else {
        // Denominator must have factors other than 2 or 5
        const twos = Math.floor(rng() * 2);
        const badPrime = [3, 7, 11][Math.floor(rng() * 3)];
        den = (2 ** twos) * badPrime;
        // Ensure numerator doesn't cancel the bad prime
        while (num % badPrime === 0) num++;
    }

    return {
        latex: `\\frac{${num}}{${den}} \\text{ 은 유한소수(1)인가, 무한소수(2)인가?}`,
        answer: isFinite ? 1 : 2,
        type: 'finite_decimal',
        cognitiveType: 'sense',
        level: 2,
        hint: `기약분수로 나타냈을 때 분모의 소인수가 2나 5뿐이어야 유한소수입니다.`
    };
}

// [Level 1 - geometry] Triangle Outer Angle
function genTriangleOuter(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    const a = Math.floor(rng() * 5 + 3) * 10; // 30, 40, 50, 60, 70, 80
    const b = Math.floor(rng() * 4 + 2) * 10; // 20, 30, 40, 50
    const ans = a + b;

    return {
        latex: `\\text{삼각형의 두 내각이 } ${a}^\\circ, ${b}^\\circ \\text{ 일 때, 나머지 한 내각의 외각은?}`,
        answer: ans,
        type: 'triangle_outer',
        cognitiveType: 'geometry',
        level: 1,
        hint: `한 삼각형의 외각의 크기는 그와 이웃하지 않는 두 내각의 합과 같습니다.`
    };
}

// [Level 3 - compute] Mean / Median
function genMeanMedian(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    const isMean = rng() > 0.5;
    // Generate 3 numbers
    const n1 = Math.floor(rng() * 10) + 1;
    const n2 = n1 + Math.floor(rng() * 5) + 1; // strictly greater
    const n3 = n2 + Math.floor(rng() * 5) + 1; // strictly greater

    // Shuffle them so they aren't sorted
    const arr = [n1, n2, n3];
    for (let i = 2; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    const typeStr = isMean ? '\\text{평균}' : '\\text{중앙값}';
    let ans = n2; // median is always the middle value when sorted
    if (isMean) {
        // Adjust the numbers so mean is an integer
        const remainder = (arr[0] + arr[1] + arr[2]) % 3;
        if (remainder !== 0) {
            arr[1] += (3 - remainder); // Adjust one item
        }
        ans = Math.floor((arr[0] + arr[1] + arr[2]) / 3);
    }

    return {
        latex: `\\text{세 수 } ${arr[0]}, ${arr[1]}, ${arr[2]}\\text{ 의 ${typeStr}은?}`,
        answer: ans,
        type: 'mean_median',
        cognitiveType: 'compute',
        level: 3,
        hint: isMean ? `세 수의 합을 3으로 나눕니다.` : `크기 순으로 나열했을 때 한가운데 있는 값입니다.`
    };
}

// [Level 4 - structure] Probability Fundamentals
function genProbability(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    const scenarios = [
        { desc: `동전 1개와 주사위 1개를 던질 때 일어나는 모든 경우의 수`, ans: 2 * 6 },
        { desc: `주사위 2개를 던질 때 눈의 합이 4가 되는 경우의 수`, ans: 3 }, // (1,3), (2,2), (3,1)
        { desc: `A, B, C 세 사람을 일렬로 세우는 경우의 수`, ans: 6 }, // 3!
        { desc: `4명 중 반장, 부반장을 각각 1명씩 뽑는 경우의 수`, ans: 12 } // 4*3
    ];
    const scenario = scenarios[Math.floor(rng() * scenarios.length)];

    return {
        latex: `\\text{${scenario.desc}?}`,
        answer: scenario.ans,
        type: 'probability',
        cognitiveType: 'structure',
        level: 4,
        hint: `각각 일어나는 사건인지 동시에 일어나는 사건인지 구분하여 곱의 법칙을 적용하세요.`
    };
}

// [Level 3 - think] Linear Slope
function genLinearSlope(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    let x1, y1, x2, y2, slope;
    do {
        x1 = Math.floor(rng() * 5);
        x2 = x1 + Math.floor(rng() * 3) + 1; // x2 > x1 Ensure non-zero delta X
        slope = (Math.floor(rng() * 3) + 1) * (rng() > 0.5 ? 1 : -1);
        y1 = Math.floor(rng() * 5);
        y2 = y1 + slope * (x2 - x1);
    } while (!Number.isInteger(slope) || slope === 0);

    return {
        latex: `\\text{두 점 } (${x1}, ${y1}), (${x2}, ${y2}) \\text{ 를 지나는 직선의 기울기는?}`,
        answer: slope,
        type: 'linear_slope',
        cognitiveType: 'think',
        level: 3
    };
}

// [Level 3 - pattern] Factorization
function genFactorization(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    // Basic x^2 + (a+b)x + ab
    const r1 = (Math.floor(rng() * 5) + 1) * (rng() > 0.5 ? 1 : -1);
    const r2 = (Math.floor(rng() * 5) + 1) * (rng() > 0.5 ? 1 : -1);

    // x^2 + sum*x + prod
    const sum = r1 + r2;
    const prod = r1 * r2;

    // Ask for the missing constant term for a perfect square if r1 == r2
    // Otherwise ask to find the sum from the product (e.g. x^2 + ?x + prod = (x+r1)(x+r2))

    let latex = '';
    let ans = 0;
    let hint = '';

    if (Math.abs(r1) === Math.abs(r2)) {
        // Perfect square: x^2 + 2ax + a^2
        const a = Math.abs(r1);
        const sign = r1 > 0 ? '+' : '-';
        latex = `x^2 ${sign} ${2 * a}x + \\square \\text{ 가 완전제곱식일 때 } \\square\\text{는?}`;
        ans = a * a;
        hint = `완전제곱식이 되려면 일차항 계수의 절반의 제곱이 상수항이 되어야 합니다.`;
    } else {
        const signProd = prod > 0 ? '+' : '';
        latex = `x^2 + \\square x ${signProd} ${prod} = (x ${r1 > 0 ? '+' : ''}${r1})(x ${r2 > 0 ? '+' : ''}${r2}) \\quad (\\square=?)`;
        ans = sum;
        hint = `두 상수항의 합이 일차항의 계수가 되고, 곱이 상수항이 됩니다.`;
    }

    return {
        latex,
        answer: ans,
        type: 'factorization',
        cognitiveType: 'pattern',
        level: 3,
        hint
    };
}

// [Level 4 - think] Quadratic Roots
function genQuadraticRoots(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    const root1 = (Math.floor(rng() * 5) + 1) * (rng() > 0.5 ? 1 : -1);
    let root2 = (Math.floor(rng() * 5) + 1) * (rng() > 0.5 ? 1 : -1);
    while (root1 === root2) root2 = (Math.floor(rng() * 5) + 1) * (rng() > 0.5 ? 1 : -1);

    const sum = root1 + root2;
    const prod = root1 * root2;

    const signSum = -sum > 0 ? '+' : '';
    const signProd = prod > 0 ? '+' : '';

    const askSum = rng() > 0.5;

    return {
        latex: `x^2 ${signSum} ${-sum === 0 ? '' : -sum + 'x'} ${signProd} ${prod} = 0 \\text{ 의 두 근의 ${askSum ? '합' : '곱'}은?}`,
        answer: askSum ? sum : prod,
        type: 'quadratic_roots',
        cognitiveType: 'think',
        level: 4,
        hint: `근과 계수의 관계: ax^2+bx+c=0 에서 두 근의 합은 -b/a, 곱은 c/a 입니다.`
    };
}

// [Level 4 - think] Quadratic Vertex
function genQuadraticVertex(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    // y = a(x-p)^2 + q
    const a = (Math.floor(rng() * 3) + 1) * (rng() > 0.5 ? 1 : -1);
    const p = (Math.floor(rng() * 4) + 1) * (rng() > 0.5 ? 1 : -1);
    const q = (Math.floor(rng() * 5) + 1) * (rng() > 0.5 ? 1 : -1);

    // Expanded form: y = ax^2 - 2apx + ap^2 + q
    const b = -2 * a * p;
    // We will just present vertex form to test translation understanding

    const signP = -p > 0 ? '+' : '';
    const signQ = q > 0 ? '+' : '';

    const askX = rng() > 0.5;

    return {
        latex: `y = ${a === 1 ? '' : a === -1 ? '-' : a}(x ${signP} ${-p})^2 ${signQ} ${q} \\text{ 의 꼭짓점의 ${askX ? 'x' : 'y'}좌표는?}`,
        answer: askX ? p : q,
        type: 'quadratic_vertex',
        cognitiveType: 'think',
        level: 4,
        hint: `y = a(x-p)^2 + q 형태에서 꼭짓점은 (p, q) 입니다.`
    };
}

// [Level 2 - inference] Sequences
function genSequence(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    const isArithmetic = rng() > 0.5;

    let a1 = Math.floor(rng() * 10) + 1;
    let a2, a3, ans;

    if (isArithmetic) {
        const d = (Math.floor(rng() * 5) + 2) * (rng() > 0.5 ? 1 : -1);
        a2 = a1 + d;
        a3 = a2 + d;
        ans = a3 + d;
    } else {
        const r = (Math.floor(rng() * 2) + 2) * (rng() > 0.5 ? 1 : -1); // 2, 3, -2, -3
        a1 = Math.floor(rng() * 3) + 1; // start small
        a2 = a1 * r;
        a3 = a2 * r;
        ans = a3 * r;
    }

    return {
        latex: `\\text{다음 수열의 빈칸에 알맞은 수는?} \\quad ${a1}, ${a2}, ${a3}, \\square`,
        answer: ans,
        type: 'sequence',
        cognitiveType: 'inference',
        level: 2,
        hint: `수들이 일정한 값만큼 변하는 규칙(등차 또는 등비)을 찾으세요.`
    };
}

// [Level 3 - sense] Proportion
function genProportion(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    // a : b = c : d => ad = bc
    const a = Math.floor(rng() * 5) + 2;
    const b = Math.floor(rng() * 5) + 2;
    const mult = Math.floor(rng() * 4) + 2;

    const c = a * mult;
    const d = b * mult;

    // Choose which one is missing
    const missingIdx = Math.floor(rng() * 4);
    let latex = '';
    let ans = 0;

    if (missingIdx === 0) { latex = `x : ${b} = ${c} : ${d} \\quad (x=?)`; ans = a; }
    else if (missingIdx === 1) { latex = `${a} : x = ${c} : ${d} \\quad (x=?)`; ans = b; }
    else if (missingIdx === 2) { latex = `${a} : ${b} = x : ${d} \\quad (x=?)`; ans = c; }
    else { latex = `${a} : ${b} = ${c} : x \\quad (x=?)`; ans = d; }

    return {
        latex,
        answer: ans,
        type: 'proportion',
        cognitiveType: 'sense',
        level: 3,
        hint: `비례식의 내항의 곱과 외항의 곱은 같습니다.`
    };
}

// [Level 4 - judgment] Irrational Judgment
function genIrrational(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    const rationals = ['\\sqrt{4}', '\\sqrt{0.09}', '3.14', '-\\frac{1}{3}', '0.\\dot{2}'];
    const irrationals = ['\\sqrt{3}', '\\pi', '-\\sqrt{5}', '1 + \\sqrt{2}'];

    const isAskIrrational = rng() > 0.5;

    // Pick 3 from the wrong set, 1 from the correct set
    const wrongSet = isAskIrrational ? rationals : irrationals;
    const correctSet = isAskIrrational ? irrationals : rationals;

    // Shuffle and pick
    const pickedWrongs = [...wrongSet].sort(() => rng() - 0.5).slice(0, 3);
    const pickedCorrect = correctSet[Math.floor(rng() * correctSet.length)];

    const options = [...pickedWrongs, pickedCorrect].sort(() => rng() - 0.5);
    const ansIdx = options.indexOf(pickedCorrect) + 1; // 1-based Correct Choice

    let latex = `\\text{다음 중 ${isAskIrrational ? '무리수' : '유리수'}인 것은?} \\\\ `;
    options.forEach((opt, idx) => {
        latex += `(${idx + 1}) \\; ${opt} \\quad `;
    });

    return {
        latex,
        answer: ansIdx,
        type: 'irrational',
        cognitiveType: 'judgment',
        level: 4,
        hint: `무리수는 순환하지 않는 무한소수입니다. 근호 안의 수가 제곱수이면 유리수입니다.`
    };
}

// [Level 3 - judgment] Inequality
function genInequality(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    // We will ask for the correct inequality given a < b
    const options = [
        { tex: '-a < -b', correct: false },
        { tex: 'a+2 > b+2', correct: false },
        { tex: '-2a > -2b', correct: true }, // The right one
        { tex: '\\frac{a}{3} > \\frac{b}{3}', correct: false },
        { tex: 'a-5 > b-5', correct: false },
        { tex: '-a+1 > -b+1', correct: true }
    ];

    const correctOpts = options.filter(o => o.correct);
    const wrongOpts = options.filter(o => !o.correct);

    const pickedCorrect = correctOpts[Math.floor(rng() * correctOpts.length)];
    const pickedWrongs = [...wrongOpts].sort(() => rng() - 0.5).slice(0, 3);

    const finalOptions = [...pickedWrongs, pickedCorrect].sort(() => rng() - 0.5);
    const ansIdx = finalOptions.indexOf(pickedCorrect) + 1;

    let latex = `a < b \\text{ 일 때, 다음 중 옳은 것은?} \\\\ `;
    finalOptions.forEach((opt, idx) => {
        latex += `(${idx + 1}) \\; ${opt.tex} \\quad `;
    });

    return {
        latex,
        answer: ansIdx,
        type: 'inequality',
        cognitiveType: 'judgment',
        level: 3,
        hint: `음수를 곱하거나 나눌 때만 부등호의 방향이 바뀝니다.`
    };
}

// [Level 4 - geometry] Similarity Ratio
function genSimilarity(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    // Length ratio a : b -> Area ratio a^2 : b^2 -> Volume ratio a^3 : b^3
    const isArea = rng() > 0.5;
    const a = Math.floor(rng() * 3) + 2; // 2~4
    let b = Math.floor(rng() * 4) + 2; // 2~5
    while (a === b) b = Math.floor(rng() * 4) + 2;

    const ans = isArea ? b * b : b * b * b;
    const fromVal = isArea ? a * a : a * a * a;

    const typeStr = isArea ? '넓이의 비' : '부피의 비';

    return {
        latex: `\\text{닮음비가 } ${a}:${b} \\text{인 두 입체도형의 ${typeStr}가 } ${fromVal}:x \\text{ 일 때, } x\\text{는?}`,
        answer: ans,
        type: 'similarity',
        cognitiveType: 'geometry',
        level: 4,
        hint: `넓이의 비는 닮음비의 제곱, 부피의 비는 닮음비의 세제곱입니다.`
    };
}

// [Level 3 - backtrack] Basic Backtrack
function genBacktrackBasic(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    const x = Math.floor(rng() * 10) + 2; // 2~11

    // op1: add or sub, op2: mul
    const addVal = (Math.floor(rng() * 5) + 1) * (rng() > 0.5 ? 1 : -1);
    const mulVal = Math.floor(rng() * 3) + 2; // 2~4

    const isMulFirst = rng() > 0.5;

    let result = 0;
    let desc = '';

    if (isMulFirst) {
        result = (x * mulVal) + addVal;
        const addStr = addVal > 0 ? `${addVal}을 더했더니` : `${Math.abs(addVal)}을 뺐더니`;
        desc = `어떤 수에 ${mulVal}을 곱하고 ${addStr} ${result}이(가) 되었다. 어떤 수는?`;
    } else {
        result = (x + addVal) * mulVal;
        const addStr = addVal > 0 ? `${addVal}을 더한 후` : `${Math.abs(addVal)}을 뺀 후`;
        desc = `어떤 수에 ${addStr} ${mulVal}을 곱했더니 ${result}이(가) 되었다. 어떤 수는?`;
    }

    return {
        latex: `\\text{${desc}}`,
        answer: x,
        type: 'backtrack_basic',
        cognitiveType: 'backtrack',
        level: 3,
        hint: `결과에서부터 거꾸로 계산하세요. (더하기는 빼기로, 곱하기는 나누기로)`
    };
}

// [Level 4 - logical] Logical Condition
function genLogicalCondition(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    const start = Math.floor(rng() * 10) + 10; // 10~19
    const end = start + Math.floor(rng() * 10) + 15; // +15~24, so roughly 25~43

    const mod1 = 2; // Even
    const mod2 = 3; // Multiple of 3

    let count = 0;
    for (let i = start; i <= end; i++) {
        if (i % mod1 === 0 && i % mod2 === 0) count++;
    }

    return {
        latex: `\\text{${start}부터 ${end}까지의 자연수 중 짝수이면서 3의 배수인 수의 개수는?}`,
        answer: count,
        type: 'logical_condition',
        cognitiveType: 'logical',
        level: 4,
        hint: `짝수이면서 3의 배수라는 것은 6의 배수를 의미합니다.`
    };
}

// [Level 4 - think] Pythagoras (Triggers SVG geometry)
function genPythagorasSvg(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    // Triplets
    const triplets = [
        [3, 4, 5],
        [5, 12, 13],
        [6, 8, 10],
        [8, 15, 17]
    ];
    const t = triplets[Math.floor(rng() * triplets.length)];
    const isHypotenuse = rng() > 0.5; // True = ask for C, False = ask for A/B

    let answer = 0;
    let params = '';
    if (isHypotenuse) {
        answer = t[2];
        params = `${t[0]},${t[1]},?`; // a, b, c
    } else {
        answer = t[0];
        params = `?,${t[1]},${t[2]}`;
    }

    // We use latex string to pass the parameters to the frontend renderer safely
    return {
        latex: `[SVG_PYTHAGORAS:${params}]`, // Parsed by the UI explicitly
        answer: answer,
        type: 'pythagoras_svg',
        cognitiveType: 'think',
        level: 4,
        hint: `피타고라스의 정리 $a^2 + b^2 = c^2$ (빗변의 직각삼각형)`
    };
}

// [Level 5 - reflex] Special Angles Fever
function genSpecialAngleFever(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    const terms = [
        { tex: '\\sin 30^\\circ', val: 0.5 },
        { tex: '\\cos 60^\\circ', val: 0.5 },
        { tex: '\\tan 45^\\circ', val: 1 },
        { tex: '\\sin 90^\\circ', val: 1 },
        { tex: '\\cos 0^\\circ', val: 1 }
    ];
    const t1 = terms[Math.floor(rng() * terms.length)];
    const c1 = t1.val === 0.5 ? 2 * (Math.floor(rng() * 3) + 1) : Math.floor(rng() * 3) + 1;
    const ans = c1 * t1.val;

    return {
        latex: `${c1 === 1 ? '' : c1}${t1.tex} = ?`,
        answer: ans,
        type: 'special_angle_fever',
        cognitiveType: 'reflex',
        level: 5
    };
}

// [Level 5 - reflex] Inscribed Angle SVG
function genInscribedAngleSvg(rng: () => number): Omit<MiddleQuestion, 'id' | 'choices'> {
    const inscribed = Math.floor(rng() * 5 + 3) * 10; // 30, 40, 50, 60, 70
    const center = inscribed * 2;

    const askCenter = rng() > 0.5;
    const answer = askCenter ? center : inscribed;
    const params = askCenter ? `${inscribed},?` : `?,${center}`; // inscribed, center

    return {
        latex: `[SVG_INSCRIBED:${params}]`,
        answer: answer,
        type: 'inscribed_angle_svg',
        cognitiveType: 'reflex',
        level: 5,
        hint: `원주각은 중심각의 절반입니다.`
    };
}

// ─── Main API ──────────────────────────────────────────────────────

const generators = [
    genQuadrant,
    genSignInteger,
    genExponentBasic,
    genLinearEq,
    genDivisorCount,
    genFiniteDecimal,
    genTriangleOuter,
    genMeanMedian,
    genProbability,
    genLinearSlope,
    genFactorization,
    genQuadraticRoots,
    genQuadraticVertex,
    genSequence,
    genProportion,
    genIrrational,
    genInequality,
    genSimilarity,
    genBacktrackBasic,
    genLogicalCondition,
    genPythagorasSvg,
    genSpecialAngleFever,
    genInscribedAngleSvg
];

export function generateMiddleQuestion(seed: string, index: number, allowedTypes?: CognitiveType[]): MiddleQuestion {
    const combinedSeed = hashSeed(`${seed}-${index}`);
    const rng = mulberry32(combinedSeed);

    // Filter available generators by allowed CognitiveTypes, if specified
    let available = generators;
    if (allowedTypes && allowedTypes.length > 0) {
        available = generators.filter(g => {
            // Create a dummy run to check CognitiveType
            const dummy = g(rng);
            return allowedTypes.includes(dummy.cognitiveType);
        });
        if (available.length === 0) available = generators; // Fallback
    }

    let partial: Omit<MiddleQuestion, 'id' | 'choices'> | null = null;
    for (let attempts = 0; attempts < 50; attempts++) {
        const typeIndex = Math.floor(rng() * available.length);
        partial = available[typeIndex](rng);
        if (Number.isInteger(partial.answer) && !Number.isNaN(partial.answer)) {
            break; // Safe math generated
        }
    }

    if (!partial) {
        // Failsafe
        partial = { latex: "1 + 1 = ?", answer: 2, type: 'sign_integer', cognitiveType: 'reflex', level: 1 };
    }

    const choices = generateCognitiveDistractors(partial.answer, rng, partial.type);

    return {
        id: `m-${seed}-${index}`,
        ...partial,
        choices
    };
}
