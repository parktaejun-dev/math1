import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import katex from 'katex';
import { Question } from '@/lib/MathGenerator';

interface PlayedQuestion {
    questionId: string;
    selectedAnswer: number;
    correct: boolean;
    timeMs: number;
    level: number;
}

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
const BASE_SCORE = 100;

// Scaling combo multiplier — makes maintaining combos exponentially better
function getComboMultiplier(combo: number): number {
    if (combo >= 30) return 3.0;
    if (combo >= 20) return 2.5;
    if (combo >= 15) return 2.0;
    if (combo >= 10) return 1.6;
    if (combo >= 5) return 1.3;
    return 1.0;
}

// Milestone bonuses at specific combo thresholds
interface MilestoneBonus { points: number; time: number; label: string; }
function getMilestoneBonus(combo: number): MilestoneBonus | null {
    if (combo === 10) return { points: 500, time: 5, label: '🔥 10 COMBO!' };
    if (combo === 20) return { points: 1500, time: 8, label: '⚡ 20 COMBO!!' };
    if (combo === 30) return { points: 3000, time: 10, label: '🌟 30 COMBO!!!' };
    if (combo === 50) return { points: 5000, time: 12, label: '💎 50 COMBO!!!!' };
    return null;
}

// Client-side question generator (dynamic import to avoid SSR issues)
let generateQuestionFn: ((seed: string, index: number, level?: number) => Question) | null = null;

import { playLevelUp, playCorrect, playWrong, playTick, playTimeGain, playTimeLoss } from '@/lib/sound';

