'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CognitiveType } from '@/lib/MiddleMathGenerator';
import { playCorrect, playWrong } from '@/lib/sound';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useStudySession } from '@/hooks/useStudySession';
import QuestionBoard from '@/components/ui/QuestionBoard';
import { MIDDLE_TYPE_LABELS, type MiddleStudyTierDefinition } from '@/lib/studyConfig';

interface MiddleStudySessionProps {
  tier: MiddleStudyTierDefinition;
}

interface RuntimeProps extends MiddleStudySessionProps {
  onRestart: () => void;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function MiddleStudyRuntime({ tier, onRestart }: RuntimeProps) {
  const [view, setView] = useState<'study' | 'summary'>('study');
  const [seed] = useState(() => `study-middle-${tier.slug}-${Date.now()}`);

  const {
    isReady,
    currentIndex,
    currentQuestion,
    questionMeta,
    feedback,
    correctCount,
    selectedAnswer,
    isProcessing,
    solvedCount,
    submitAnswer,
    submitPass,
    nextQuestion,
  } = useStudySession({
    track: 'middle',
    tier: tier.slug,
    seed,
    onCorrect: () => {
      playCorrect();
      if (navigator.vibrate) navigator.vibrate(30);
    },
    onWrong: () => {
      playWrong();
      if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
    },
  });

  const { time: elapsedTime } = useGameTimer({
    mode: 'stopwatch',
    initialValue: 0,
    isPlaying: isReady && view === 'study',
  });

  const accuracy = solvedCount > 0 ? Math.round((correctCount / solvedCount) * 100) : 0;
  const currentFocus = currentQuestion
    ? questionMeta.focusLabel || MIDDLE_TYPE_LABELS[currentQuestion.cognitiveType as CognitiveType] || currentQuestion.cognitiveType
    : '문제 로딩 중';
  const passUsed = selectedAnswer === -1;

  if (view === 'summary') {
    return (
      <div className="min-h-screen bg-[#f1ede2] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-[#f3e2bf] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 px-6 py-6 sm:px-10 sm:py-8">
            <div className="inline-flex rounded-full border border-[#f4d6a0] bg-[#fff0d1] px-3 py-1 text-xs font-bold tracking-[0.2em] text-[#b45309]">
              {tier.badge}
            </div>
            <h1 className="mt-4 font-serif text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {tier.title} 학습 결과
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              학교 시험 대비용으로 풀어본 기록입니다. 점수보다 풀이 구조와 취약 단원을 다시 보는 데 집중하면 됩니다.
            </p>
          </div>

          <div className="grid gap-4 px-6 py-6 sm:grid-cols-4 sm:px-10">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">풀이 수</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{solvedCount}</div>
            </div>
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">정답 수</div>
              <div className="mt-2 text-3xl font-black text-emerald-700">{correctCount}</div>
            </div>
            <div className="rounded-3xl border border-[#f4d6a0] bg-[#fff0d1] p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#b45309]">정답률</div>
              <div className="mt-2 text-3xl font-black text-[#b45309]">{accuracy}%</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">공부 시간</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{formatTime(elapsedTime)}</div>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-6 sm:px-10">
            <div className="rounded-[28px] border border-[#f3e2bf] bg-[#fffaf0] p-5">
              <div className="text-sm font-bold text-slate-900">추천 다음 행동</div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {accuracy >= 80
                  ? '기본 흐름이 안정적입니다. 같은 단계에서 조금 더 풀거나 더 높은 난도로 넘어가도 됩니다.'
                  : '오답이 난 문제 유형을 중심으로 같은 단계에서 몇 문제 더 반복하는 편이 좋습니다.'}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onRestart}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#b45309] px-5 text-sm font-bold text-white transition-colors hover:bg-[#92400e]"
              >
                같은 단계 다시 시작
              </button>
              <Link
                href="/middle/practice"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                단계 선택으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isReady || !currentQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f1ede2]">
        <div className="rounded-3xl border border-[#f4d6a0] bg-white px-6 py-5 text-lg font-bold text-[#b45309] shadow-sm">
          문제를 준비하고 있습니다...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1ede2] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-[32px] border border-[#f3e2bf] bg-white px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/middle/practice" className="text-sm font-bold text-slate-500 transition-colors hover:text-slate-800">
                  중등 공부 페이지
                </Link>
                <span className="text-slate-300">/</span>
                <span className="rounded-full border border-[#f4d6a0] bg-[#fff0d1] px-3 py-1 text-xs font-bold tracking-[0.2em] text-[#b45309]">
                  {tier.badge}
                </span>
              </div>
              <h1 className="mt-3 font-serif text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {tier.title}
              </h1>
              <p className="mt-2 text-sm leading-7 text-slate-600">{tier.description}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">공부 시간</div>
                <div className="mt-1 text-xl font-black text-slate-900">{formatTime(elapsedTime)}</div>
              </div>
              <button
                onClick={() => setView('summary')}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                학습 종료
              </button>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
          <section className="space-y-4">
            <div className="rounded-[32px] border border-[#f3e2bf] bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#f4d6a0] bg-[#fff0d1] px-3 py-1 text-xs font-semibold text-[#b45309]">
                  시간 제한 없음
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${questionMeta.source === 'ai' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                  {questionMeta.sourceLabel}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  현재 포커스: {currentFocus}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  현재 난도 Lv.{currentQuestion.level}
                </span>
              </div>

              <QuestionBoard
                currentIndex={currentIndex}
                currentLevel={currentQuestion.level}
                currentQuestion={currentQuestion}
                feedback={feedback}
                selectedAnswer={selectedAnswer}
                onAnswer={submitAnswer}
                isProcessing={isProcessing}
                onPass={submitPass}
                passPenaltyText="모르면 정답을 확인하고 다음 문제로 넘어가세요."
                aiMode={false}
              />
            </div>

            <div className="rounded-[28px] border border-[#f3e2bf] bg-[#fffaf0] p-5">
              {feedback === null ? (
                <>
                  <div className="text-sm font-bold text-slate-900">지금은 학습 중</div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    정답보다 먼저 식과 조건을 정리해보세요. 중등 심화 문제는 계산보다 문제 해석에서 승부가 나는 경우가 많습니다.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-sm font-bold text-slate-900">
                    {passUsed ? '정답을 확인했습니다.' : feedback === 'correct' ? '정답입니다.' : '오답을 확인했습니다.'}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {passUsed
                      ? '힌트를 읽고 같은 유형을 바로 한 문제 더 풀어보면 개념이 더 잘 남습니다.'
                      : feedback === 'correct'
                        ? '풀이가 자연스러웠는지 한 번 더 점검한 뒤 다음 문제로 넘어가세요.'
                        : '답만 보지 말고 어디서 조건을 놓쳤는지 짧게라도 복기한 뒤 다음 문제로 이동하는 편이 좋습니다.'}
                  </p>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={nextQuestion}
                      className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#b45309] px-5 text-sm font-bold text-white transition-colors hover:bg-[#92400e]"
                    >
                      다음 문제
                    </button>
                    <button
                      onClick={() => setView('summary')}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition-colors hover:bg-white"
                    >
                      여기서 마치기
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-[28px] border border-[#f3e2bf] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold text-slate-900">학습 현황</h2>
                <span className="material-symbols-outlined text-2xl text-[#b45309]">analytics</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">풀이 수</div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{solvedCount}</div>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">정답 수</div>
                  <div className="mt-2 text-2xl font-black text-emerald-700">{correctCount}</div>
                </div>
                <div className="rounded-2xl border border-[#f4d6a0] bg-[#fff0d1] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#b45309]">정답률</div>
                  <div className="mt-2 text-2xl font-black text-[#b45309]">{accuracy}%</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">단계</div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{tier.badge}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#f3e2bf] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <h2 className="font-serif text-xl font-bold text-slate-900">이 단계에서 보는 단원</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {tier.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-[#f4d6a0] bg-[#fff0d1] px-3 py-1 text-xs font-semibold text-[#b45309]"
                  >
                    {topic}
                  </span>
                ))}
              </div>
              <div className="mt-5 space-y-3">
                {tier.focusPoints.map((point) => (
                  <div key={point} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                    <span className="material-symbols-outlined mt-0.5 text-base text-[#b45309]">check_circle</span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function MiddleStudySession({ tier }: MiddleStudySessionProps) {
  const [sessionKey, setSessionKey] = useState(0);

  return (
    <MiddleStudyRuntime
      key={`${tier.slug}-${sessionKey}`}
      tier={tier}
      onRestart={() => setSessionKey((prev) => prev + 1)}
    />
  );
}
