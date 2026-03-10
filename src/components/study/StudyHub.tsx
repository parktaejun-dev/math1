import Link from 'next/link';
import type { BaseStudyTierDefinition } from '@/lib/studyConfig';

interface StudyHubProps {
  accent: 'navy' | 'amber';
  eyebrow: string;
  title: string;
  description: string;
  basePath: string;
  timedHref: string;
  timedLabel: string;
  tiers: BaseStudyTierDefinition[];
  roadmap: {
    title: string;
    description: string;
  }[];
}

const accentStyles = {
  navy: {
    surface: 'from-[#f7fbff] via-white to-[#eef4ff]',
    chip: 'border-[#bfd0ff] bg-[#edf4ff] text-[#0f49bd]',
    strong: 'text-[#0f49bd]',
    outlineButton: 'border-[#0f49bd] text-[#0f49bd] hover:bg-[#0f49bd] hover:text-white',
    solidButton: 'bg-[#0f49bd] text-white hover:bg-[#0c3b97]',
    softBorder: 'border-[#d7e5ff]',
    softPanel: 'bg-[#f7fbff]',
  },
  amber: {
    surface: 'from-[#fff9ef] via-white to-[#fff2d6]',
    chip: 'border-[#f4d6a0] bg-[#fff0d1] text-[#b45309]',
    strong: 'text-[#b45309]',
    outlineButton: 'border-[#b45309] text-[#b45309] hover:bg-[#b45309] hover:text-white',
    solidButton: 'bg-[#b45309] text-white hover:bg-[#92400e]',
    softBorder: 'border-[#f3e2bf]',
    softPanel: 'bg-[#fffaf0]',
  },
} as const;

export default function StudyHub({
  accent,
  eyebrow,
  title,
  description,
  basePath,
  timedHref,
  timedLabel,
  tiers,
  roadmap,
}: StudyHubProps) {
  const styles = accentStyles[accent];

  return (
    <div className="min-h-screen bg-[#ece8df] px-4 py-6 sm:px-6 sm:py-8">
      <div className={`mx-auto max-w-6xl overflow-hidden rounded-[32px] border bg-gradient-to-br ${styles.surface} shadow-[0_24px_80px_rgba(15,23,42,0.08)]`}>
        <div className="border-b border-black/10 px-6 py-6 sm:px-10 sm:py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold tracking-[0.2em] ${styles.chip}`}>
                {eyebrow}
              </div>
              <h1 className="mt-4 font-serif text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                {description}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition-colors hover:bg-white"
              >
                메인으로
              </Link>
              <Link
                href={timedHref}
                className={`inline-flex h-12 items-center justify-center rounded-2xl border px-5 text-sm font-bold transition-colors ${styles.outlineButton}`}
              >
                {timedLabel}
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 sm:px-10 sm:py-10 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-slate-900">공부 단계 선택</h2>
                <p className="mt-1 text-sm text-slate-500">기본, 응용, 심화 세트를 원하는 순서로 계속 풀 수 있습니다.</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {tiers.map((tier) => (
                <article
                  key={tier.slug}
                  className={`flex h-full flex-col rounded-[28px] border ${styles.softBorder} bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black tracking-[0.18em] ${styles.chip}`}>
                        {tier.badge}
                      </div>
                      <h3 className="mt-4 font-serif text-2xl font-bold text-slate-900">{tier.title}</h3>
                    </div>
                    <span className={`material-symbols-outlined text-3xl ${styles.strong}`}>menu_book</span>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-slate-600">{tier.description}</p>

                  <div className={`mt-5 rounded-2xl border ${styles.softBorder} ${styles.softPanel} p-4`}>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">추천 상황</div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{tier.recommendedFor}</p>
                  </div>

                  <div className="mt-5">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">포함 단원</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tier.topics.map((topic) => (
                        <span
                          key={topic}
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${styles.chip}`}
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    {tier.focusPoints.map((point) => (
                      <div key={point} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                        <span className={`material-symbols-outlined mt-0.5 text-base ${styles.strong}`}>check_circle</span>
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={`${basePath}/${tier.slug}`}
                    className={`mt-6 inline-flex h-12 items-center justify-center rounded-2xl px-4 text-sm font-bold transition-colors ${styles.solidButton}`}
                  >
                    이 단계 풀기
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <div className={`rounded-[28px] border ${styles.softBorder} bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]`}>
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-2xl ${styles.strong}`}>school</span>
                <h2 className="font-serif text-xl font-bold text-slate-900">학습 방식</h2>
              </div>
              <div className="mt-5 space-y-4">
                {roadmap.map((step, index) => (
                  <div key={step.title} className="flex gap-3">
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-sm font-black ${styles.chip}`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{step.title}</div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-[28px] border ${styles.softBorder} ${styles.softPanel} p-6`}>
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-2xl ${styles.strong}`}>hourglass_disabled</span>
                <h2 className="font-serif text-xl font-bold text-slate-900">이 페이지의 기준</h2>
              </div>
              <div className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
                <p>시간 제한 없이 문제를 풀고, 막히면 힌트를 펼쳐 개념을 다시 확인할 수 있습니다.</p>
                <p>정답을 맞히거나 모르겠다고 넘긴 뒤에는 사용자가 직접 다음 문제로 이동합니다.</p>
                <p>타임어택 점수 대신 풀이량, 정답 수, 정답률을 중심으로 학습 흐름을 유지합니다.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
