'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { QType } from '@/lib/MathGenerator';
import { playCorrect, playWrong } from '@/lib/sound';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useStudySession } from '@/hooks/useStudySession';
import QuestionBoard from '@/components/ui/QuestionBoard';
import { SUNEUNG_TYPE_LABELS, type SuneungStudyTierDefinition } from '@/lib/studyConfig';

interface SuneungStudySessionProps {
  tier: SuneungStudyTierDefinition;
}

interface RuntimeProps extends SuneungStudySessionProps {
  onRestart: () => void;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function SuneungStudyRuntime({ tier, onRestart }: RuntimeProps) {
  const [view, setView] = useState<'study' | 'summary'>('study');
  const [seed] = useState(() => `study-suneung-${tier.slug}-${Date.now()}`);

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
    track: 'suneung',
    tier: tier.slug,
    seed,
    onCorrect: () => {
      playCorrect();
      if (navigator.vibrate) navigator.vibrate(35);
    },
    onWrong: () => {
      playWrong();
      if (navigator.vibrate) navigator.vibrate([70, 30, 70]);
    },
  });

  const { time: elapsedTime } = useGameTimer({
    mode: 'stopwatch',
    initialValue: 0,
    isPlaying: isReady && view === 'study',
  });

  const accuracy = solvedCount > 0 ? Math.round((correctCount / solvedCount) * 100) : 0;
  const currentTopic = currentQuestion
    ? questionMeta.focusLabel || SUNEUNG_TYPE_LABELS[currentQuestion.type as QType] || currentQuestion.type
    : '문제 로딩 중';
  const passUsed = selectedAnswer === -1;

  if (view === 'summary') {
    return (
      <div className="min-h-screen bg-[#ece8df] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-[#d7e5ff] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 px-6 py-6 sm:px-10 sm:py-8">
            <div className="inline-flex rounded-full border border-[#bfd0ff] bg-[#edf4ff] px-3 py-1 text-xs font-bold tracking-[0.2em] text-[#0f49bd]">
              {tier.badge}
            </div>
            <h1 className="mt-4 font-serif text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {tier.title} 학습 결과
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              시간 제한 없이 풀어낸 기록입니다. 부족한 부분은 다시 같은 단계에서 반복하고, 안정적이면 다음 단계로 올라가면 됩니다.
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
            <div className="rounded-3xl border border-[#bfd0ff] bg-[#edf4ff] p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f49bd]">정답률</div>
              <div className="mt-2 text-3xl font-black text-[#0f49bd]">{accuracy}%</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">공부 시간</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{formatTime(elapsedTime)}</div>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-6 sm:px-10">
            <div className="rounded-[28px] border border-[#d7e5ff] bg-[#f7fbff] p-5">
              <div className="text-sm font-bold text-slate-900">추천 다음 행동</div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {accuracy >= 80
                  ? '이 단계가 안정적입니다. 같은 흐름을 한 번 더 반복하거나 한 단계 높은 세트로 넘어가도 됩니다.'
                  : '같은 단계에서 몇 문제 더 풀면서 힌트와 정답 근거를 같이 확인하는 편이 좋습니다.'}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onRestart}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#0f49bd] px-5 text-sm font-bold text-white transition-colors hover:bg-[#0c3b97]"
              >
                같은 단계 다시 시작
              </button>
              <Link
                href="/practice"
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
      <div className="flex min-h-screen items-center justify-center bg-[#ece8df]">
        <div className="rounded-3xl border border-[#bfd0ff] bg-white px-6 py-5 text-lg font-bold text-[#0f49bd] shadow-sm">
          문제를 준비하고 있습니다...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ece8df] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-[32px] border border-[#d7e5ff] bg-white px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/practice" className="text-sm font-bold text-slate-500 transition-colors hover:text-slate-800">
                  수능 공부 페이지
                </Link>
                <span className="text-slate-300">/</span>
                <span className="rounded-full border border-[#bfd0ff] bg-[#edf4ff] px-3 py-1 text-xs font-bold tracking-[0.2em] text-[#0f49bd]">
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
            <div className="rounded-[32px] border border-[#d7e5ff] bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#bfd0ff] bg-[#edf4ff] px-3 py-1 text-xs font-semibold text-[#0f49bd]">
                  시간 제한 없음
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${questionMeta.source === 'ai' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                  {questionMeta.sourceLabel}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  현재 포커스: {currentTopic}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  난도 레벨 {tier.level}
                </span>
              </div>

              <QuestionBoard
                currentIndex={currentIndex}
                currentLevel={tier.level}
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

            <div className="rounded-[28px] border border-[#d7e5ff] bg-[#f7fbff] p-5">
              {feedback === null ? (
                <>
                  <div className="text-sm font-bold text-slate-900">지금은 학습 중</div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    서두르지 말고 풀이 근거를 먼저 세우세요. 막히면 힌트를 펼친 뒤, 정답을 맞힌 이유까지 짚고 넘어가면 공부 효율이 올라갑니다.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-sm font-bold text-slate-900">
                    {passUsed ? '정답을 확인했습니다.' : feedback === 'correct' ? '정답입니다.' : '오답을 확인했습니다.'}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {passUsed
                      ? '틀려도 괜찮습니다. 정답이 왜 맞는지 읽고 같은 유형을 한 문제 더 풀어보세요.'
                      : feedback === 'correct'
                        ? '풀이가 맞았다면 다음 문제로 넘어가고, 운 좋게 맞았다면 힌트 영역을 열어 개념을 한 번 더 확인하세요.'
                        : '바로 다음 문제로 넘어가기보다, 힌트와 정답 보기를 보면서 어느 단계에서 흔들렸는지 짚는 편이 좋습니다.'}
                  </p>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={nextQuestion}
                      className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#0f49bd] px-5 text-sm font-bold text-white transition-colors hover:bg-[#0c3b97]"
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
            <div className="rounded-[28px] border border-[#d7e5ff] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold text-slate-900">학습 현황</h2>
                <span className="material-symbols-outlined text-2xl text-[#0f49bd]">analytics</span>
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
                <div className="rounded-2xl border border-[#bfd0ff] bg-[#edf4ff] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0f49bd]">정답률</div>
                  <div className="mt-2 text-2xl font-black text-[#0f49bd]">{accuracy}%</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">단계</div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{tier.badge}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#d7e5ff] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <h2 className="font-serif text-xl font-bold text-slate-900">이 단계에서 보는 단원</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {tier.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-[#bfd0ff] bg-[#edf4ff] px-3 py-1 text-xs font-semibold text-[#0f49bd]"
                  >
                    {topic}
                  </span>
                ))}
              </div>
              <div className="mt-5 space-y-3">
                {tier.focusPoints.map((point) => (
                  <div key={point} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                    <span className="material-symbols-outlined mt-0.5 text-base text-[#0f49bd]">check_circle</span>
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

export default function SuneungStudySession({ tier }: SuneungStudySessionProps) {
  const [sessionKey, setSessionKey] = useState(0);

  return (
    <SuneungStudyRuntime
      key={`${tier.slug}-${sessionKey}`}
      tier={tier}
      onRestart={() => setSessionKey((prev) => prev + 1)}
    />
  );
}
