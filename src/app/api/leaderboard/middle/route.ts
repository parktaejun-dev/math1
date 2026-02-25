import { NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/redis';

export async function GET() {
    try {
        const leaderboard = await getLeaderboard('middle');
        const topScores = await leaderboard.getTopScores(100);

        return NextResponse.json({
            success: true,
            leaderboard: topScores
        });
    } catch (e: any) {
        console.error('[getMiddleLeaderboard] Error:', e);
        return NextResponse.json(
            { error: 'Failed to fetch leaderboard' },
            { status: 500 }
        );
    }
}
