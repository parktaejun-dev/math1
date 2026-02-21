/**
 * Leaderboard store — Vercel KV (Redis), Vercel Blob, with in-memory fallback
 */
import { put } from '@vercel/blob';
import Redis from 'ioredis';

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

// ─── Vercel Blob Leaderboard ───────────────────────────────────────

const BLOB_PATH = 'leaderboard.json';

class BlobLeaderboard {
    private async getData(): Promise<Record<string, number>> {
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        // Extract store URL from token or use known base
        // The blob URL format: https://<store>.private.blob.vercel-storage.com/<path>
        const storeId = token?.match(/^vercel_blob_rw_([^_]+)_/)?.[1];
        if (!storeId) {
            console.error('[Leaderboard] Cannot extract store ID from token');
            return {};
        }
        const blobUrl = `https://${storeId.toLowerCase()}.private.blob.vercel-storage.com/${BLOB_PATH}`;
        try {
            const res = await fetch(blobUrl, {
                cache: 'no-store',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 404) {
                console.log('[Leaderboard] No existing blob, starting fresh');
                return {};
            }
            if (!res.ok) {
                console.error(`[Leaderboard] Blob read failed: ${res.status} ${res.statusText}`);
                return {};
            }
            return await res.json();
        } catch (e) {
            console.error('[Leaderboard] getData error:', e);
            return {};
        }
    }

    private async saveData(data: Record<string, number>) {
        const result = await put(BLOB_PATH, JSON.stringify(data), {
            access: 'private',
            addRandomSuffix: false,
            allowOverwrite: true,
        });
        console.log('[Leaderboard] Saved OK, url:', result.url);
    }

    async addScore(userId: string, score: number): Promise<void> {
        const data = await this.getData();
        const existing = data[userId] || 0;
        if (score > existing) {
            data[userId] = score;
            await this.saveData(data);
        }
    }

    async getTopScores(count: number): Promise<LeaderboardEntry[]> {
        const data = await this.getData();
        return Object.entries(data)
            .map(([userId, score]) => ({ userId, score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, count);
    }

    async getRank(userId: string): Promise<number | null> {
        const data = await this.getData();
        const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
        const index = sorted.findIndex(([id]) => id === userId);
        return index >= 0 ? index + 1 : null;
    }

    async getScore(userId: string): Promise<number | null> {
        const data = await this.getData();
        return data[userId] ?? null;
    }
}

// ─── Redis (Vercel KV) Leaderboard ─────────────────────────────────

const REDIS_KEY = 'leaderboard:suneung1';

class RedisLeaderboard {
    private redis: Redis;

    constructor(url: string) {
        this.redis = new Redis(url);
    }

    async addScore(userId: string, score: number): Promise<void> {
        // ZADD NX or simply ZADD? We only want to update if the new score is higher.
        // ZADD CH keeps existing, GT updates if greater. ioredis supports native arguments.
        // ZADD key GT score member
        try {
            await this.redis.zadd(REDIS_KEY, 'GT', score, userId);
        } catch (e) {
            console.error('[Leaderboard] Redis zadd error:', e);
        }
    }

    async getTopScores(count: number): Promise<LeaderboardEntry[]> {
        try {
            // ZREVRANGE returns array of members, WITHSCORES returns [member1, score1, member2, score2]
            const result = await this.redis.zrevrange(REDIS_KEY, 0, count - 1, 'WITHSCORES');
            const entries: LeaderboardEntry[] = [];
            for (let i = 0; i < result.length; i += 2) {
                entries.push({
                    userId: result[i],
                    score: parseInt(result[i + 1], 10)
                });
            }
            return entries;
        } catch (e) {
            console.error('[Leaderboard] Redis getTopScores error:', e);
            return [];
        }
    }

    async getRank(userId: string): Promise<number | null> {
        try {
            // ZREVRANK is 0-indexed, so add 1
            const rank = await this.redis.zrevrank(REDIS_KEY, userId);
            return rank !== null ? rank + 1 : null;
        } catch (e) {
            console.error('[Leaderboard] Redis getRank error:', e);
            return null;
        }
    }

    async getScore(userId: string): Promise<number | null> {
        try {
            const score = await this.redis.zscore(REDIS_KEY, userId);
            return score !== null ? parseInt(score, 10) : null;
        } catch (e) {
            console.error('[Leaderboard] Redis getScore error:', e);
            return null;
        }
    }
}

// ─── Singleton Export ──────────────────────────────────────────────

export type Leaderboard = InMemoryLeaderboard | BlobLeaderboard | RedisLeaderboard;

let leaderboard: Leaderboard | null = null;

export async function getLeaderboard(): Promise<Leaderboard> {
    if (leaderboard) return leaderboard;

    const redisUrl = process.env.KV_URL || process.env.REDIS_URL;

    if (redisUrl) {
        leaderboard = new RedisLeaderboard(redisUrl);
        console.log('[Leaderboard] Using Redis (Vercel KV)');
    } else if (process.env.BLOB_READ_WRITE_TOKEN) {
        leaderboard = new BlobLeaderboard();
        console.log('[Leaderboard] Using Vercel Blob');
    } else {
        console.log('[Leaderboard] WARN: No KV_URL or BLOB_READ_WRITE_TOKEN, using in-memory');
        leaderboard = new InMemoryLeaderboard();
    }

    return leaderboard;
}
