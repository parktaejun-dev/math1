import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { playLevelUp, playCorrect, playWrong, playTick, playTimeGain, playTimeLoss } from '@/lib/sound';
import { useMiddleGameSession, MiddlePlayedQuestion } from '@/hooks/useMiddleGameSession';
import { useGameTimer } from '@/hooks/useGameTimer';
import QuestionBoard from '@/components/ui/QuestionBoard';
import FeedbackOverlay from '@/components/ui/FeedbackOverlay';

interface GameResult {
    score: number;
    correct: number;
    total: number;
    maxCombo: number;
    playedQuestions: MiddlePlayedQuestion[];
}

interface MiddleSchoolGameProps {
    seed: string;
    onGameEnd: (result: GameResult) => void;
}

const GAME_DURATION = 60; // Max 60s
const COMBO_FEVER_THRESHOLD = 10;

// Deflating reward to prevent infinite play
function getCorrectTimeReward(correctIndex: number): number {
    if (correctIndex <= 20) return 2.5;
    if (correctIndex <= 40) return 1.2;
    return 0.5;
}

function getComboMultiplier(combo: number): number {
    if (combo >= 30) return 3.0;
    if (combo >= 20) return 2.5;
    if (combo >= 15) return 2.0;
    if (combo >= 10) return 1.6;
    if (combo >= 5) return 1.3;
    return 1.0;
}

