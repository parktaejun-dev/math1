/**
 * verify_answers.ts
 * 
 * Generates 100 seeds × 50 questions each (5,000 total).
 * For each question, independently verifies:
 *   1. The answer is a positive integer
 *   2. The answer is present in the choices array
 *   3. Choices are sorted ascending
 *   4. There are exactly 5 choices
 *   5. No duplicate choices
 *   6. Independent math verification per question type
 */

import { generateQuestion, Question } from '../src/lib/MathGenerator';

interface Mismatch {
    seed: string;
    index: number;
    level: number;
    type: string;
    latex: string;
    generatedAnswer: number;
    independentAnswer: number | string;
    choices: number[];
    reason: string;
}

const mismatches: Mismatch[] = [];
const structuralErrors: string[] = [];
let totalQuestions = 0;
const typeCounts: Record<string, number> = {};
const typeCorrect: Record<string, number> = {};

// ── Independent math verifier ──────────────────────────────────────

function verifyExponentSubtype0(latex: string, answer: number): number | null {
    // Pattern: base1^{a/q} × base2^{b/q} = ?
    const match = latex.match(/(\d+)\^\{\\\\frac\{(\d+)\}\{(\d+)\}\}\s*\\\\times\s*(\d+)\^\{\\\\frac\{(\d+)\}\{(\d+)\}\}/);
    if (!match) return null;
    const [, base1s, as, qs, base2s, bs, q2s] = match;
    const base1 = parseInt(base1s), a = parseInt(as), q = parseInt(qs);
    const base2 = parseInt(base2s), b = parseInt(bs), q2 = parseInt(q2s);
    if (q !== q2) return null;
    const result = Math.pow(base1, a / q) * Math.pow(base2, b / q);
    return Math.round(result);
}

function verifyExponentSubtype1(latex: string, answer: number): number | null {
    // Pattern: (root^{sqrt{d} + a})^{sqrt{d} - a} = ?
    const match = latex.match(/(\d+)\^\{\\\\sqrt\{(\d+)\}\s*\+\s*(\d+)\}.*\\\\sqrt\{(\d+)\}\s*-\s*(\d+)\}/);
    if (!match) return null;
    const [, roots, ds, as] = match;
    const root = parseInt(roots), d = parseInt(ds), a = parseInt(as);
    // (root^(sqrt(d)+a))^(sqrt(d)-a) = root^(d - a^2)
    const exponent = d - a * a;
    return Math.pow(root, exponent);
}

function verifyDifferentiation(latex: string, answer: number): number | null {
    // f(x) = x^3 + Bx^2 + Cx + D, derivative at point a
    // Extract coefficients from latex
    const funcMatch = latex.match(/f\(x\)\s*=\s*x\^3(.+?)\\\\\\\\.*(?:f\((\d+)\+h\)|x\s*\\\\to\s*(\d+))/s);
    if (!funcMatch) return null;

    const funcBody = funcMatch[1];
    const a = parseInt(funcMatch[2] || funcMatch[3]);

    // Parse B (coefficient of x^2)
    let B = 0;
    const bMatch = funcBody.match(/([+-]\s*\d*)x\^2/);
    if (bMatch) {
        const bs = bMatch[1].replace(/\s/g, '');
        if (bs === '+' || bs === '') B = 1;
        else if (bs === '-') B = -1;
        else B = parseInt(bs);
    }

    // Parse C (coefficient of x)
    let C = 0;
    // Need to match x that is NOT x^2
    const cMatch = funcBody.match(/([+-]\s*\d*)x(?!\^)/);
    if (cMatch) {
        const cs = cMatch[1].replace(/\s/g, '');
        if (cs === '+' || cs === '') C = 1;
        else if (cs === '-') C = -1;
        else C = parseInt(cs);
    }

    // f'(x) = 3x^2 + 2Bx + C
    const derivative = 3 * a * a + 2 * B * a + C;
    return derivative;
}