export default function SuneungGame({ seed, onGameEnd }: SuneungGameProps) {
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [isFever, setIsFever] = useState(false);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [correctCount, setCorrectCount] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [timeDelta, setTimeDelta] = useState<{ value: number; key: number } | null>(null);
    const [milestoneText, setMilestoneText] = useState<string | null>(null);

    const playedQuestionsRef = useRef<PlayedQuestion[]>([]);
    const questionStartTimeRef = useRef<number>(Date.now());
    const processingRef = useRef(false); // Lock to prevent rapid-click exploits
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Load the generator
    useEffect(() => {
        import('@/lib/MathGenerator').then((mod) => {
            generateQuestionFn = mod.generateQuestion;
            setIsReady(true);
        });
    }, []);

    // Generate question
    const loadQuestion = useCallback(
        (index: number, level: number = 1) => {
            if (!generateQuestionFn) return;
            const q = generateQuestionFn(seed, index, level);
            setCurrentQuestion(q);
            questionStartTimeRef.current = Date.now();
            setFeedback(null);
        },
        [seed]
    );

    // Start game
    useEffect(() => {
        if (!isReady) return;
        loadQuestion(0, 1);

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isReady, loadQuestion]);

    // Tick sound for last 10 seconds (outside state updater for mobile compatibility)
    useEffect(() => {
        if (timeLeft > 0 && timeLeft <= 10 && !isGameOver) {
            playTick();
        }
    }, [timeLeft, isGameOver]);

    // Game over when time runs out
    useEffect(() => {
        if (timeLeft <= 0 && !isGameOver) {
            setIsGameOver(true);
            onGameEnd({
                score,
                correct: correctCount,
                total: currentIndex,
                maxCombo,
                playedQuestions: playedQuestionsRef.current,
            });
        }
    }, [timeLeft, isGameOver, score, correctCount, currentIndex, maxCombo, onGameEnd]);

    // Handle answer selection
    const handleAnswer = useCallback(
        (selected: number) => {
            if (!currentQuestion || feedback || isGameOver || processingRef.current) return;
            processingRef.current = true; // Lock immediately (synchronous)

            const timeMs = Date.now() - questionStartTimeRef.current;
            const isCorrect = selected === currentQuestion.answer;

            const played: PlayedQuestion = {
                questionId: currentQuestion.id,
                selectedAnswer: selected,
                correct: isCorrect,
                timeMs,
                level: currentLevel,
            };
            playedQuestionsRef.current.push(played);

            // Play sound effect safely
            if (isCorrect) playCorrect();
            else playWrong();

            let newLevel = currentLevel;

            if (isCorrect) {
                const newCombo = combo + 1;
                const newIsFever = newCombo >= COMBO_FEVER_THRESHOLD;
                newLevel = Math.max(currentLevel, Math.floor(newCombo / 10) + 1); // Never drops below current

                if (newLevel > currentLevel) {
                    setCurrentLevel(newLevel);
                    setShowLevelUp(true);
                    setTimeout(() => setShowLevelUp(false), 2000);
                    playLevelUp();
                }

                // Calculate time bonus (decaying survival timer)
                let timeBonus = Math.max(2, Math.round(12 * Math.exp(-newCombo / 12)));
                if (newLevel >= 5) timeBonus = 15;

                // Milestone bonus (10, 20, 30, 50 combo)
                const milestone = getMilestoneBonus(newCombo);
                if (milestone) {
                    timeBonus += milestone.time;
                    setMilestoneText(milestone.label);
                    setTimeout(() => setMilestoneText(null), 2000);
                }

                setTimeLeft((prev) => Math.min(GAME_DURATION, prev + timeBonus));
                // Time gain animation + sound
                playTimeGain();
                setTimeDelta({ value: timeBonus, key: Date.now() });
                setTimeout(() => setTimeDelta(null), 800);

                // Calculate points with scaling combo multiplier
                const comboMultiplier = getComboMultiplier(newCombo);
                const basePoints = 100 + (newCombo * 5) + Math.floor(timeLeft * 2);
                let points = Math.round(basePoints * comboMultiplier);

                // Add milestone bonus points
                if (milestone) {
                    points += milestone.points;
                }

                setCombo(newCombo);
                setIsFever(newIsFever);
                setMaxCombo((prev) => Math.max(prev, newCombo));
                setScore((prev) => prev + points);
                setCorrectCount((prev) => prev + 1);
                setFeedback('correct');
            } else {
                // Combo break penalty — scales with how high the combo was
                const timePenalty = Math.min(10, 3 + Math.floor(combo / 5));
                const scorePenalty = combo * 10;

                setCombo(0);
                setIsFever(false);
                // Penalty: deduct scaled time for wrong answer
                setTimeLeft((prev) => Math.max(0, prev - timePenalty));
                // Deduct score (minimum 0)
                if (scorePenalty > 0) {
                    setScore((prev) => Math.max(0, prev - scorePenalty));
                }
                // Time loss animation + sound
                playTimeLoss();
                setTimeDelta({ value: -timePenalty, key: Date.now() });
                setTimeout(() => setTimeDelta(null), 800);
                // Level persists — no reset on miss
                setFeedback('wrong');
            }

            // Move to next question after brief feedback
            setTimeout(() => {
                processingRef.current = false; // Unlock for next question
                const nextIndex = currentIndex + 1;
                setCurrentIndex(nextIndex);
                loadQuestion(nextIndex, newLevel);
            }, 300); // Increased feedback duration slightly for visual effect
        },
        [currentQuestion, feedback, isGameOver, combo, currentLevel, currentIndex, loadQuestion]
    );

    // Render KaTeX safely
    const renderLatex = (latex: string) => {
        try {
            return {
                __html: katex.renderToString(latex, {
                    throwOnError: false,
                    displayMode: true,
                }),
            };
        } catch {
            return { __html: latex };
        }
    };

    // Timer percentage
    const timerPercent = (timeLeft / GAME_DURATION) * 100;
    const isUrgent = timeLeft <= 10;

    // Combo gauge percentage
    const comboPercent = Math.min((combo / COMBO_FEVER_THRESHOLD) * 100, 100);

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
                    style={{ width: `${timerPercent}%` }}
                ></div>
            </div>

            {/* Header */}
            <header className="w-full bg-paper border-b border-black flex-shrink-0 px-4 py-2 flex items-center justify-between z-10 shadow-sm h-12 relative">
                {/* Level Up Flash */}
                {showLevelUp && (
                    <div className="absolute inset-0 bg-blue-500/20 animate-pulse pointer-events-none" />
                )}

                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-start">
                        <div className={`text-xs font-bold leading-none ${currentLevel >= 5 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
                            {currentLevel >= 5 ? 'INSANE' : `LV.${currentLevel}`}
                        </div>
                        <div
                            key={combo} /* Force re-mount for pop animation on every combo change */
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
                            {isFever ? `🔥 ${getComboMultiplier(combo)}x` : combo > 0 ? `${combo} COMBO` : '0 COMBO'}
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
                    <span className={`font-bold font-mono text-sm leading-none ${isUrgent ? 'text-grading-red animate-pulse' : 'text-primary'}`}>{timeLeft}초</span>
                    {/* Floating time delta animation */}
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
            <main className="flex-grow flex flex-col p-4 w-full max-w-md mx-auto h-full overflow-y-auto pb-24 relative">

                {/* Visual Feedback Overlays */}
                {feedback === 'correct' && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
                        <div className="text-grading-red opacity-80" style={{ animation: 'drawCircle 0.5s ease-out forwards' }}>
                            <svg width="200" height="200" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray="252" strokeDashoffset="252" style={{ animation: 'drawCircle 0.4s ease-out forwards' }} />
                            </svg>
                        </div>
                    </div>
                )}

                {/* Milestone Banner */}
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

                {/* Question Area */}
                <div className={`flex flex-col gap-2 mb-4 transition-transform duration-300 ${feedback === 'wrong' ? 'animate-shake' : ''}`}>
                    <div className="flex gap-2 items-start">
                        <div className="text-xl font-black text-slate-900 leading-none mt-0.5 font-serif">{currentIndex + 1}.</div>
                        <div className="flex-1 flex flex-col">
                            <div
                                className="text-base sm:text-lg font-bold leading-relaxed text-slate-900 overflow-x-auto [&_.katex]:!text-slate-900 [&_.katex_*]:!text-slate-900 pb-2"
                                dangerouslySetInnerHTML={renderLatex(currentQuestion.latex)}
                            />
                        </div>
                        <div className="inline-block text-[11px] font-normal align-middle border border-slate-400 rounded-full px-1.5 py-0.5 ml-1 text-slate-600 leading-none whitespace-nowrap flex-shrink-0">
                            2점
                        </div>
                    </div>
                </div>

                {/* Choices Area */}
                <div className="mt-auto pt-2">
                    <div className="grid grid-cols-1 gap-2 w-full">
                        {currentQuestion.choices.map((choice, idx) => {
                            const numMap = ['①', '②', '③', '④', '⑤'];
                            const playedQuestion = playedQuestionsRef.current[playedQuestionsRef.current.length - 1];
                            const isSelected = playedQuestion && playedQuestion.questionId === currentQuestion.id && playedQuestion.selectedAnswer === choice && feedback !== null;

                            let containerClass = "flex items-center p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all active:scale-[0.99] shadow-sm";
                            let circleClass = "w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full border border-slate-300 text-sm font-serif mr-3 text-slate-500 bg-white";
                            let textClass = "text-base font-serif font-medium text-slate-800";

                            if (feedback !== null) {
                                if (choice === currentQuestion.answer) {
                                    containerClass = "flex items-center p-3 rounded-lg border-2 border-primary bg-primary/5 transition-all shadow-sm";
                                    circleClass = "w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full border-2 border-primary bg-white text-primary text-sm font-serif mr-3 shadow-sm";
                                    textClass = "text-base font-serif font-bold text-primary";
                                } else if (feedback === 'wrong' && isSelected) {
                                    containerClass = "flex items-center p-3 rounded-lg border-2 border-grading-red bg-grading-red/5 transition-all opacity-80 shadow-sm";
                                    circleClass = "w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full border-2 border-grading-red bg-white text-grading-red text-sm font-serif mr-3 shadow-sm";
                                    textClass = "text-base font-serif font-bold text-grading-red line-through decoration-2";
                                } else {
                                    containerClass += " opacity-40";
                                }
                            }

                            return (
                                <button
                                    key={`${currentQuestion.id}-${idx}`}
                                    className={`w-full text-left group select-none ${feedback !== null ? 'pointer-events-none' : ''}`}
                                    onClick={() => handleAnswer(choice)}
                                    disabled={feedback !== null}
                                >
                                    <div className={containerClass}>
                                        <span className={circleClass}>{numMap[idx] || (idx + 1)}</span>
                                        <span className={textClass}>{choice}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
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
                /* Hide scrollbar for katex overflow but allow scrolling */
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
                /* Additional animation for correct answer circle drawing */
                @keyframes drawCircle {
                    from {
                        stroke-dashoffset: 252;
                        opacity: 0;
                    }
                    10% {
                        opacity: 1;
                    }
                    to {
                        stroke-dashoffset: 0;
                        opacity: 1;
                    }
                }
                /* Milestone combo banner animation */
                @keyframes milestonePop {
                    0% {
                        transform: scale(0.5) translateY(20px);
                        opacity: 0;
                    }
                    15% {
                        transform: scale(1.2) translateY(0);
                        opacity: 1;
                    }
                    25% {
                        transform: scale(1.0) translateY(0);
                    }
                    80% {
                        transform: scale(1.0) translateY(0);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(0.8) translateY(-30px);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
}

