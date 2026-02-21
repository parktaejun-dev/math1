/**
 * 100-Session Game Simulation Test
 * Simulates 100 independent game sessions (both Suneung & Practice modes)
 * covering all question types, levels, PASS logic, and edge cases.
 */
import { generateQuestion, QType } from '../lib/MathGenerator';

// ─── Simulation Config ─────────────────────────────────────────────
const TOTAL_SESSIONS = 100;
const SUNEUNG_SESSIONS = 70; // 70 Suneung mode, 30 Practice mode
const GAME_DURATION = 90;
const PASS_TIME_PENALTY = 10;

// ─── Stats Tracking ────────────────────────────────────────────────
let totalQuestions = 0;
let totalErrors = 0;
let totalPasses = 0;
let totalCorrect = 0;
let totalWrong = 0;
const typeCount: Record<string, number> = {};
const levelCount: Record<number, number> = {};
const errorDetails: string[] = [];

// Simple seeded RNG for test randomness
function simRng(seed: number) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ─── Suneung Mode Simulation ────────────────────────────────────────
function simulateSuneungSession(sessionId: number): boolean {
    const seed = `suneung-test-${sessionId}-${Date.now()}`;
    let timeLeft = GAME_DURATION;
    let combo = 0;
    let score = 0;
    let questionIndex = 0;
    let level = 1;
    let errors = 0;
    const rng = simRng(sessionId * 7919);

    while (timeLeft > 0 && questionIndex < 200) { // max 200 questions per session
        try {
            const q = generateQuestion(seed, questionIndex, level);

            // Validate question structure
            if (!q.id || typeof q.id !== 'string') {
                errorDetails.push(`[Suneung#${sessionId}] Q${questionIndex}: Missing or invalid ID`);
                errors++;
            }
            if (!q.latex || typeof q.latex !== 'string' || q.latex.length === 0) {
                errorDetails.push(`[Suneung#${sessionId}] Q${questionIndex}: Empty latex`);
                errors++;
            }
            if (!Number.isInteger(q.answer) || q.answer <= 0) {
                errorDetails.push(`[Suneung#${sessionId}] Q${questionIndex}: Invalid answer=${q.answer} type=${q.type}`);
                errors++;
            }
            if (!Array.isArray(q.choices) || q.choices.length !== 5) {
                errorDetails.push(`[Suneung#${sessionId}] Q${questionIndex}: choices.length=${q.choices?.length} (expected 5), type=${q.type}`);
                errors++;
            }
            if (q.choices && !q.choices.includes(q.answer)) {
                errorDetails.push(`[Suneung#${sessionId}] Q${questionIndex}: answer=${q.answer} NOT in choices=[${q.choices}] type=${q.type}`);
                errors++;
            }
            // Check choices are sorted ascending
            if (q.choices) {
                for (let i = 1; i < q.choices.length; i++) {
                    if (q.choices[i] <= q.choices[i - 1]) {
                        errorDetails.push(`[Suneung#${sessionId}] Q${questionIndex}: choices NOT sorted: [${q.choices}] type=${q.type}`);
                        errors++;
                        break;
                    }
                }
            }
            // Check all choices are positive integers
            if (q.choices) {
                for (const c of q.choices) {
                    if (!Number.isInteger(c) || c <= 0) {
                        errorDetails.push(`[Suneung#${sessionId}] Q${questionIndex}: invalid choice=${c} type=${q.type}`);
                        errors++;
                        break;
                    }
                }
            }

            // Track stats
            typeCount[q.type] = (typeCount[q.type] || 0) + 1;
            levelCount[level] = (levelCount[level] || 0) + 1;
            totalQuestions++;

            // Random action: 70% correct, 15% wrong, 15% PASS
            const action = rng();
            if (action < 0.15) {
                // PASS
                totalPasses++;
                combo = 0;
                timeLeft -= PASS_TIME_PENALTY;
                // Validate: if time was < 10, game should end
                if (timeLeft <= 0) break;
            } else if (action < 0.30) {
                // Wrong answer
                totalWrong++;
                const timePenalty = 5 + Math.floor(combo / 10) * 2;
                combo = 0;
                timeLeft -= timePenalty;
            } else {
                // Correct answer
                totalCorrect++;
                combo++;
                level = Math.max(level, Math.floor(combo / 10) + 1);
                if (level > 5) level = 5;
                let timeBonus = 8;
                if (level === 2) timeBonus = 6;
                else if (level === 3) timeBonus = 4;
                else if (level >= 4) timeBonus = 3;
                timeLeft = Math.min(GAME_DURATION, timeLeft + timeBonus);
                score += 100;
            }

            questionIndex++;
        } catch (e: any) {
            errorDetails.push(`[Suneung#${sessionId}] Q${questionIndex}: EXCEPTION: ${e.message}`);
            errors++;
            questionIndex++;
            if (errors > 10) break; // prevent infinite loop on broken generator
        }
    }

    totalErrors += errors;
    return errors === 0;
}