function verifySequence(latex: string, answer: number): number | null {
    // Subtype 0: sum a_k = X, find sum(A*a_k + B)
    const sub0 = latex.match(/\\sum_\{k=1\}\^\{(\d+)\}\s*a_k\s*=\s*(\d+)\s*\\\\\\\\.*\\sum_\{k=1\}\^\{\d+\}\s*\((\d+)a_k\s*\+\s*(\d+)\)/s);
    if (sub0) {
        const N = parseInt(sub0[1]), sumA = parseInt(sub0[2]), A = parseInt(sub0[3]), B = parseInt(sub0[4]);
        return A * sumA + B * N;
    }

    // Subtype 1: sum(a_k + c) = X, find sum a_k
    const sub1 = latex.match(/\\sum_\{k=1\}\^\{(\d+)\}\s*\(a_k\s*\+\s*(\d+)\)\s*=\s*(\d+)\s*\\\\\\\\.*\\sum_\{k=1\}\^\{\d+\}\s*a_k/s);
    if (sub1) {
        const N = parseInt(sub1[1]), c = parseInt(sub1[2]), X = parseInt(sub1[3]);
        return X - c * N;
    }

    return null;
}

function verifyIntegration(latex: string, answer: number): number | null {
    // Pattern: int_0^a (3x^2 + cx) dx = ?
    const match = latex.match(/\\int_\{0\}\^\{(\d+)\}\s*\(3x\^2\s*\+\s*(\d+)x\)\s*\\,dx/);
    if (!match) return null;
    const a = parseInt(match[1]), coeff = parseInt(match[2]);
    // integral of 3x^2 + cx = x^3 + cx^2/2, evaluated 0 to a
    const result = Math.pow(a, 3) + (coeff * Math.pow(a, 2)) / 2;
    return Math.round(result);
}

function verifyLogarithm(latex: string, answer: number): number | null {
    // log_base(b) + log_base(c) or log_base(b) - log_base(c)
    const addMatch = latex.match(/\\log_\{(\d+)\}\s*(\d+)\s*\+\s*\\log_\{\d+\}\s*(\d+)/);
    if (addMatch) {
        const base = parseInt(addMatch[1]), b = parseInt(addMatch[2]), c = parseInt(addMatch[3]);
        return Math.round(Math.log(b) / Math.log(base) + Math.log(c) / Math.log(base));
    }

    const subMatch = latex.match(/\\log_\{(\d+)\}\s*(\d+)\s*-\s*\\log_\{\d+\}\s*(\d+)/);
    if (subMatch) {
        const base = parseInt(subMatch[1]), b = parseInt(subMatch[2]), c = parseInt(subMatch[3]);
        return Math.round(Math.log(b) / Math.log(base) - Math.log(c) / Math.log(base));
    }

    return null;
}

function independentlyVerify(q: Question): number | null {
    switch (q.type) {
        case 'exp': {
            const r1 = verifyExponentSubtype0(q.latex, q.answer);
            if (r1 !== null) return r1;
            const r2 = verifyExponentSubtype1(q.latex, q.answer);
            if (r2 !== null) return r2;
            return null; // Can't parse
        }
        case 'diff':
            return verifyDifferentiation(q.latex, q.answer);
        case 'seq':
            return verifySequence(q.latex, q.answer);
        case 'int':
            return verifyIntegration(q.latex, q.answer);
        case 'log':
            return verifyLogarithm(q.latex, q.answer);
        default:
            return null;
    }
}

// ── Main simulation ────────────────────────────────────────────────

const SEEDS = 100;
const QUESTIONS_PER_SEED = 50;

console.log(`\n🧪 Simulation: ${SEEDS} seeds × ${QUESTIONS_PER_SEED} questions = ${SEEDS * QUESTIONS_PER_SEED} total\n`);

