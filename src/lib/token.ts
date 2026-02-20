import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'suneung1-dev-secret-change-in-prod';

export function createToken(seed: string, userId: string, expiresAt: string): string {
    const payload = `${seed}|${userId}|${expiresAt}`;
    return crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
}

export function verifyToken(
    token: string,
    seed: string,
    userId: string,
    expiresAt: string
): boolean {
    const expected = createToken(seed, userId, expiresAt);
    // Timing-safe comparison
    if (token.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function generateSeed(): string {
    return crypto.randomBytes(16).toString('hex');
}