// ─── Practice Mode Simulation ───────────────────────────────────────
function simulatePracticeSession(sessionId: number): boolean {
    const seed = `practice-test-${sessionId}-${Date.now()}`;
    let questionIndex = 0;
    let errors = 0;
    const rng = simRng(sessionId * 6271);

    // 다양한 allowedTypes 조합 테스트
    const allTypes: QType[] = ['exp', 'diff', 'seq', 'int', 'log', 'trig_basic', 'limit_basic', 'continuity', 'sigma_basic', 'extrema'];
    const numTypes = Math.floor(rng() * allTypes.length) + 1;
    const selectedTypes = allTypes.slice(0, numTypes);

    // Practice: 30 questions per session (no time limit)
    for (let i = 0; i < 30; i++) {
        try {
            // Practice mode always uses level 1 (no level scaling)
            const q = generateQuestion(seed, questionIndex, 1, selectedTypes);

            // Same structural validation
            if (!q.id || typeof q.id !== 'string') {
                errorDetails.push(`[Practice#${sessionId}] Q${questionIndex}: Missing or invalid ID`);
                errors++;
            }
            if (!q.latex || typeof q.latex !== 'string') {
                errorDetails.push(`[Practice#${sessionId}] Q${questionIndex}: Empty latex`);
                errors++;
            }
            if (!Number.isInteger(q.answer) || q.answer <= 0) {
                errorDetails.push(`[Practice#${sessionId}] Q${questionIndex}: Invalid answer=${q.answer} type=${q.type}`);
                errors++;
            }
            if (!Array.isArray(q.choices) || q.choices.length !== 5) {
                errorDetails.push(`[Practice#${sessionId}] Q${questionIndex}: choices.length=${q.choices?.length} type=${q.type}`);
                errors++;
            }
            if (q.choices && !q.choices.includes(q.answer)) {
                errorDetails.push(`[Practice#${sessionId}] Q${questionIndex}: answer NOT in choices type=${q.type}`);
                errors++;
            }

            // Verify type filtering works (question type should be in selectedTypes)
            if (!selectedTypes.includes(q.type as QType)) {
                errorDetails.push(`[Practice#${sessionId}] Q${questionIndex}: type=${q.type} NOT in allowedTypes=[${selectedTypes}]`);
                errors++;
            }

            totalQuestions++;
            typeCount[q.type] = (typeCount[q.type] || 0) + 1;

            // Random action: 60% correct, 20% wrong, 20% PASS
            const action = rng();
            if (action < 0.20) {
                totalPasses++;
            } else if (action < 0.40) {
                totalWrong++;
            } else {
                totalCorrect++;
            }

            questionIndex++;
        } catch (e: any) {
            errorDetails.push(`[Practice#${sessionId}] Q${questionIndex}: EXCEPTION: ${e.message}`);
            errors++;
            questionIndex++;
            if (errors > 10) break;
        }
    }

    totalErrors += errors;
    return errors === 0;
}

