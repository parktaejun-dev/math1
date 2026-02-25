/**
 * MiddleMathGenerator — Cognitive Flow based problem generator for Middle School Math
 * Uses Mulberry32 PRNG for reproducible question generation.
 */

export type CognitiveType = "reflex" | "pattern" | "compute" | "think";

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
        // Cognitive illusion: wrong sign, add instead of subtract
        pool.add(-answer);
        const absAns = Math.abs(answer);
        pool.add(absAns + 2);
        pool.add(-(absAns + 2));
        pool.add(answer > 0 ? answer + 4 : answer - 4);
        pool.add(answer > 0 ? answer - 1 : answer + 1);
    } else if (type === 'exponent_basic') {
        // Cognitive illusion: multiply exponents instead of add, or vice versa
        pool.add(answer * 2);
        pool.add(Math.floor(answer / 2));
        pool.add(answer + 1);
        pool.add(Math.max(1, answer - 1));
    } else if (type === 'prime_factor') {
        pool.add(answer + 1);
        pool.add(Math.max(1, answer - 1));
        pool.add(answer * 2);
    } else if (type === 'linear_eq') {
        // Cognitive illusion: forgot to flip sign when moving term (x = a instead of x = -a)
        if (answer !== 0) pool.add(-answer);
        pool.add(answer + 1);
        pool.add(answer - 1);
        pool.add(answer * 2);
    } else if (type === 'mean_median') {
        pool.add(answer + 1);
        pool.add(Math.max(1, answer - 1));
        pool.add(answer + 2);
    } else if (type === 'pythagoras_svg') {
        // Pythagorean combinations
        // Common mistakes: add instead of sub, or forget to take square root
        pool.add(answer + 1);
        pool.add(Math.max(1, answer - 1));
        pool.add(answer + 2);
    } else if (type === 'inscribed_angle_svg') {
        // Circle angle combinations
        // Common mistakes: half instead of double, or double instead of half
        if (answer % 2 === 0) pool.add(answer / 2);
        pool.add(answer * 2);
        pool.add(answer + 10);
        pool.add(Math.max(10, answer - 10));
    } else {
        // Fallback cognitive distractors
        pool.add(answer > 0 ? -answer : Math.abs(answer) || 1);
        pool.add(answer + 1);
        pool.add(Math.max(1, answer - 1));
        pool.add(answer * 10);
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
    genLinearSlope,
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
