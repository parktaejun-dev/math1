import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import katex from 'katex';
import { Question } from '@/lib/MathGenerator';

interface PlayedQuestion {
    questionId: string;
    selectedAnswer: number;
    correct: boolean;
    timeMs: number;
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
const FEVER_MULTIPLIER = 2;

// Client-side question generator (dynamic import to avoid SSR issues)
let generateQuestionFn: ((seed: string, index: number, level?: number) => Question) | null = null;

// Global AudioContext to prevent exceeding the browser limit of 6 instances
let audioCtx: AudioContext | null = null;
const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    return audioCtx;
};

const playSchoolBell = () => {
    try {
        const ctx = getAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') ctx.resume();
            const seq = [
                { f: 523.25, t: 0, d: 0.8 }, // C5
                { f: 659.25, t: 1.0, d: 0.8 }, // E5
                { f: 587.33, t: 2.0, d: 0.8 }, // D5
                { f: 392.00, t: 3.0, d: 1.5 }, // G4
                { f: 659.25, t: 4.5, d: 0.8 }, // E5
                { f: 587.33, t: 5.5, d: 0.8 }, // D5
                { f: 523.25, t: 6.5, d: 1.5 }, // C5
            ];
            seq.forEach(({ f, t, d }) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = f;
                gain.gain.setValueAtTime(0, ctx.currentTime + t);
                gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + t + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + t + d);
                osc.start(ctx.currentTime + t);
                osc.stop(ctx.currentTime + t + d);
            });
        }
    } catch (e) { }
};

const playLevelUp = () => {
    try {
        const ctx = getAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') ctx.resume();
            const freqs = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
            freqs.forEach((f, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = f;
                const t = ctx.currentTime + i * 0.1;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.3);
            });
        }
    } catch (e) { }
};

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

    const playedQuestionsRef = useRef<PlayedQuestion[]>([]);
    const questionStartTimeRef = useRef<number>(Date.now());
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
        playSchoolBell();

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
            if (!currentQuestion || feedback || isGameOver) return;

            const timeMs = Date.now() - questionStartTimeRef.current;
            const isCorrect = selected === currentQuestion.answer;

            const played: PlayedQuestion = {
                questionId: currentQuestion.id,
                selectedAnswer: selected,
                correct: isCorrect,
                timeMs,
            };
            playedQuestionsRef.current.push(played);

            // Play sound effect safely
            try {
                const ctx = getAudioContext();
                if (ctx) {
                    if (ctx.state === 'suspended') {
                        ctx.resume();
                    }

                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    if (isCorrect) {
                        // Pleasant chime (C5 -> G5)
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
                        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.1);
                        gain.gain.setValueAtTime(0, ctx.currentTime);
                        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
                        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                        osc.start(ctx.currentTime);
                        osc.stop(ctx.currentTime + 0.3);
                    } else {
                        // Dull buzzer
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(150, ctx.currentTime);
                        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.25);
                        gain.gain.setValueAtTime(0.2, ctx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
                        osc.start(ctx.currentTime);
                        osc.stop(ctx.currentTime + 0.25);
                    }
                }
            } catch (e) {
                console.error('Audio playback failed', e);
            }

            let newLevel = currentLevel;

            if (isCorrect) {
                const newCombo = combo + 1;
                const newIsFever = newCombo >= COMBO_FEVER_THRESHOLD;
                newLevel = Math.floor(newCombo / 10) + 1;

                if (newLevel > currentLevel) {
                    setCurrentLevel(newLevel);
                    setShowLevelUp(true);
                    setTimeout(() => setShowLevelUp(false), 2000);
                    playLevelUp();
                }

                // Calculate time bonus (decaying survival timer)
                let timeBonus = Math.max(2, Math.round(12 * Math.exp(-newCombo / 12)));
                if (newLevel >= 5) timeBonus = 15;
                setTimeLeft((prev) => Math.min(GAME_DURATION, prev + timeBonus));

                // Calculate points: 100 + (combo * 5) + floor(timeLeft * 2)
                const basePoints = 100 + (newCombo * 5) + Math.floor(timeLeft * 2);
                const points = newIsFever
                    ? basePoints * FEVER_MULTIPLIER
                    : basePoints;

                setCombo(newCombo);
                setIsFever(newIsFever);
                setMaxCombo((prev) => Math.max(prev, newCombo));
                setScore((prev) => prev + points);
                setCorrectCount((prev) => prev + 1);
                setFeedback('correct');
            } else {
                setCombo(0);
                setIsFever(false);
                setCurrentLevel(1); // Reset level on miss
                setFeedback('wrong');
            }

            // Move to next question after brief feedback
            setTimeout(() => {
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
            <header className="w-full bg-paper border-b border-black flex-shrink-0 px-4 py-2 flex items-center justify-between z-10 shadow-sm h-12 relative overflow-hidden">
                {/* Level Up Flash */}
                {showLevelUp && (
                    <div className="absolute inset-0 bg-blue-500/20 animate-pulse pointer-events-none" />
                )}

                <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                        <div className={`text-xs font-bold leading-none ${currentLevel >= 5 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
                            {currentLevel >= 5 ? 'INSANE' : `LV.${currentLevel}`}
                        </div>
                        <div className={`text-sm font-bold ${isFever ? 'text-amber-500 animate-pulse' : 'text-primary'}`}>
                            {isFever ? '🔥 FEVER' : `${combo} COMBO`}
                        </div>
                    </div>
                    <Link href="/">
                        <h1 className="text-base font-bold text-slate-900 leading-none tracking-tight ml-2 cursor-pointer hover:opacity-80 transition-opacity">
                            수능 1번
                        </h1>
                    </Link>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded border border-slate-300">
                    <span className={`material-symbols-outlined text-[16px] ${isUrgent ? 'text-grading-red' : 'text-primary'}`}>timer</span>
                    <span className={`font-bold font-mono text-sm leading-none ${isUrgent ? 'text-grading-red' : 'text-primary'}`}>{timeLeft}초</span>
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
            `}</style>
        </div>
    );
}