// ─── Determinism Test ───────────────────────────────────────────────
function testDeterminism(): boolean {
    console.log("\n🔁 Determinism Test: generating same seed twice...");
    let ok = true;
    for (let level = 1; level <= 5; level++) {
        for (let i = 0; i < 20; i++) {
            const q1 = generateQuestion("determinism-check", i, level);
            const q2 = generateQuestion("determinism-check", i, level);
            if (q1.id !== q2.id || q1.answer !== q2.answer || q1.latex !== q2.latex) {
                errorDetails.push(`[Determinism] Mismatch at level=${level} index=${i}`);
                ok = false;
            }
            if (JSON.stringify(q1.choices) !== JSON.stringify(q2.choices)) {
                errorDetails.push(`[Determinism] Choices mismatch at level=${level} index=${i}`);
                ok = false;
            }
        }
    }
    console.log(ok ? "  ✅ All determinism checks passed (100 pairs)" : "  ❌ Determinism FAILED");
    return ok;
}

// ─── Main Runner ────────────────────────────────────────────────────
function main() {
    console.log("═══════════════════════════════════════════════════════");
    console.log("  🎮 100-Session Game Simulation Test");
    console.log("═══════════════════════════════════════════════════════\n");

    let passedSessions = 0;
    let failedSessions = 0;

    // Suneung sessions
    console.log(`▶ Running ${SUNEUNG_SESSIONS} Suneung mode sessions...`);
    for (let i = 0; i < SUNEUNG_SESSIONS; i++) {
        const ok = simulateSuneungSession(i);
        if (ok) passedSessions++;
        else failedSessions++;
    }
    console.log(`  ✅ Suneung sessions complete`);

    // Practice sessions
    const practiceCount = TOTAL_SESSIONS - SUNEUNG_SESSIONS;
    console.log(`\n▶ Running ${practiceCount} Practice mode sessions...`);
    for (let i = 0; i < practiceCount; i++) {
        const ok = simulatePracticeSession(i);
        if (ok) passedSessions++;
        else failedSessions++;
    }
    console.log(`  ✅ Practice sessions complete`);

    // Determinism test
    const detOk = testDeterminism();

    // ─── Report ──────────────────────────────────────────────────
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("  📊 Simulation Results");
    console.log("═══════════════════════════════════════════════════════");
    console.log(`  Total Sessions  : ${TOTAL_SESSIONS}`);
    console.log(`  Passed Sessions : ${passedSessions}`);
    console.log(`  Failed Sessions : ${failedSessions}`);
    console.log(`  Total Questions : ${totalQuestions}`);
    console.log(`  Total Correct   : ${totalCorrect}`);
    console.log(`  Total Wrong     : ${totalWrong}`);
    console.log(`  Total PASS      : ${totalPasses}`);
    console.log(`  Total Errors    : ${totalErrors}`);

    console.log("\n  📦 Question Type Distribution:");
    const sortedTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sortedTypes) {
        const pct = ((count / totalQuestions) * 100).toFixed(1);
        const bar = '█'.repeat(Math.round(count / totalQuestions * 50));
        console.log(`    ${type.padEnd(14)} ${String(count).padStart(5)} (${pct}%) ${bar}`);
    }

    console.log("\n  📈 Level Distribution:");
    for (const [level, count] of Object.entries(levelCount).sort((a, b) => Number(a[0]) - Number(b[0]))) {
        const pct = ((count / totalQuestions) * 100).toFixed(1);
        console.log(`    Level ${level}: ${String(count).padStart(5)} (${pct}%)`);
    }

    if (errorDetails.length > 0) {
        console.log("\n  ❌ Error Details (first 20):");
        errorDetails.slice(0, 20).forEach(e => console.log(`    ${e}`));
        if (errorDetails.length > 20) {
            console.log(`    ... and ${errorDetails.length - 20} more`);
        }
    }

    console.log("\n═══════════════════════════════════════════════════════");
    if (totalErrors === 0 && detOk) {
        console.log("  ✅ ALL 100 SESSIONS PASSED — NO ERRORS DETECTED!");
    } else {
        console.log(`  ❌ FAILED: ${totalErrors} errors across ${failedSessions} sessions`);
    }
    console.log("═══════════════════════════════════════════════════════\n");

    process.exit(totalErrors === 0 && detOk ? 0 : 1);
}

main();
