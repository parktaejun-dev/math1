import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CognitiveType } from '@/lib/MiddleMathGenerator';
import { playCorrect, playWrong } from '@/lib/sound';
import { useMiddleGameSession } from '@/hooks/useMiddleGameSession';
import { useGameTimer } from '@/hooks/useGameTimer';
import QuestionBoard from '@/components/ui/QuestionBoard';
import FeedbackOverlay from '@/components/ui/FeedbackOverlay';

interface MiddlePracticeGameProps {
    seed: string;
    allowedTypes: CognitiveType[];
    onQuit: () => void;
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function MiddlePracticeGame({ seed, allowedTypes, onQuit }: MiddlePracticeGameProps) {
    const [gameState, setGameState] = useState<'playing' | 'result'>('playing');

    // Reuse the specialized middle school session hook
    const {
        isReady,
        currentIndex,
        currentQuestion,
        feedback,
        correctCount,
        selectedAnswer,
        isProcessing,
        loadQuestion,
        submitAnswer,
        submitPass,
        nextQuestion,
    } = useMiddleGameSession({
        seed,
        allowedTypes,
        onCorrect: () => handleSessionCorrect(),
        onWrong: () => handleSessionWrong()
    });

    const {
        time: elapsedTime,
    } = useGameTimer({
        mode: 'stopwatch',
        initialValue: 0,
        isPlaying: isReady && gameState === 'playing',
    });

    useEffect(() => {
        if (!isReady || gameState !== 'playing') return;
        if (currentIndex === 0 && !currentQuestion) {
            loadQuestion(0);
        }
    }, [isReady, gameState, currentIndex, currentQuestion, loadQuestion]);

    const handleSessionCorrect = () => {
        playCorrect();
        if (navigator.vibrate) navigator.vibrate(50);
        setTimeout(() => nextQuestion(), 300);
    };

    const handleSessionWrong = () => {
        playWrong();
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        setTimeout(() => nextQuestion(), 600);
    };

    const handleStopPractice = () => {
        setGameState('result');
    };

    if (gameState === 'result') {
        const accuracy = currentIndex > 0 ? Math.round((correctCount / currentIndex) * 100) : 0;
        let gradeText = "Keep trying!";
        if (accuracy >= 90) gradeText = "Excellent!";
        else if (accuracy >= 70) gradeText = "Great Job!";
        else if (accuracy >= 50) gradeText = "Good Effort!";

        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 flex flex-col font-sans antialiased overflow-x-hidden selection:bg-amber-600/20 selection:text-amber-600">
                <header className="w-full bg-white border-b border-[#e0e2e5] px-6 py-3 flex items-center justify-between shadow-sm z-10 print:hidden">
                    <div className="flex items-center gap-3 text-[#111318]">
                        <span className="material-symbols-outlined text-amber-600 text-2xl">exercise</span>
                        <h2 className="text-[#111318] text-lg font-bold tracking-tight">중등 연습 결과</h2>
                    </div>
                </header>

                <main className="flex-grow flex items-center justify-center p-4 sm:p-8">
                    <div className="relative w-full max-w-[800px] min-h-[600px] bg-paper shadow-2xl flex flex-col overflow-hidden animate-slideUp before:absolute before:inset-0 before:bg-[url('data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\' opacity=\'0.08\'/%3E%3C/svg%3E')] before:pointer-events-none">

                        <div className="border-b-2 border-slate-800 p-6 sm:p-8 pb-4 mx-4 sm:mx-8 mt-4 sm:mt-8 flex flex-col gap-2">
                            <div className="flex justify-between items-end">
                                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight font-serif">성적 통지표</h1>
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold text-slate-600 font-serif">중등수학</p>
                                    <div className="border border-slate-800 rounded-full px-4 py-1 mt-1 inline-block bg-white/50">
                                        <span className="font-bold text-lg font-serif text-amber-700">연습형</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between text-sm font-medium text-slate-500 mt-4 font-serif border-t border-slate-300 pt-2">
                                <span>연습 시간: {formatTime(elapsedTime)}</span>
                            </div>
                        </div>

                        <div className="flex-1 px-4 sm:px-8 py-8 flex flex-col items-center relative">
                            <div className="w-full max-w-lg relative z-0 mt-4">
                                <div className="relative w-full aspect-square max-w-[300px] mx-auto flex items-center justify-center">
                                    <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                                        <svg className="w-full h-full text-amber-600 opacity-90 rotate-[-5deg]" viewBox="0 0 200 200">
                                            <path
                                                className="animate-draw"
                                                d="M 40 100 C 40 40, 160 40, 160 100 C 160 160, 40 160, 40 100"
                                                fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8" style={{ filter: 'drop-shadow(2px 4px 6px rgba(217, 119, 6, 0.3))' }}
                                            />
                                            <path
                                                className="animate-draw"
                                                d="M 35 105 C 30 150, 150 170, 165 95"
                                                fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4" style={{ animationDelay: '0.8s', opacity: 0 }}
                                            />
                                        </svg>
                                    </div>
                                    <div className="relative z-20 flex flex-col items-center justify-center" style={{ animation: 'inkFadeIn 0.8s ease-out 0.5s forwards', opacity: 0 }}>
                                        <div className="text-[80px] sm:text-[100px] leading-none font-handwriting text-amber-600 drop-shadow-sm -rotate-2">
                                            {accuracy}
                                        </div>
                                        <div className="text-2xl sm:text-3xl font-handwriting text-amber-600 mt-[-10px] -rotate-2 opacity-80">
                                            {gradeText}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 border-t-2 border-slate-800 pt-6 grid grid-cols-3 gap-4 text-center">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-slate-500 font-serif text-[10px] sm:text-xs uppercase tracking-widest">푼 문제</span>
                                        <span className="font-handwriting text-2xl sm:text-3xl text-amber-600 -rotate-1" style={{ animation: 'inkFadeIn 0.8s ease-out 0.8s forwards', opacity: 0 }}>{currentIndex}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-slate-500 font-serif text-[10px] sm:text-xs uppercase tracking-widest">정답 수</span>
                                        <span className="font-handwriting text-2xl sm:text-3xl text-amber-600 -rotate-1" style={{ animation: 'inkFadeIn 0.8s ease-out 1.0s forwards', opacity: 0 }}>{correctCount}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-slate-500 font-serif text-[10px] sm:text-xs uppercase tracking-widest">정답률</span>
                                        <span className="font-handwriting text-2xl sm:text-3xl text-amber-600 -rotate-1" style={{ animation: 'inkFadeIn 0.8s ease-out 1.2s forwards', opacity: 0 }}>{accuracy}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto p-6 sm:p-8 border-t border-slate-200 bg-white/40 backdrop-blur-sm flex justify-center items-center">
                            <button onClick={onQuit} className="group relative w-full sm:w-auto min-w-[200px] h-12 flex items-center justify-center bg-slate-900 border border-slate-900 rounded shadow-sm hover:shadow-md transition-all active:translate-y-0.5 overflow-hidden">
                                <span className="relative z-10 flex items-center gap-2 font-bold text-white font-serif">
                                    <span className="material-symbols-outlined text-[20px]">home</span>
                                    메인으로 돌아가기
                                </span>
                            </button>
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
                    @keyframes slideUp {
                        from { transform: translateY(20px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    .animate-slideUp { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                `}</style>
            </div>
        );
    }

    if (!isReady || !currentQuestion) {
        return (
            <div className="flex items-center justify-center min-h-screen w-full bg-slate-50">
                <div className="animate-pulse text-2xl text-amber-600 font-bold">로딩중...</div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 text-slate-900 font-sans h-screen flex flex-col overflow-hidden select-none">
            {/* Header */}
            <header className="w-full bg-white border-b border-slate-200 flex-shrink-0 px-4 py-3 flex flex-row items-center justify-between z-10 shadow-sm">
                <Link href="/" className="flex items-center justify-start gap-4 hover:opacity-80 transition-opacity">
                    <div className="bg-amber-100/50 p-2 rounded-lg text-amber-700 flex items-center justify-center">
                        <span className="material-symbols-outlined block leading-none">exercise</span>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-base font-bold text-slate-900 leading-none">중등 연습</h1>
                        <p className="text-xs text-slate-500 mt-1 whitespace-nowrap">시간 제한 없음</p>
                    </div>
                </Link>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    <span className="material-symbols-outlined text-[16px] text-slate-600">schedule</span>
                    <span className="font-bold font-mono text-sm leading-none text-slate-700">{formatTime(elapsedTime)}</span>
                </div>
            </header>

            {/* Main Area */}
            <main className="flex-grow flex flex-col p-4 w-full max-w-md mx-auto h-full overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))] relative">
                <FeedbackOverlay
                    feedback={feedback}
                    correctText="정답!"
                    wrongText="오답"
                />

                <QuestionBoard
                    currentIndex={currentIndex}
                    currentQuestion={currentQuestion}
                    feedback={feedback}
                    selectedAnswer={selectedAnswer}
                    onAnswer={submitAnswer}
                    isProcessing={isProcessing}
                    onPass={submitPass}
                    passPenaltyText="오답으로 기록됨 (시간 제약 없음)"
                    aiMode={true}
                />
            </main>

            {/* Bottom Status Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 flex justify-between items-center shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-50 px-6 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-0.5">Progress</span>
                    <span className="text-lg leading-none font-black text-amber-600">
                        {currentIndex + 1}문제
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleStopPractice}
                        className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow active:scale-95 transition-all"
                    >
                        종료
                    </button>
                </div>
            </div>

            <style jsx global>{`
                .katex-display {
                    overflow-x: auto;
                    overflow-y: hidden;
                    padding-bottom: 0.5rem;
                    text-align: left !important;
                    margin: 0 !important;
                }
                .katex-display::-webkit-scrollbar { height: 4px; }
                .katex-display::-webkit-scrollbar-track { background: transparent; }
                .katex-display::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                @keyframes slideIn {
                    from { transform: translateX(20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .slide-in { animation: slideIn 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
}
