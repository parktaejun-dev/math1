import { NextRequest, NextResponse } from 'next/server';
import { createToken, generateSeed } from '@/lib/token';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const userId = body.userId || `anon-${Date.now()}`;

        const seed = generateSeed();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min
        const token = createToken(seed, userId, expiresAt);

        return NextResponse.json({
            seed,
            token,
            expiresAt,
            userId,
        });
    } catch {
        return NextResponse.json(
            { error: 'Invalid request body' },
            { status: 400 }
        );
    }
}
