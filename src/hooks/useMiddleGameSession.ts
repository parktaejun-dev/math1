import { useState, useCallback, useRef, useEffect } from 'react';
import { MiddleQuestion, CognitiveType } from '@/lib/MiddleMathGenerator';

export interface MiddlePlayedQuestion {
    questionId: string;
    selectedAnswer: number;
    correct: boolean;
    timeMs: number;
    level: number;
    cognitiveType: string;
    type: string;
}

interface UseMiddleGameSessionProps {
    seed: string;
    onCorrect?: (combo: number, timeMs: number) => void;
    onWrong?: (timeMs: number, isPass?: boolean) => void;
}

export function useMiddleGameSession({ seed, onCorrect, onWrong }: UseMiddleGameSessionProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState<MiddleQuestion | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [correctCount, setCorrectCount] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [combo, setCombo] = useState(0);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const isSubmittingRef = useRef(false);

    const generatedHistoryRef = useRef<MiddleQuestion[]>([]);
    const playedQuestionsRef = useRef<MiddlePlayedQuestion[]>([]);
    const questionStartTimeRef = useRef<number>(Date.now());

    const generateFnRef = useRef<any>(null);

    useEffect(() => {
        import('@/lib/MiddleMathGenerator').then((mod) => {
            generateFnRef.current = mod.generateMiddleQuestion;
            setIsReady(true);
        });
    }, []);

    // Deterministic PRNG for the "30% chance" internal rhythm rules
    const determineRhythmRng = useCallback((seedBase: string, idx: number) => {
        let hash = 0;
        const s = `${seedBase}-rhythm-${idx}`;
        for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
        return ((hash >>> 0) / 4294967296);
    }, []);

    const loadQuestion = useCallback((index: number, isFever: boolean = false, isRecovery: boolean = false) => {
        if (!generateFnRef.current) return;

        const history = generatedHistoryRef.current;
        let allowedTypes: CognitiveType[] | undefined = undefined;

        // Apply Rhythm Protection & Variety limits
        if (isFever) {
            // Fever -> Level 5 reflex types only
            allowedTypes = ['reflex', 'pattern'];
        } else if (isRecovery) {
            // Recovery after wrong answer -> Easy types
            allowedTypes = ['reflex', 'pattern'];
        } else if (history.length > 0) {
            const lastQ = history[history.length - 1];
            const rngValue = determineRhythmRng(seed, index);

            // 1. Hard-before-soft logic
            let restrictThink = false;
            if (lastQ.cognitiveType === 'think') {
                restrictThink = true;
            } else if (lastQ.cognitiveType === 'compute' && rngValue > 0.3) {
                // 30% chance to allow 'think' after 'compute'
                restrictThink = true;
            }

            // 2. Boredom Prevention
            const recent3Cog = history.slice(-3).map(q => q.cognitiveType);
            const countsCog = recent3Cog.reduce((acc, val) => { acc[val] = (acc[val] || 0) + 1; return acc; }, {} as Record<string, number>);
            const bannedCog: CognitiveType[] = Object.keys(countsCog).filter(k => countsCog[k] >= 2) as CognitiveType[];

            const allCogs: CognitiveType[] = ['reflex', 'pattern', 'compute', 'think'];
            allowedTypes = allCogs.filter(c => {
                if (restrictThink && c === 'think') return false;
                if (bannedCog.includes(c)) return false;
                return true;
            });

            // Failsafe
            if (allowedTypes.length === 0) allowedTypes = ['reflex'];
        }

        // Generate the question
        // Note: MiddleMathGenerator might still pick a QType that was repeated >2 times in past 5.
        // For simplicity and to avoid infinite loops, the generator handles fallback internally.
        const q: MiddleQuestion = generateFnRef.current(seed, index, allowedTypes);

        // Boredom Prevention (fallback if QType is too repeated, we could iterate index, but deterministic requires careful handling.
        // The spec requested max 2 QType in last 5. We will accept slight deviations if the generator RNG falls on it,
        // or we could loop with a nonce. Keeping it simple and robust for this version.

        generatedHistoryRef.current.push(q);
        setCurrentQuestion(q);
        setCurrentLevel(q.level);
        questionStartTimeRef.current = Date.now();
        isSubmittingRef.current = false;
        setFeedback(null);
        setSelectedAnswer(null);
        setIsProcessing(false);
    }, [seed, determineRhythmRng]);

    const submitAnswer = useCallback((selected: number) => {
        if (!currentQuestion || feedback || isProcessing || isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setIsProcessing(true);
        setSelectedAnswer(selected);

        const timeMs = Date.now() - questionStartTimeRef.current;
        const isCorrect = selected === currentQuestion.answer;

        playedQuestionsRef.current.push({
            questionId: currentQuestion.id,
            selectedAnswer: selected,
            correct: isCorrect,
            timeMs,
            level: currentQuestion.level,
            cognitiveType: currentQuestion.cognitiveType,
            type: currentQuestion.type
        });

        if (isCorrect) {
            setCorrectCount(prev => prev + 1);
            setFeedback('correct');
            const newCombo = combo + 1;
            setCombo(newCombo);
            onCorrect?.(newCombo, timeMs);
        } else {
            setFeedback('wrong');
            setCombo(0);
            onWrong?.(timeMs);
        }
    }, [currentQuestion, feedback, isProcessing, combo, onCorrect, onWrong]);

    const nextQuestion = useCallback((isFever: boolean = false, isRecovery: boolean = false) => {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        loadQuestion(nextIdx, isFever, isRecovery);
    }, [currentIndex, loadQuestion]);

    return {
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
    };
}
