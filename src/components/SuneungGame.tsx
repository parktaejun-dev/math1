import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { playLevelUp, playCorrect, playWrong, playTick, playTimeGain, playTimeLoss } from '@/lib/sound';
import { useGameSession, PlayedQuestion } from '@/hooks/useGameSession';
import { useGameTimer } from '@/hooks/useGameTimer';
import QuestionBoard from '@/components/ui/QuestionBoard';
import FeedbackOverlay from '@/components/ui/FeedbackOverlay';

interface GameResult {
    score: number;
    correct: number;
    total: number;
    maxCombo: number;
    playedQuestions: PlayedQuestion[];
}

interface SuneungGameProps {
    seed: string;
    onGameEnd: (result: GameResult) => void;
}

const GAME_DURATION = 60; // seconds
const COMBO_FEVER_THRESHOLD = 10;

function getComboMultiplier(combo: number): number {
    if (combo >= 30) return 3.0;
    if (combo >= 20) return 2.5;
    if (combo >= 15) return 2.0;
    if (combo >= 10) return 1.6;
    if (combo >= 5) return 1.3;
    return 1.0;
}

interface MilestoneBonus { points: number; time: number; label: string; }
function getMilestoneBonus(combo: number): MilestoneBonus | null {
    if (combo === 10) return { points: 500, time: 5, label: '🔥 10연속 정답!' };
    if (combo === 20) return { points: 1500, time: 8, label: '⚡ 20연속 정답!!' };
    if (combo === 30) return { points: 3000, time: 10, label: '🌟 30연속 정답!!!' };
    if (combo === 50) return { points: 5000, time: 12, label: '💎 50연속 정답!!!!' };
    return null;
}