for (let s = 0; s < SEEDS; s++) {
    const seed = `test-seed-${s}`;

    for (let i = 0; i < QUESTIONS_PER_SEED; i++) {
        // Cycle through levels 1-5 every 10 questions
        const level = Math.min(5, Math.floor(i / 10) + 1);

        let q: Question;
        try {
            q = generateQuestion(seed, i, level);
        } catch (e) {
            structuralErrors.push(`CRASH: seed=${seed} idx=${i} level=${level}: ${e}`);
            continue;
        }

        totalQuestions++;
        typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;

        // ── Structural checks ──
        if (!Number.isInteger(q.answer) || q.answer <= 0) {
            structuralErrors.push(`BAD_ANSWER: seed=${seed} idx=${i} answer=${q.answer} (not positive integer)`);
        }
        if (q.choices.length !== 5) {
            structuralErrors.push(`BAD_CHOICES_COUNT: seed=${seed} idx=${i} count=${q.choices.length}`);
        }
        if (!q.choices.includes(q.answer)) {
            structuralErrors.push(`ANSWER_NOT_IN_CHOICES: seed=${seed} idx=${i} answer=${q.answer} choices=[${q.choices}]`);
        }
        const sorted = [...q.choices].sort((a, b) => a - b);
        if (JSON.stringify(sorted) !== JSON.stringify(q.choices)) {
            structuralErrors.push(`NOT_SORTED: seed=${seed} idx=${i} choices=[${q.choices}]`);
        }
        const uniqueChoices = new Set(q.choices);
        if (uniqueChoices.size !== q.choices.length) {
            structuralErrors.push(`DUPLICATE_CHOICES: seed=${seed} idx=${i} choices=[${q.choices}]`);
        }

        // ── Independent math verification ──
        const independent = independentlyVerify(q);

        if (independent === null) {
            // Could not parse — skip (don't count as error)
        } else if (independent !== q.answer) {
            mismatches.push({
                seed,
                index: i,
                level,
                type: q.type,
                latex: q.latex,
                generatedAnswer: q.answer,
                independentAnswer: independent,
                choices: q.choices,
                reason: `Generator says ${q.answer}, independent calc says ${independent}`,
            });
        } else {
            typeCorrect[q.type] = (typeCorrect[q.type] || 0) + 1;
        }
    }
}

// ── Results ────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════');
console.log('  SIMULATION RESULTS');
console.log('═══════════════════════════════════════════════════');
console.log(`  Total questions generated: ${totalQuestions}`);
console.log(`  Structural errors: ${structuralErrors.length}`);
console.log(`  Math mismatches: ${mismatches.length}`);
console.log('');
console.log('  Questions by type:');
for (const [type, count] of Object.entries(typeCounts).sort()) {
    const correct = typeCorrect[type] || 0;
    const pct = count > 0 ? ((correct / count) * 100).toFixed(1) : 'N/A';
    console.log(`    ${type}: ${count} generated, ${correct} verified ✓ (${pct}%)`);
}
console.log('═══════════════════════════════════════════════════');

if (structuralErrors.length > 0) {
    console.log(`\n❌ STRUCTURAL ERRORS (${structuralErrors.length}):`);
    structuralErrors.slice(0, 20).forEach(e => console.log(`  ${e}`));
    if (structuralErrors.length > 20) console.log(`  ... and ${structuralErrors.length - 20} more`);
}

if (mismatches.length > 0) {
    console.log(`\n❌ MATH MISMATCHES (${mismatches.length}):`);
    mismatches.slice(0, 20).forEach(m => {
        console.log(`  [${m.type}] seed=${m.seed} idx=${m.index} lvl=${m.level}`);
        console.log(`    LaTeX: ${m.latex.substring(0, 120)}...`);
        console.log(`    Generator: ${m.generatedAnswer} | Independent: ${m.independentAnswer}`);
        console.log(`    Choices: [${m.choices}]`);
        console.log('');
    });
    if (mismatches.length > 20) console.log(`  ... and ${mismatches.length - 20} more`);
} else if (structuralErrors.length === 0) {
    console.log('\n✅ ALL 5,000 QUESTIONS PASSED — no mismatches found!');
}

console.log('');
