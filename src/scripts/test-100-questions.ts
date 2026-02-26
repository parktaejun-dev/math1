import { generateQuestion } from '../lib/MathGenerator';

function test100Questions() {
    const seed = "test-monotony-" + Date.now();
    const stats: Record<string, number> = {};
    const sequence: string[] = [];

    console.log("--- 100 Questions Sequence ---");
    let combo = 0;
    let currentLevel = 1;

    for (let i = 0; i < 100; i++) {
        const q = generateQuestion(seed, i, currentLevel);
        stats[q.type] = (stats[q.type] || 0) + 1;
        sequence.push(q.type);
        
        combo++;
        currentLevel = Math.min(5, Math.floor(combo / 10) + 1);

        if (i < 10) {
            console.log(`Q${i+1} (Lv.${currentLevel}): ${q.type}`);
        }
    }

    console.log("\n--- Type Distribution ---");
    Object.entries(stats).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        console.log(`${type.padEnd(15)}: ${count}`);
    });

    let reps = 0;
    for (let i = 1; i < sequence.length; i++) {
        if (sequence[i] === sequence[i-1]) reps++;
    }
    console.log(`\nImmediate Repetitions: ${reps}`);
}

test100Questions();
