import { NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/redis';

export async function GET() {
    try {
        const leaderboard = await getLeaderboard();
        const topScores = await leaderboard.getTopScores(50);

        return NextResponse.json({
            leaderboard: topScores,
            updatedAt: new Date().toISOString(),
        });
    } catch {
        return NextResponse.json(
            { error: 'Failed to fetch leaderboard' },
            { status: 500 }
        );
    }
}
