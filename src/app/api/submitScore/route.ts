import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { generateQuestion } from '@/lib/MathGenerator';
import { getLeaderboard } from '@/lib/redis';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, seed, token, score, playedQuestions, timestamp } = body;

        // 1. Validate required fields
        if (!userId || !seed || !token || score === undefined || !playedQuestions) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // 2. Find the matching expiresAt — token carries the expiry info
        //    We need to verify the token matches. The client sends timestamp.
        //    For simplicity, we'll try verification with a reasonable time window.
        const expiresAt = body.expiresAt;
        if (!expiresAt) {
            return NextResponse.json(
                { error: 'Missing expiresAt' },
                { status: 400 }
            );
        }

        // 3. Token signature verification
        const isValid = verifyToken(token, seed, userId, expiresAt);
        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 403 }
            );
        }

        // 4. Check token expiry
        if (new Date(expiresAt) < new Date()) {
            return NextResponse.json(
                { error: 'Session expired' },
                { status: 403 }
            );
        }

        // 5. Replay verification — regenerate questions from seed
        const questionCount = playedQuestions.length;
        let maxPossibleScore = 0;
        let verifiedCorrect = 0;

        for (let i = 0; i < questionCount; i++) {
            const played = playedQuestions[i];
            // Accept the level the client used for this question (defaults to 1)
            const level = played.level || 1;
            const q = generateQuestion(seed, i, level);

            if (played.questionId !== q.id) {
                return NextResponse.json(
                    { error: 'Question sequence mismatch' },
                    { status: 403 }
                );
            }

            // Calculate max possible score (with combo/fever)
            // Base: 100 per correct, fever doubles
            if (played.correct) {
                verifiedCorrect++;
            }
            // Max score assumes all correct with fever and huge time bonus
            maxPossibleScore += 1500; // theoretical generous max per question
        }

        // 6. Score plausibility check
        if (score > maxPossibleScore) {
            return NextResponse.json(
                { error: 'Score exceeds maximum possible' },
                { status: 403 }
            );
        }

        if (score < 0) {
            return NextResponse.json(
                { error: 'Invalid score' },
                { status: 403 }
            );
        }

        // 7. Persist to leaderboard
        const leaderboard = await getLeaderboard();
        await leaderboard.addScore(userId, score);

        const rank = await leaderboard.getRank(userId);

        return NextResponse.json({
            success: true,
            score,
            rank,
            message: `Score ${score} submitted successfully`,
        });
    } catch {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
