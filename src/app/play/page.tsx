'use client';

import React, { useState, useCallback, useEffect } from 'react';
import SuneungGame from '@/components/SuneungGame';

interface GameResult {
    score: number;
    correct: number;
    total: number;
    maxCombo: number;
    playedQuestions: {
        questionId: string;
        selectedAnswer: number;
        correct: boolean;
        timeMs: number;
    }[];
}

interface SessionData {
    seed: string;
    token: string;
    expiresAt: string;
    userId: string;
}

type GameState = 'loading' | 'playing' | 'submitting' | 'result';

export default function PlayPage() {
    const [gameState, setGameState] = useState<GameState>('loading');
    const [session, setSession] = useState<SessionData | null>(null);
    const [result, setResult] = useState<GameResult | null>(null);
    const [rank, setRank] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSharing, setIsSharing] = useState(false);

    // Fetch session on mount
    useEffect(() => {
        const startSession = async () => {
            try {
                const userId = localStorage.getItem('suneung1_userId') || `player-${Date.now().toString(36)}`;
                localStorage.setItem('suneung1_userId', userId);

                const res = await fetch('/api/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId }),
                });
                const data = await res.json();
                setSession(data);
                setGameState('playing');
            } catch {
                setError('세션을 시작할 수 없습니다. 다시 시도해주세요.');
            }
        };
        startSession();
    }, []);

    // Handle game end
    const handleGameEnd = useCallback(
        async (gameResult: GameResult) => {
            setResult(gameResult);
            setGameState('submitting');

            if (!session) return;

            try {
                const res = await fetch('/api/submitScore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: session.userId,
                        seed: session.seed,
                        token: session.token,
                        expiresAt: session.expiresAt,
                        score: gameResult.score,
                        playedQuestions: gameResult.playedQuestions,
                        timestamp: new Date().toISOString(),
                    }),
                });
                const data = await res.json();
                if (data.rank) setRank(data.rank);
            } catch {
                console.error('Score submission failed');
            }

            setGameState('result');
        },
        [session]
    );

    // Share result
    const handleShare = async () => {
        if (!result || isSharing) return;
        setIsSharing(true);
        const text = `🧮 수능1번 타임어택\n\n점수: ${result.score.toLocaleString()}점\n정답: ${result.correct}/${result.total}\n최대 콤보: ${result.maxCombo}\n${rank ? `랭킹: ${rank}위` : ''}\n\n나도 도전! →`;

        try {
            if (navigator.share) {
                await navigator.share({ text, url: window.location.origin });
            } else {
                await navigator.clipboard.writeText(text + ' ' + window.location.origin);
                alert('결과가 클립보드에 복사되었습니다!');
            }
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
                console.error('Share failed:', error);
            }
        } finally {
            setIsSharing(false);
        }
    };

    // Retry
    const handleRetry = () => {
        window.location.reload();
    };

    // Loading
    if (gameState === 'loading') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center font-sans">
                {error ? (
                    <div className="text-center">
                        <p className="text-wrong mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-primary text-white rounded-xl font-bold"
                        >
                            다시 시도
                        </button>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-primary font-bold">게임 준비중...</p>
                    </div>
                )}
            </div>
        );
    }

    // Playing
    if (gameState === 'playing' && session) {
        return <SuneungGame seed={session.seed} onGameEnd={handleGameEnd} />;
    }

    // Result
    if (gameState === 'submitting' || gameState === 'result') {
        const accuracy = result?.total ? Math.round((result.correct / result.total) * 100) : 0;

        let gradeText = "Keep trying!";
        if (accuracy >= 90) gradeText = "Excellent!";
        else if (accuracy >= 70) gradeText = "Great Job!";
        else if (accuracy >= 50) gradeText = "Good Effort!";

        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 flex flex-col font-sans antialiased overflow-x-hidden selection:bg-primary/20 selection:text-primary">
                <header className="w-full bg-white border-b border-[#e0e2e5] px-6 py-3 flex items-center justify-between shadow-sm z-10 print:hidden">
                    <div className="flex items-center gap-3 text-[#111318]">
                        <span className="material-symbols-outlined text-primary text-2xl">school</span>
                        <h2 className="text-[#111318] text-lg font-bold tracking-tight">수능1번</h2>
                    </div>
                </header>

                <main className="flex-grow flex items-center justify-center p-4 sm:p-8">
                    <div className="relative w-full max-w-[800px] min-h-[600px] bg-paper shadow-2xl flex flex-col overflow-hidden before:absolute before:inset-0 before:bg-[url('data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\' opacity=\'0.08\'/%3E%3C/svg%3E')] before:pointer-events-none">

                        <div className="border-b-2 border-slate-800 p-6 sm:p-8 pb-4 mx-4 sm:mx-8 mt-4 sm:mt-8 flex flex-col gap-2">
                            <div className="flex justify-between items-end">
                                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight font-serif">성적 통지표</h1>
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold text-slate-600 font-serif">수학 영역</p>
                                    <div className="border border-slate-800 rounded-full px-4 py-1 mt-1 inline-block bg-white/50">
                                        <span className="font-bold text-lg font-serif">홀수형</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between text-sm font-medium text-slate-500 mt-4 font-serif border-t border-slate-300 pt-2">
                                <span>수험번호: {session?.userId?.split('#')[0] || '알수없음'}</span>
                                {rank && <span className="text-primary font-bold">전국 상위 {rank}위</span>}
                            </div>
                        </div>

                        <div className="flex-1 px-4 sm:px-8 py-8 flex flex-col items-center relative">
                            <div className="w-full max-w-lg relative z-0 mt-4">
                                <div className="relative w-full aspect-square max-w-[300px] mx-auto flex items-center justify-center">
                                    <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                                        <svg className="w-full h-full text-grading-red opacity-90 rotate-[-5deg]" viewBox="0 0 200 200">
                                            <path
                                                className="animate-draw"
                                                d="M 40 100 C 40 40, 160 40, 160 100 C 160 160, 40 160, 40 100"
                                                fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8" style={{ filter: 'drop-shadow(2px 4px 6px rgba(217, 48, 37, 0.3))' }}
                                            />
                                            <path
                                                className="animate-draw"
                                                d="M 35 105 C 30 150, 150 170, 165 95"
                                                fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4" style={{ animationDelay: '0.8s', opacity: 0 }}
                                            />
                                        </svg>
                                    </div>
                                    <div className="relative z-20 flex flex-col items-center justify-center" style={{ animation: 'inkFadeIn 0.8s ease-out 0.5s forwards', opacity: 0 }}>
                                        <div className="text-[80px] sm:text-[100px] leading-none font-handwriting text-grading-red drop-shadow-sm -rotate-2">
                                            {result?.score.toLocaleString() || '0'}
                                        </div>
                                        <div className="text-2xl sm:text-3xl font-handwriting text-grading-red mt-[-10px] -rotate-2 opacity-80">
                                            {gameState === 'submitting' ? '채점 중...' : gradeText}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 border-t-2 border-slate-800 pt-6 grid grid-cols-3 gap-4 text-center">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-slate-500 font-serif text-[10px] sm:text-xs uppercase tracking-widest">정답/풀이</span>
                                        <span className="font-handwriting text-2xl sm:text-3xl text-grading-red -rotate-1" style={{ animation: 'inkFadeIn 0.8s ease-out 0.8s forwards', opacity: 0 }}>{result?.correct || 0}/{result?.total || 0}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-slate-500 font-serif text-[10px] sm:text-xs uppercase tracking-widest">정답률</span>
                                        <span className="font-handwriting text-2xl sm:text-3xl text-grading-red -rotate-1" style={{ animation: 'inkFadeIn 0.8s ease-out 1.0s forwards', opacity: 0 }}>{accuracy}%</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-slate-500 font-serif text-[10px] sm:text-xs uppercase tracking-widest">최대 콤보</span>
                                        <span className="font-handwriting text-2xl sm:text-3xl text-grading-red -rotate-1" style={{ animation: 'inkFadeIn 0.8s ease-out 1.2s forwards', opacity: 0 }}>{result?.maxCombo || 0}</span>
                                    </div>
                                </div>

                                {gameState === 'submitting' && (
                                    <div className="mt-8 flex items-center justify-center gap-2 text-secondary text-sm font-medium font-serif">
                                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        교육과정평가원 서버로 전송 중...
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-auto p-6 sm:p-8 border-t border-slate-200 bg-white/40 backdrop-blur-sm flex flex-col sm:flex-row gap-3 justify-center items-center">
                            <button onClick={handleRetry} disabled={gameState === 'submitting'} className="group relative w-full sm:w-auto min-w-[160px] h-12 flex items-center justify-center bg-white border border-slate-900 rounded shadow-sm hover:shadow-md transition-all active:translate-y-0.5 overflow-hidden disabled:opacity-50">
                                <div className="absolute inset-0 bg-slate-100 translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out"></div>
                                <span className="relative z-10 flex items-center gap-2 font-bold text-slate-900 font-serif">
                                    <span className="material-symbols-outlined text-[20px]">refresh</span>
                                    재응시
                                </span>
                            </button>
                            <button onClick={handleShare} disabled={gameState === 'submitting'} className="group relative w-full sm:w-auto min-w-[160px] h-12 flex items-center justify-center bg-primary border border-primary rounded shadow-sm hover:shadow-md transition-all active:translate-y-0.5 overflow-hidden disabled:opacity-50">
                                <div className="absolute inset-0 bg-blue-700 translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out"></div>
                                <span className="relative z-10 flex items-center gap-2 font-bold text-white font-serif">
                                    <span className="material-symbols-outlined text-[20px]">share</span>
                                    성적표 공유
                                </span>
                            </button>
                            <a href="/" className="group relative w-full sm:w-auto min-w-[160px] h-12 flex items-center justify-center bg-slate-900 border border-slate-900 rounded shadow-sm hover:shadow-md transition-all active:translate-y-0.5 overflow-hidden">
                                <div className="absolute inset-0 bg-slate-800 translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out"></div>
                                <span className="relative z-10 flex items-center gap-2 font-bold text-white font-serif">
                                    <span className="material-symbols-outlined text-[20px]">home</span>
                                    메인으로
                                </span>
                            </a>
                        </div>
                    </div>
                </main>
                <style jsx global>{`
                    @keyframes drawCircle {
                        0% { stroke-dasharray: 1000; stroke-dashoffset: 1000; opacity: 0; }
                        10% { opacity: 1; }
                        100% { stroke-dasharray: 1000; stroke-dashoffset: 0; opacity: 1; }
                    }
                    @keyframes inkFadeIn {
                        0% { opacity: 0; transform: scale(0.95) rotate(-2deg); }
                        100% { opacity: 1; transform: scale(1) rotate(-2deg); }
                    }
                    .animate-draw { animation: drawCircle 1.2s ease-out forwards; }
                `}</style>
            </div>
        );
    }

    return null;
}
