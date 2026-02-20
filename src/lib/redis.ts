/**
 * Leaderboard store — Redis with in-memory fallback
 */

interface LeaderboardEntry {
    userId: string;
    score: number;
}

// ─── In-Memory Fallback ────────────────────────────────────────────

class InMemoryLeaderboard {
    private entries: Map<string, number> = new Map();

    async addScore(userId: string, score: number): Promise<void> {
        const existing = this.entries.get(userId) || 0;
        if (score > existing) {
            this.entries.set(userId, score);
        }
    }

    async getTopScores(count: number): Promise<LeaderboardEntry[]> {
        return Array.from(this.entries.entries())
            .map(([userId, score]) => ({ userId, score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, count);
    }

    async getRank(userId: string): Promise<number | null> {
        const sorted = Array.from(this.entries.entries())
            .sort((a, b) => b[1] - a[1]);
        const index = sorted.findIndex(([id]) => id === userId);
        return index >= 0 ? index + 1 : null;
    }

    async getScore(userId: string): Promise<number | null> {
        return this.entries.get(userId) ?? null;
    }
}

// ─── Redis-backed Leaderboard ──────────────────────────────────────

class RedisLeaderboard {
    private redis: import('ioredis').default;
    private key = 'leaderboard:global';

    constructor(redis: import('ioredis').default) {
        this.redis = redis;
    }

    async addScore(userId: string, score: number): Promise<void> {
        // Only update if new score is higher (GT flag requires Redis 6.2+)
        const current = await this.redis.zscore(this.key, userId);
        if (current === null || score > parseFloat(current)) {
            await this.redis.zadd(this.key, score, userId);
        }
    }

    async getTopScores(count: number): Promise<LeaderboardEntry[]> {
        const results = await this.redis.zrevrange(this.key, 0, count - 1, 'WITHSCORES');
        const entries: LeaderboardEntry[] = [];
        for (let i = 0; i < results.length; i += 2) {
            entries.push({
                userId: results[i],
                score: parseFloat(results[i + 1]),
            });
        }
        return entries;
    }

    async getRank(userId: string): Promise<number | null> {
        const rank = await this.redis.zrevrank(this.key, userId);
        return rank !== null ? rank + 1 : null;
    }

    async getScore(userId: string): Promise<number | null> {
        const score = await this.redis.zscore(this.key, userId);
        return score !== null ? parseFloat(score) : null;
    }
}

// ─── Singleton Export ──────────────────────────────────────────────

export type Leaderboard = InMemoryLeaderboard | RedisLeaderboard;

let leaderboard: Leaderboard | null = null;

export async function getLeaderboard(): Promise<Leaderboard> {
    if (leaderboard) return leaderboard;

    const redisUrl = process.env.KV_URL || process.env.REDIS_URL;
    if (redisUrl) {
        try {
            const Redis = (await import('ioredis')).default;
            const redis = new Redis(redisUrl);
            leaderboard = new RedisLeaderboard(redis);
            console.log('[Leaderboard] Connected to Redis');
        } catch (e) {
            console.warn('[Leaderboard] Redis connection failed, using in-memory fallback', e);
            leaderboard = new InMemoryLeaderboard();
        }
    } else {
        console.log('[Leaderboard] No REDIS_URL, using in-memory fallback');
        leaderboard = new InMemoryLeaderboard();
    }

    return leaderboard;
}