export default function SuneungGame({ seed, onGameEnd }: SuneungGameProps) {
    const [score, setScore] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [isFever, setIsFever] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [milestoneText, setMilestoneText] = useState<string | null>(null);

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
    } = useGameSession({
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
        loadQuestion(0, 1);
    }, [isReady, loadQuestion]);

    useEffect(() => {
        if (timeLeft > 0 && timeLeft <= 10 && !isGameOver) {
            playTick();
        }
    }, [timeLeft, isGameOver]);

    // Track score changes for GameOver logic since setState might be delayed
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
        let nextLevel = Math.max(currentLevel, Math.floor(newCombo / 10) + 1);

        if (nextLevel > currentLevel) {
            setShowLevelUp(true);
            setTimeout(() => setShowLevelUp(false), 2000);
            playLevelUp();
        }

        let timeBonus = 8;
        if (nextLevel === 2) timeBonus = 6;
        else if (nextLevel === 3) timeBonus = 4;
        else if (nextLevel >= 4) timeBonus = 3;

        const milestone = getMilestoneBonus(newCombo);
        if (milestone) {
            timeBonus += milestone.time;
            setMilestoneText(milestone.label);
            setTimeout(() => setMilestoneText(null), 2000);
        }

        addTime(timeBonus);
        setTimeLeft(prev => Math.min(GAME_DURATION, prev));
        playTimeGain();

        const comboMultiplier = getComboMultiplier(newCombo);
        // We use Math.max(0, timeLeft) since it could be theoretically less
        const basePoints = 100 + Math.floor(Math.max(0, timeLeft) * 10);
        let points = Math.round(basePoints * comboMultiplier);

        if (milestone) {
            points += milestone.points;
        }

        setIsFever(newIsFever);
        setMaxCombo(prev => Math.max(prev, newCombo));
        setScore(prev => prev + points);

        setTimeout(() => {
            nextQuestion(nextLevel);
        }, 300);
    };

    const handleSessionWrong = () => {
        playWrong();
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        const timePenalty = 5 + Math.floor(combo / 10) * 2;
        const scorePenalty = Math.min(500, combo * 20);

        setIsFever(false);
        addTime(-timePenalty);
        setTimeLeft(prev => Math.max(0, prev)); // minimum 0
        if (scorePenalty > 0) {
            setScore(prev => Math.max(0, prev - scorePenalty));
        }
        playTimeLoss();

        setTimeout(() => {
            // Note: level persists — no reset on miss
            nextQuestion();
        }, 500);
    };

    const timerPercent = (timeLeft / GAME_DURATION) * 100;
    const isUrgent = timeLeft <= 10;

    if (!isReady || !currentQuestion) {
        return (
            <div className="flex items-center justify-center min-h-screen w-full bg-background">
                <div className="animate-pulse text-2xl text-primary font-bold">
                    문제 준비중...
                </div>
            </div>
        );
    }

    return (
        <div className="bg-paper text-ink font-sans h-screen flex flex-col overflow-hidden select-none">
            {/* Top progress bar for time left */}
            <div className="w-full h-1 bg-slate-200 flex-shrink-0">
                <div
                    className={`h-full transition-all duration-1000 ease-linear ${isUrgent ? 'bg-grading-red animate-pulse' : 'bg-primary'}`}
                    style={{ width: `${Math.max(0, timerPercent)}%` }}
                ></div>
            </div>

            {/* Header */}
            <header className="w-full bg-paper border-b border-black flex-shrink-0 px-4 py-2 flex items-center justify-between z-10 shadow-sm h-12 relative">
                {showLevelUp && (
                    <div className="absolute inset-0 bg-blue-500/20 animate-pulse pointer-events-none" />
                )}

                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-start">
                        <div className={`text-xs font-bold leading-none ${currentLevel >= 5 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
                            {currentLevel >= 5 ? 'INSANE' : `LV.${currentLevel}`}
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
                    <Link href="/">
                        <h1 className="text-base font-bold text-slate-900 leading-none tracking-tight ml-2 cursor-pointer hover:opacity-80 transition-opacity">
                            수능 1번
                        </h1>
                    </Link>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded border border-slate-300 relative">
                    <span className={`material-symbols-outlined text-[16px] ${isUrgent ? 'text-grading-red' : 'text-primary'}`}>timer</span>
                    <span className={`font-bold font-mono text-sm leading-none ${isUrgent ? 'text-grading-red animate-pulse' : 'text-primary'}`}>{Math.max(0, timeLeft)}초</span>
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
            <main className="flex-grow flex flex-col p-4 w-full max-w-md mx-auto h-full overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))] relative">

                <FeedbackOverlay
                    feedback={feedback}
                    correctText={combo > 0 ? (combo % 10 === 0 ? "Perfect!" : "1등급") : "1등급"}
                    wrongText="오답"
                />

                {/* Draw animation lines */}
                {feedback === 'correct' && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
                        <div className="text-green-500 opacity-80" style={{ animation: 'drawCircle 0.3s ease-out forwards' }}>
                            <svg width="200" height="200" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray="252" strokeDashoffset="252" style={{ animation: 'drawCircle 0.3s ease-out forwards' }} />
                            </svg>
                        </div>
                    </div>
                )}
                {feedback === 'wrong' && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
                        <div className="text-red-500 opacity-80">
                            <svg width="200" height="200" viewBox="0 0 100 100">
                                <path d="M 20,80 L 80,20" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray="85" strokeDashoffset="85" style={{ animation: 'drawSlash 0.3s ease-out forwards' }} />
                            </svg>
                        </div>
                    </div>
                )}

                {milestoneText && (
                    <div className="absolute inset-x-0 top-4 flex justify-center z-50 pointer-events-none">
                        <div
                            className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-900 font-black text-xl px-8 py-3 rounded-2xl shadow-lg border-2 border-amber-500"
                            style={{ animation: 'milestonePop 2s ease-out forwards' }}
                        >
                            {milestoneText}
                        </div>
                    </div>
                )}

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
                <div className="flex flex-col w-24">
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-0.5">Score</span>
                    <span className={`text-xl leading-none font-black ${feedback === 'correct' ? 'text-primary scale-110' : 'text-slate-800'} transition-transform duration-150`}>
                        {score.toLocaleString()}
                    </span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-0.5">Question</span>
                    <span className="text-base leading-none font-black text-slate-800">{currentIndex + 1}</span>
                </div>
                <div className="flex flex-col items-end w-24">
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
                @keyframes drawCircle {
                    from { stroke-dashoffset: 252; opacity: 0; }
                    10% { opacity: 1; }
                    to { stroke-dashoffset: 0; opacity: 1; }
                }
                @keyframes drawSlash {
                    from { stroke-dashoffset: 85; opacity: 0; }
                    10% { opacity: 1; }
                    to { stroke-dashoffset: 0; opacity: 1; }
                }
                @keyframes milestonePop {
                    0% { transform: scale(0.5) translateY(20px); opacity: 0; }
                    15% { transform: scale(1.2) translateY(0); opacity: 1; }
                    25% { transform: scale(1.0) translateY(0); }
                    80% { transform: scale(1.0) translateY(0); opacity: 1; }
                    100% { transform: scale(0.8) translateY(-30px); opacity: 0; }
                }
                @keyframes slideIn {
                    from { transform: translateX(20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .slide-in {
                    animation: slideIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
