'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import MiddleSchoolGame from '@/components/MiddleSchoolGame';
import { toPng } from 'html-to-image';
import { MiddlePlayedQuestion } from '@/hooks/useMiddleGameSession';

interface GameResult {
    score: number;
    correct: number;
    total: number;
    maxCombo: number;
    playedQuestions: MiddlePlayedQuestion[];
}

interface SessionData {
    seed: string;
    token: string;
    expiresAt: string;
    userId: string;
}

type GameState = 'loading' | 'playing' | 'submitting' | 'result';

export default function MiddlePlayPage() {
    const [gameState, setGameState] = useState<GameState>('loading');
    const [session, setSession] = useState<SessionData | null>(null);
    const sessionRef = useRef<SessionData | null>(null);
    const [result, setResult] = useState<GameResult | null>(null);
    const [rank, setRank] = useState<number | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSharing, setIsSharing] = useState(false);
    const renewIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const resultRef = useRef<HTMLDivElement>(null);

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
                sessionRef.current = data;
                setGameState('playing');
            } catch {
                setError('세션을 시작할 수 없습니다. 다시 시도해주세요.');
            }
        };
        startSession();

        return () => {
            if (renewIntervalRef.current) clearInterval(renewIntervalRef.current);
        };
    }, []);

    const handleGameEnd = useCallback(
        async (gameResult: GameResult) => {
            setResult(gameResult);
            setGameState('submitting');

            if (renewIntervalRef.current) clearInterval(renewIntervalRef.current);

            const currentSession = sessionRef.current;
            if (!currentSession) return;

            try {
                // To keep separated leaderboards, we submit to /api/leaderboard/middle (if you've built it)
                // For now, if we don't have it, we fallback to same submit endpoint but could distinguish by gameMode
                const res = await fetch('/api/submitScore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: currentSession.userId,
                        seed: currentSession.seed,
                        token: currentSession.token,
                        expiresAt: currentSession.expiresAt,
                        score: gameResult.score,
                        playedQuestions: gameResult.playedQuestions,
                        timestamp: new Date().toISOString(),
                        gameMode: 'middle' // Identifies this is middle school mode
                    }),
                });
                const data = await res.json();
                if (res.ok && data.rank) {
                    setRank(data.rank);
                } else if (!res.ok) {
                    console.error('[Score Submit] Server rejected:', res.status, data);
                    setSubmitError(`점수 저장 실패: ${data.error || res.status}`);
                }
            } catch (e) {
                console.error('[Score Submit] Network error:', e);
                setSubmitError('점수 저장 중 네트워크 오류가 발생했습니다.');
            }

            try {
                const accuracy = gameResult.total > 0 ? Math.round((gameResult.correct / gameResult.total) * 100) : 0;
                const currentPb = parseInt(localStorage.getItem('middle_math_pb') || '0', 10);
                if (gameResult.score > currentPb) {
                    localStorage.setItem('middle_math_pb', gameResult.score.toString());
                }
            } catch (e) {
                console.error('Failed to save local stats', e);
            }

            setGameState('result');
        },
        [session]
    );

    const handleShare = async () => {
        if (!result || isSharing) return;
        setIsSharing(true);
        const text = `🧮 중등수학 타임어택\n\n점수: ${result.score.toLocaleString()}점\n정답: ${result.correct}/${result.total}\n최대 콤보: ${result.maxCombo}\n${rank ? `랭킹: ${rank}위` : ''}\n\n나도 도전! →`;

        try {
            if (navigator.share) {
                await navigator.share({ text, url: window.location.origin });
            } else {
                await navigator.clipboard.writeText(text + ' ' + window.location.origin);
                alert('결과가 클립보드에 복사되었습니다!');
            }
        } catch (error) {
            console.error('Share failed:', error);
        } finally {
            setIsSharing(false);
        }
    };

    const handleDownloadImage = async () => {
        if (!resultRef.current || isSharing) return;
        setIsSharing(true);
        try {
            const dataUrl = await toPng(resultRef.current, { backgroundColor: '#f1f5f9', pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `middle_math_result_${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (e) {
            console.error('Failed to save image', e);
            alert('이미지 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setIsSharing(false);
        }
    };

    if (gameState === 'loading') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center font-sans">
                {error ? (
                    <div className="text-center">
                        <p className="text-wrong mb-4">{error}</p>
                        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-primary text-white rounded-xl font-bold">다시 시도</button>
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

    if (gameState === 'playing' && session) {
        return <MiddleSchoolGame seed={session.seed} onGameEnd={handleGameEnd} />;
    }

    if (gameState === 'submitting' || gameState === 'result') {
        const accuracy = result?.total ? Math.round((result.correct / result.total) * 100) : 0;
        let gradeText = "E (노력 요함)";
        if (accuracy >= 90) gradeText = "A (우수)";
        else if (accuracy >= 80) gradeText = "B (보통이상)";
        else if (accuracy >= 70) gradeText = "C (보통)";
        else if (accuracy >= 60) gradeText = "D (미흡)";

        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 flex flex-col font-sans antialiased">
                <header className="w-full bg-white border-b border-[#e0e2e5] px-6 py-3 flex items-center justify-between shadow-sm z-10 print:hidden">
                    <div className="flex items-center gap-3 text-[#111318]">
                        <span className="material-symbols-outlined text-primary text-2xl">school</span>
                        <h2 className="text-[#111318] text-lg font-bold tracking-tight">학업성취도 평가표</h2>
                    </div>
                </header>

                <main className="flex-grow flex items-center justify-center p-4">
                    <div ref={resultRef} className="w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden border border-slate-200">
                        <div className="p-8 pb-4 flex flex-col gap-2 bg-slate-50 border-b border-slate-200">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">성취도 결과</h1>
                            <div className="flex justify-between text-sm font-medium text-slate-500 mt-2">
                                <span>참여자: {session?.userId?.split('#')[0] || '익명'}</span>
                                {rank && <span className="text-primary font-bold">학급 내 상위 {rank}위</span>}
                            </div>
                            {submitError && (
                                <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                                    ⚠️ {submitError}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 px-8 py-8 flex flex-col items-center">
                            <div className="text-7xl font-black text-slate-800 tracking-tighter mb-2">
                                {result?.score.toLocaleString() || '0'}
                            </div>
                            <div className="text-2xl font-bold text-primary mb-8 px-4 py-1 bg-primary/10 rounded-full">
                                등급: {gameState === 'submitting' ? '채점 중...' : gradeText}
                            </div>

                            <div className="w-full grid grid-cols-3 gap-4 text-center border-t border-slate-100 pt-6">
                                <div className="flex flex-col gap-1">
                                    <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">정답</span>
                                    <span className="text-xl font-black text-slate-800">{result?.correct || 0}/{result?.total || 0}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">정답률</span>
                                    <span className="text-xl font-black text-slate-800">{accuracy}%</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">최대 콤보</span>
                                    <span className="text-xl font-black text-slate-800">{result?.maxCombo || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                            <button onClick={() => window.location.reload()} disabled={gameState === 'submitting'} className="flex-1 h-12 bg-white border border-slate-300 rounded-xl font-bold hover:bg-slate-50 transition-colors">재응시</button>
                            <button onClick={handleShare} disabled={gameState === 'submitting'} className="flex-1 h-12 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">공유하기</button>
                            <a href="/" className="flex-none h-12 px-6 flex items-center justify-center bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">메인</a>
                        </div>
                    </div>
                </main>
            </div>
        );
    }
    return null;
}
