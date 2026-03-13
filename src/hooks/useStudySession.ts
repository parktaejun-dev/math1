import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudyQuestionMeta, StudyQuestionResponse, StudyQuestionShape, StudyTrack } from '@/lib/studyQuestionFactory';
import { getStudyTierFromIndex, getStudyTierIndex, type StudyTier } from '@/lib/studyConfig';

interface UseStudySessionProps {
  track: StudyTrack;
  tier: StudyTier;
  seed: string;
  onCorrect?: () => void;
  onWrong?: () => void;
}

export interface FocusStat {
  correct: number;
  wrong: number;
}

const defaultMeta: StudyQuestionMeta = {
  source: 'local',
  sourceLabel: '문제 준비 중',
  focusLabel: '문제 준비 중',
  difficultyTier: 'basic',
  difficultyBadge: 'BASIC',
  difficultyStep: 0,
};

export function useStudySession<TQuestion extends StudyQuestionShape>({
  track,
  tier,
  seed,
  onCorrect,
  onWrong,
}: UseStudySessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<TQuestion | null>(null);
  const [questionMeta, setQuestionMeta] = useState<StudyQuestionMeta>(defaultMeta);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [solvedCount, setSolvedCount] = useState(0);
  const [focusStats, setFocusStats] = useState<Record<string, FocusStat>>({});
  const [adaptiveTier, setAdaptiveTier] = useState<StudyTier>(tier);
  const [difficultyStep, setDifficultyStep] = useState(0);
  const [recentTypes, setRecentTypes] = useState<string[]>([]);
  const [recentFocuses, setRecentFocuses] = useState<string[]>([]);
  const requestIdRef = useRef(0);
  const adaptiveTierRef = useRef<StudyTier>(tier);
  const difficultyStepRef = useRef(0);
  const recentTypesRef = useRef<string[]>([]);
  const recentFocusesRef = useRef<string[]>([]);

  const loadQuestion = useCallback(async (index: number, nextAdaptiveTier?: StudyTier, nextDifficultyStep?: number) => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    const requestTier = nextAdaptiveTier ?? adaptiveTierRef.current;
    const requestDifficultyStep = nextDifficultyStep ?? difficultyStepRef.current;

    setIsProcessing(true);
    setFeedback(null);
    setSelectedAnswer(null);
    setCurrentQuestion(null);

    try {
      const response = await fetch('/api/study-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track,
          tier,
          adaptiveTier: requestTier,
          difficultyStep: requestDifficultyStep,
          recentTypes: recentTypesRef.current,
          recentFocuses: recentFocusesRef.current,
          seed,
          index,
        }),
      });

      if (!response.ok) {
        throw new Error(`Study question request failed: ${response.status}`);
      }

      const data = await response.json() as StudyQuestionResponse<TQuestion>;
      if (requestId !== requestIdRef.current) return;

      setCurrentIndex(index);
      setCurrentQuestion(data.question);
      setQuestionMeta(data.meta);
      adaptiveTierRef.current = data.meta.difficultyTier;
      difficultyStepRef.current = data.meta.difficultyStep;
      setAdaptiveTier(data.meta.difficultyTier);
      setDifficultyStep(data.meta.difficultyStep);
      const nextType = 'cognitiveType' in data.question ? data.question.cognitiveType : data.question.type;
      const nextRecentTypes = [nextType, ...recentTypesRef.current.filter((value) => value !== nextType)].slice(0, 3);
      const nextRecentFocuses = [data.meta.focusLabel, ...recentFocusesRef.current.filter((value) => value !== data.meta.focusLabel)].slice(0, 3);
      recentTypesRef.current = nextRecentTypes;
      recentFocusesRef.current = nextRecentFocuses;
      setRecentTypes(nextRecentTypes);
      setRecentFocuses(nextRecentFocuses);
      setIsReady(true);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsProcessing(false);
      }
    }
  }, [seed, tier, track]);

  useEffect(() => {
    adaptiveTierRef.current = tier;
    difficultyStepRef.current = 0;
    recentTypesRef.current = [];
    recentFocusesRef.current = [];
    setAdaptiveTier(tier);
    setDifficultyStep(0);
    setRecentTypes([]);
    setRecentFocuses([]);
    void loadQuestion(0, tier, 0);
  }, [loadQuestion]);

  const updateAdaptiveDifficulty = useCallback((wasCorrect: boolean) => {
    const baseTierIndex = getStudyTierIndex(tier);
    const currentTierIndex = getStudyTierIndex(adaptiveTierRef.current);
    const nextTierIndex = wasCorrect
      ? Math.min(2, currentTierIndex + 1)
      : Math.max(baseTierIndex, currentTierIndex - 1);
    const nextStep = wasCorrect
      ? Math.min(2, difficultyStepRef.current + 1)
      : Math.max(0, difficultyStepRef.current - 1);
    const nextTier = getStudyTierFromIndex(nextTierIndex);

    adaptiveTierRef.current = nextTier;
    difficultyStepRef.current = nextStep;
    setAdaptiveTier(nextTier);
    setDifficultyStep(nextStep);
  }, [tier]);

  const recordFocusResult = useCallback((isCorrect: boolean) => {
    const focusLabel = questionMeta.focusLabel || '기타';
    setFocusStats((prev) => {
      const current = prev[focusLabel] || { correct: 0, wrong: 0 };
      return {
        ...prev,
        [focusLabel]: {
          correct: current.correct + (isCorrect ? 1 : 0),
          wrong: current.wrong + (isCorrect ? 0 : 1),
        },
      };
    });
  }, [questionMeta.focusLabel]);

  const submitAnswer = useCallback((choice: number) => {
    if (!currentQuestion || feedback || isProcessing) return;

    const isCorrect = choice === currentQuestion.answer;
    setSelectedAnswer(choice);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setSolvedCount((prev) => prev + 1);

    if (isCorrect) {
      updateAdaptiveDifficulty(true);
      recordFocusResult(true);
      setCorrectCount((prev) => prev + 1);
      onCorrect?.();
      return;
    }

    updateAdaptiveDifficulty(false);
    recordFocusResult(false);
    onWrong?.();
  }, [currentQuestion, feedback, isProcessing, onCorrect, onWrong, recordFocusResult, updateAdaptiveDifficulty]);

  const submitPass = useCallback(() => {
    if (!currentQuestion || feedback || isProcessing) return;

    setSelectedAnswer(-1);
    setFeedback('wrong');
    setSolvedCount((prev) => prev + 1);
    updateAdaptiveDifficulty(false);
    recordFocusResult(false);
    onWrong?.();
  }, [currentQuestion, feedback, isProcessing, onWrong, recordFocusResult, updateAdaptiveDifficulty]);

  const nextQuestion = useCallback(() => {
    void loadQuestion(currentIndex + 1, adaptiveTierRef.current, difficultyStepRef.current);
  }, [currentIndex, loadQuestion]);

  return {
    isReady,
    isProcessing,
    currentIndex,
    currentQuestion,
    questionMeta,
    feedback,
    correctCount,
    selectedAnswer,
    solvedCount,
    focusStats,
    adaptiveTier,
    difficultyStep,
    recentTypes,
    recentFocuses,
    submitAnswer,
    submitPass,
    nextQuestion,
  };
}
