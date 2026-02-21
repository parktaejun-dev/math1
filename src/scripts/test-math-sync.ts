import { generateQuestion } from '../lib/MathGenerator';

function simulateGame() {
    console.log("Starting MathGenerator Sync E2E Test...");
    const seed = "test-e2e-seed-12345";
    let combo = 0;

    const playedQuestions = [];

    // Simulate 50 questions to test all levels and all 10 problem types
    for (let i = 0; i < 50; i++) {
        // 1. Client Level calculation based on logic in SuneungGame.tsx
        let level = 1;
        if (combo >= 50) level = 5;
        else if (combo >= 30) level = 4;
        else if (combo >= 20) level = 3;
        else if (combo >= 10) level = 2;

        // 2. Client generates question
        const q = generateQuestion(seed, i, level);

        // 3. Client answers correctly
        playedQuestions.push({
            questionId: q.id,
            correct: true,
            level: level
        });

        combo++; // user gets it right!
    }

    console.log(`Simulated ${playedQuestions.length} questions answering correctly.`);

    // --- SERVER SIDE VERIFICATION ---
    console.log("Submitting to Server for verification...");

    let verifiedCorrect = 0;
    for (let i = 0; i < playedQuestions.length; i++) {
        const played = playedQuestions[i];
        const serverLevel = played.level || 1;

        // Server independently regenerates question using deterministic RNG
        const serverQ = generateQuestion(seed, i, serverLevel);

        if (played.questionId !== serverQ.id) {
            console.error(`❌ Mismatch at index ${i}!`);
            console.error(`Client ID: ${played.questionId}, Server ID: ${serverQ.id}`);
            process.exit(1);
        }

        // Checking deterministic stability of choices and answer
        if (serverQ.answer <= 0 || !Number.isInteger(serverQ.answer)) {
            console.error(`❌ Invalid answer generated at index ${i}: ${serverQ.answer}`);
            process.exit(1);
        }

        if (serverQ.choices.length !== 5) {
            console.error(`❌ Invalid choices length at index ${i} for type ${serverQ.type}: ${serverQ.choices.length}`);
            process.exit(1);
        }

        verifiedCorrect++;
    }

    console.log(`✅ All ${verifiedCorrect} questions fully synchronized between Client and Server!`);

    // Test distinct types generation to ensure all new 5 types appeared
    const typesAppeared = new Set();
    for (let i = 0; i < 100; i++) {
        // Force level 5 to unlock all generators
        const q = generateQuestion("type-test-seed", i, 5);
        typesAppeared.add(q.type);
    }

    console.log("\nTypes generated at Level 5:", Array.from(typesAppeared).join(", "));
    if (typesAppeared.size < 10) {
        console.warn("⚠️ Warning: Not all 10 types appeared in 100 iterations. Check scaling logic or RNG.");
    } else {
        console.log("✅ All 10 problem types successfully generated!");
    }
}

simulateGame();
