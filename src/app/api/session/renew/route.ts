import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, createToken } from '@/lib/token';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { seed, userId, token, expiresAt } = body;

        if (!seed || !userId || !token || !expiresAt) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Verify the current token is valid
        const isValid = verifyToken(token, seed, userId, expiresAt);
        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 403 }
            );
        }

        // Allow renewal even if slightly expired (grace period of 2 minutes)
        const now = new Date();
        const expiry = new Date(expiresAt);
        const gracePeriodMs = 2 * 60 * 1000;
        if (expiry.getTime() + gracePeriodMs < now.getTime()) {
            return NextResponse.json(
                { error: 'Session too old to renew' },
                { status: 403 }
            );
        }

        // Issue new expiry and token (5 more minutes from now)
        const newExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        const newToken = createToken(seed, userId, newExpiresAt);

        return NextResponse.json({
            seed,
            token: newToken,
            expiresAt: newExpiresAt,
            userId,
        });
    } catch {
        return NextResponse.json(
            { error: 'Invalid request body' },
            { status: 400 }
        );
    }
}
