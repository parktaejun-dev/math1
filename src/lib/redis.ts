/**
 * Leaderboard store — Vercel Blob with in-memory fallback
 */
import { put, list } from '@vercel/blob';

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
        const { blobs } = await list({ prefix: BLOB_PATH });
        if (blobs.length > 0) {
            const file = blobs.find(b => b.pathname === BLOB_PATH);
            if (file) {
                const res = await fetch(file.url, { cache: 'no-store' });
                if (!res.ok) {
                    throw new Error(`Blob fetch failed: ${res.status} ${res.statusText}`);
                }
                return await res.json();
            }
        }
        // No file yet — return empty (first-time init)
        return {};
    }

    private async saveData(data: Record<string, number>) {
        await put(BLOB_PATH, JSON.stringify(data), {
            access: 'private',
            addRandomSuffix: false,
        });
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

// ─── Singleton Export ──────────────────────────────────────────────

export type Leaderboard = InMemoryLeaderboard | BlobLeaderboard;

let leaderboard: Leaderboard | null = null;

export async function getLeaderboard(): Promise<Leaderboard> {
    if (leaderboard) return leaderboard;

    // Use Blob if configured, else fallback to memory
    if (process.env.BLOB_READ_WRITE_TOKEN) {
        leaderboard = new BlobLeaderboard();
        console.log('[Leaderboard] Using Vercel Blob');
    } else {
        console.log('[Leaderboard] WARN: No BLOB_READ_WRITE_TOKEN, using in-memory (data will NOT persist across requests)');
        leaderboard = new InMemoryLeaderboard();
    }

    return leaderboard;
}
