import { useState, useCallback, useRef, useEffect } from 'react';
import { Question, QType } from '@/lib/MathGenerator';

export interface PlayedQuestion {
    questionId: string;
    selectedAnswer: number;
    correct: boolean;
    timeMs: number;
    level: number;
}

interface UseGameSessionProps {
    seed: string;
    allowedTypes?: QType[];
    onCorrect?: (combo: number, timeMs: number) => void;
    onWrong?: (timeMs: number) => void;
}

export function useGameSession({ seed, allowedTypes, onCorrect, onWrong }: UseGameSessionProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [correctCount, setCorrectCount] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [combo, setCombo] = useState(0);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const playedQuestionsRef = useRef<PlayedQuestion[]>([]);
    const questionStartTimeRef = useRef<number>(Date.now());

    // Dynamic import to avoid SSR issues
    const generateFnRef = useRef<any>(null);

    useEffect(() => {
        import('@/lib/MathGenerator').then((mod) => {
            generateFnRef.current = mod.generateQuestion;
            setIsReady(true);
        });
    }, []);

    const loadQuestion = useCallback((index: number, level: number = 1) => {
        if (!generateFnRef.current) return;
        const q = generateFnRef.current(seed, index, level, allowedTypes);
        setCurrentQuestion(q);
        questionStartTimeRef.current = Date.now();
        setFeedback(null);
        setSelectedAnswer(null);
        setIsProcessing(false);
    }, [seed, allowedTypes]);

    const submitAnswer = useCallback((selected: number) => {
        if (!currentQuestion || feedback || isProcessing) return;
        setIsProcessing(true);
        setSelectedAnswer(selected);

        const timeMs = Date.now() - questionStartTimeRef.current;
        const isCorrect = selected === currentQuestion.answer;

        playedQuestionsRef.current.push({
            questionId: currentQuestion.id,
            selectedAnswer: selected,
            correct: isCorrect,
            timeMs,
            level: currentLevel
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

    const nextQuestion = useCallback((nextLevel?: number) => {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        if (nextLevel) setCurrentLevel(nextLevel);
        loadQuestion(nextIdx, nextLevel || currentLevel);
    }, [currentIndex, currentLevel, loadQuestion]);

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
