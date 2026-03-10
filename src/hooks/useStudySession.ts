import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudyQuestionMeta, StudyQuestionResponse, StudyQuestionShape, StudyTrack } from '@/lib/studyQuestionFactory';
import type { StudyTier } from '@/lib/studyConfig';

interface UseStudySessionProps {
  track: StudyTrack;
  tier: StudyTier;
  seed: string;
  onCorrect?: () => void;
  onWrong?: () => void;
}

const defaultMeta: StudyQuestionMeta = {
  source: 'local',
  sourceLabel: '문제 준비 중',
  focusLabel: '문제 준비 중',
};

export function useStudySession<TQuestion extends StudyQuestionShape>({
  track,
  tier,
  seed,
  onCorrect,
  onWrong,
}: UseStudySessionProps<TQuestion>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<TQuestion | null>(null);
  const [questionMeta, setQuestionMeta] = useState<StudyQuestionMeta>(defaultMeta);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [solvedCount, setSolvedCount] = useState(0);
  const requestIdRef = useRef(0);

  const loadQuestion = useCallback(async (index: number) => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    setIsProcessing(true);
    setFeedback(null);
    setSelectedAnswer(null);
    setCurrentQuestion(null);

    try {
      const response = await fetch('/api/study-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track, tier, seed, index }),
      });

      if (!response.ok) {
        throw new Error(`Study question request failed: ${response.status}`);
      }

      const data = await response.json() as StudyQuestionResponse<TQuestion>;
      if (requestId !== requestIdRef.current) return;

      setCurrentIndex(index);
      setCurrentQuestion(data.question);
      setQuestionMeta(data.meta);
      setIsReady(true);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsProcessing(false);
      }
    }
  }, [seed, tier, track]);

  useEffect(() => {
    void loadQuestion(0);
  }, [loadQuestion]);

  const submitAnswer = useCallback((choice: number) => {
    if (!currentQuestion || feedback || isProcessing) return;

    const isCorrect = choice === currentQuestion.answer;
    setSelectedAnswer(choice);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setSolvedCount((prev) => prev + 1);

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
      onCorrect?.();
      return;
    }

    onWrong?.();
  }, [currentQuestion, feedback, isProcessing, onCorrect, onWrong]);

  const submitPass = useCallback(() => {
    if (!currentQuestion || feedback || isProcessing) return;

    setSelectedAnswer(-1);
    setFeedback('wrong');
    setSolvedCount((prev) => prev + 1);
    onWrong?.();
  }, [currentQuestion, feedback, isProcessing, onWrong]);

  const nextQuestion = useCallback(() => {
    void loadQuestion(currentIndex + 1);
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
    submitAnswer,
    submitPass,
    nextQuestion,
  };
}