export default function MiddleSchoolGame({ seed, onGameEnd }: MiddleSchoolGameProps) {
    const [score, setScore] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [isFever, setIsFever] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);

    const {
        isReady,
        currentIndex,
        currentQuestion,
        feedback,
        correctCount,
        combo,
        currentLevel,
        selectedAnswer,
        isProcessing,
        playedQuestionsRef,
        loadQuestion,
        submitAnswer,
        nextQuestion,
    } = useMiddleGameSession({
        seed,
        onCorrect: (newCombo) => handleSessionCorrect(newCombo),
        onWrong: () => handleSessionWrong()
    });

    const {
        time: timeLeft,
        setTime: setTimeLeft,
        timeDelta,
        addTime
    } = useGameTimer({
        mode: 'countdown',
        initialValue: GAME_DURATION,
        isPlaying: isReady && !isGameOver,
        onComplete: () => handleGameOver()
    });

    useEffect(() => {
        if (!isReady) return;
        loadQuestion(0, false, false);
    }, [isReady, loadQuestion]);

    useEffect(() => {
        if (timeLeft > 0 && timeLeft <= 5 && !isGameOver) {
            playTick();
        }
    }, [timeLeft, isGameOver]);

    const currentScore = score;
    const currentCorrectCount = correctCount;
    const currentMaxCombo = maxCombo;
    const currentPlayedQuestions = playedQuestionsRef.current;

    const handleGameOver = () => {
        if (isGameOver) return;
        setIsGameOver(true);
        onGameEnd({
            score: currentScore,
            correct: currentCorrectCount,
            total: currentIndex,
            maxCombo: currentMaxCombo,
            playedQuestions: currentPlayedQuestions,
        });
    };

    const handleSessionCorrect = (newCombo: number) => {
        playCorrect();
        if (navigator.vibrate) navigator.vibrate(50);

        const newIsFever = newCombo >= COMBO_FEVER_THRESHOLD;
        const timeBonus = getCorrectTimeReward(correctCount + 1);

        addTime(timeBonus);
        setTimeLeft(prev => Math.min(GAME_DURATION, prev));
        playTimeGain();

        // Points
        const comboMultiplier = getComboMultiplier(newCombo);
        const basePoints = 100 + Math.floor(Math.max(0, timeLeft) * 10);
        const points = Math.round(basePoints * comboMultiplier);

        setIsFever(newIsFever);
        setMaxCombo(prev => Math.max(prev, newCombo));
        setScore(prev => prev + points);

        setTimeout(() => {
            nextQuestion(newIsFever, false);
        }, 300);
    };

    const handleSessionWrong = () => {
        playWrong();
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        // Strict survival penalty for Arcade mode
        const timePenalty = 3.5;
        const nextTimeLeft = Math.max(0, timeLeft - timePenalty);

        setIsFever(false);
        addTime(-timePenalty);
        playTimeLoss();

        if (nextTimeLeft <= 4) { // Absolute Minimum Time rule, if hits 4 or less -> game over fast
            setTimeLeft(0);
            handleGameOver();
            return;
        }

        setTimeout(() => {
            // isRecovery = true -> force primitive level cognitive question to recover rhythm
            nextQuestion(false, true);
        }, 500);
    };

    const timerPercent = (timeLeft / GAME_DURATION) * 100;
    const isUrgent = timeLeft <= 5; // Urgent warning at 5s

    if (!isReady || !currentQuestion) {
        return (
            <div className="flex items-center justify-center min-h-screen w-full bg-background">
                <div className="animate-pulse text-2xl text-primary font-bold">
                    스테이지 준비중...
                </div>
            </div>
        );
    }

    return (
        <div className="bg-paper text-ink font-sans flex flex-col overflow-hidden select-none" style={{ height: '100dvh' }}>
            {/* Top progress bar for time left */}
            <div className="w-full h-1 bg-slate-200 flex-shrink-0">
                <div
                    className={`h-full transition-all duration-100 ease-linear ${isUrgent ? 'bg-grading-red animate-pulse' : 'bg-primary'}`}
                    style={{ width: `${Math.max(0, timerPercent)}%` }}
                ></div>
            </div>

            {/* Header */}
            <header className="w-full bg-paper border-b border-black flex-shrink-0 px-4 py-2 flex items-center justify-between z-10 shadow-sm h-12 relative">
                <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="flex flex-col items-start">
                        <div className={`text-xs font-bold leading-none ${currentLevel >= 4 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
                            {currentLevel >= 5 ? 'FEVER' : `STAGE.${currentLevel}`}
                        </div>
                        <div
                            key={combo}
                            className={`text-sm font-bold transition-colors duration-200 ${isFever
                                ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]'
                                : combo >= 8 ? 'text-red-500'
                                    : combo >= 5 ? 'text-orange-500'
                                        : combo >= 3 ? 'text-amber-600'
                                            : 'text-primary'
                                }`}
                            style={{
                                animation: combo > 0 ? 'comboPop 0.25s ease-out' : 'none',
                                fontSize: isFever ? '0.95rem' : undefined,
                            }}
                        >
                            {isFever ? `🔥 ${getComboMultiplier(combo)}x` : combo > 0 ? `${combo}연속 정답` : '0연속 정답'}
                        </div>
                    </div>
                    <h1 className="text-base font-bold text-slate-900 leading-none tracking-tight ml-2">
                        중등 아케이드
                    </h1>
                </Link>
                <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded border border-slate-300 relative">
                    <span className={`material-symbols-outlined text-[16px] ${isUrgent ? 'text-grading-red' : 'text-primary'}`}>timer</span>
                    <span className={`font-bold font-mono text-sm leading-none ${isUrgent ? 'text-grading-red animate-pulse' : 'text-primary'}`}>{Math.ceil(Math.max(0, timeLeft))}초</span>
                    {timeDelta && (
                        <span
                            key={timeDelta.key}
                            className={`absolute -top-6 right-0 font-bold text-sm pointer-events-none ${timeDelta.value > 0 ? 'text-green-600' : 'text-red-600'}`}
                            style={{ animation: 'floatUp 0.8s ease-out forwards' }}
                        >
                            {timeDelta.value > 0 ? `+${timeDelta.value}초` : `${timeDelta.value}초`}
                        </span>
                    )}
                </div>
            </header>

            {/* Main Area */}
            <main className="flex-grow flex flex-col p-3 sm:p-4 w-full max-w-md mx-auto overflow-hidden pb-[calc(5rem+env(safe-area-inset-bottom))] relative">
                <FeedbackOverlay
                    feedback={feedback}
                    correctText={combo >= 10 ? "Fever!" : "정답"}
                    wrongText="오답"
                />

                <QuestionBoard
                    currentIndex={currentIndex}
                    currentQuestion={currentQuestion}
                    feedback={feedback}
                    selectedAnswer={selectedAnswer}
                    onAnswer={submitAnswer}
                    isProcessing={isProcessing}
                />
            </main>

            {/* Bottom Status Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-paper border-t border-slate-300 p-3 flex justify-between items-center shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50">
                <div className="flex flex-col w-20">
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-0.5">Score</span>
                    <span className={`text-xl leading-none font-black ${feedback === 'correct' ? 'text-primary scale-110' : 'text-slate-800'} transition-transform duration-150`}>
                        {score.toLocaleString()}
                    </span>
                </div>

                <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-0.5">Stage</span>
                    <span className="text-base leading-none font-black text-slate-800">{currentIndex + 1}</span>
                </div>

                <div className="flex flex-col items-end w-20">
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-0.5">Accuracy</span>
                    <span className="text-base leading-none font-black text-slate-800">
                        {currentIndex > 0 ? Math.round((correctCount / currentIndex) * 100) : 0}%
                    </span>
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
                .katex-display::-webkit-scrollbar {
                    height: 4px;
                }
                .katex-display::-webkit-scrollbar-track {
                    background: transparent;
                }
                .katex-display::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }
                @keyframes floatUp {
                    0% { transform: translateY(0); opacity: 1; }
                    100% { transform: translateY(-20px); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
