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
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-slideUp">
                    <div className="bg-amber-600 p-6 text-center">
                        <h2 className="text-2xl font-bold tracking-tight text-white mb-1">중등 연습 결과</h2>
                        <div className="text-white/80 text-sm font-medium">수고하셨습니다!</div>
                    </div>
                    <div className="p-8">
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">푼 문제</div>
                                <div className="text-3xl font-black text-slate-800">{currentIndex}</div>
                            </div>
                            <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                                <div className="text-[11px] font-bold text-green-600 uppercase tracking-wider mb-1">정답 수</div>
                                <div className="text-3xl font-black text-green-700">{correctCount}</div>
                            </div>
                            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                                <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">정답률</div>
                                <div className="text-3xl font-black text-blue-700">
                                    {currentIndex > 0 ? Math.round((correctCount / currentIndex) * 100) : 0}%
                                </div>
                            </div>
                            <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                                <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">진행 시간</div>
                                <div className="text-3xl font-black text-amber-700 font-mono tracking-tighter">{formatTime(elapsedTime)}</div>
                            </div>
                        </div>

                        <button
                            onClick={onQuit}
                            className="w-full h-14 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 transition-colors active:translate-y-0.5"
                        >
                            메인으로 돌아가기
                        </button>
                    </div>
                </div>
                <style jsx global>{`
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
