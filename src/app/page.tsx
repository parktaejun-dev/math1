'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { playSchoolBell, isSoundEnabled, toggleSound } from '@/lib/sound';

interface LeaderboardEntry {
  userId: string;
  score: number;
}

interface HistoryEntry {
  score?: number;
  date?: string;
  accuracy?: number;
  maxCombo?: number;
}

const studyMenuItems = [
  {
    href: '/practice',
    label: '고등학교 학습',
    description: '수능형 기본, 응용, 심화 세트를 시간 제한 없이 순서대로 풀 수 있습니다.',
    accentClass: 'border-navy-official/20 bg-white text-navy-official',
    icon: 'calculate',
  },
  {
    href: '/middle/practice',
    label: '중학교 학습',
    description: '학교 시험형 기본 문제부터 사고력 중심 심화 세트까지 단계별로 정리했습니다.',
    accentClass: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: 'school',
  },
] as const;

export default function HomePage() {
  const router = useRouter();
  const [suneungLeaderboard, setSuneungLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [middleLeaderboard, setMiddleLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'suneung' | 'middle'>('suneung');

  const [school, setSchool] = useState('');
  const [name, setName] = useState('');
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [showNotice, setShowNotice] = useState(false);
  const [isStudyMenuOpen, setIsStudyMenuOpen] = useState(false);
  const audioPlayed = useRef(false);

  // Stats State
  const [personalBest, setPersonalBest] = useState<number>(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);

  const handleNoticeToggle = () => {
    const next = !showNotice;
    setShowNotice(next);
    // Play school bell on first interaction (accordion click)
    if (!audioPlayed.current && isSoundEnabled()) {
      audioPlayed.current = true;
      playSchoolBell();
    }
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/leaderboard').then(r => r.json().catch(() => ({}))),
      fetch('/api/leaderboard/middle').then(r => r.json().catch(() => ({})))
    ])
      .then(([suneungData, middleData]) => {
        setSuneungLeaderboard(suneungData.leaderboard || []);
        setMiddleLeaderboard(middleData.leaderboard || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));

    const restoreId = window.setTimeout(() => {
      setSchool(localStorage.getItem('suneung1_school') || '');
      setName(localStorage.getItem('suneung1_name') || '');
      setPersonalBest(parseInt(localStorage.getItem('suneung1_pb') || '0', 10));

      try {
        const hist = JSON.parse(localStorage.getItem('suneung1_history') || '[]');
        setHistory(Array.isArray(hist) ? hist : []);
      } catch {
        setHistory([]);
      }

      try {
        const ach = JSON.parse(localStorage.getItem('suneung1_achievements') || '[]');
        setAchievements(Array.isArray(ach) ? ach : []);
      } catch {
        setAchievements([]);
      }
    }, 0);

    return () => window.clearTimeout(restoreId);
  }, []);

  useEffect(() => {
    if (!isStudyMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsStudyMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isStudyMenuOpen]);

  const handleStart = () => {
    let devId = localStorage.getItem('suneung1_deviceId');
    if (!devId) {
      devId = Math.random().toString(36).substring(2, 9);
      localStorage.setItem('suneung1_deviceId', devId);
    }
    const finalSchool = school.trim() || '소속없음';
    const finalName = name.trim() || '수험생';

    localStorage.setItem('suneung1_school', finalSchool);
    localStorage.setItem('suneung1_name', finalName);
    localStorage.setItem('suneung1_userId', `${finalSchool} ${finalName}#${devId}`);

    router.push('/play');
  };

  const handleMiddleStart = () => {
    let devId = localStorage.getItem('suneung1_deviceId');
    if (!devId) {
      devId = Math.random().toString(36).substring(2, 9);
      localStorage.setItem('suneung1_deviceId', devId);
    }
    const finalSchool = school.trim() || '소속없음';
    const finalName = name.trim() || '수험생';

    localStorage.setItem('suneung1_school', finalSchool);
    localStorage.setItem('suneung1_name', finalName);
    localStorage.setItem('suneung1_userId', `${finalSchool} ${finalName}#${devId}`);

    router.push('/middle/play');
  };

  return (
    <div className="font-sans text-ink flex flex-col items-center py-8 min-h-screen bg-[#e8e8e8] bg-[url(https://lh3.googleusercontent.com/aida-public/AB6AXuAJKyLrtvjl4ZoLlzPAtau-RoXWcpoih6W0vJa1ZzMVZjinzRRXaNprxUrjuKAKkHq84QUaO6-igY-ehkc24E0PcVQnNIhEARY9brsXLmE_9_3zcibC9HTglNw9TzPOTTtUeN-1TOa3Gdz1Oqga_w-Sjn6ehZimYwj1yXKsssnZ4iATX3WY_EoljGYEUSuMd6bypBM1nJeJk7Y3T-e9-WpP9Hqq4OeK9QsLoqb9PWIVsLUmI-xNdtj4ChLiemyPZoB_FEiQHCHo1Ks)]">
      {isStudyMenuOpen ? (
        <div className="fixed inset-0 z-50" aria-hidden={!isStudyMenuOpen}>
          <button
            type="button"
            onClick={() => setIsStudyMenuOpen(false)}
            className="absolute inset-0 bg-black/35"
            aria-label="학습 메뉴 닫기"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-slate-300 bg-[#fbfaf6] shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-sans text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Study Menu</p>
                  <h2 className="mt-2 font-serif text-3xl font-bold text-slate-900">학습 페이지 선택</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    타임어택과 분리된 공부용 서브페이지입니다. 학교급별로 바로 나눠서 들어가면 됩니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStudyMenuOpen(false)}
                  className="rounded-full border border-slate-300 bg-white p-2 text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-800"
                  aria-label="학습 메뉴 닫기 버튼"
                >
                  <span className="material-symbols-outlined block text-[20px]">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
              {studyMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsStudyMenuOpen(false)}
                  className={`block rounded-3xl border p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg ${item.accentClass}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl border border-current/15 bg-white/80 p-3">
                      <span className="material-symbols-outlined block text-[28px]">{item.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-serif text-2xl font-bold tracking-tight">{item.label}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold">
                        <span>바로 이동</span>
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      <div className="bg-paper shadow-paper border border-[#d4d4d4] w-full max-w-[210mm] min-h-[297mm] p-8 md:p-12 mx-auto relative overflow-hidden">
        <header className="flex justify-between items-end border-b-2 border-black pb-2 mb-8 relative">
          <div className="text-sm font-serif">
            <span className="block text-gray-500">2027학년도 대학수학능력시험 대비</span>
            <span className="font-bold text-lg">수학 영역</span>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block">
              <div className="border border-black px-4 py-1 text-sm font-serif inline-block">
                제 2 교시
              </div>
            </div>

            <button
              onClick={() => {
                const newState = toggleSound();
                setSoundOn(newState);
                if (newState) playSchoolBell();
              }}
              className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm"
              aria-label="소리 켜기 또는 끄기"
            >
              <span className="material-symbols-outlined text-[20px] text-gray-700">
                {soundOn ? 'volume_up' : 'volume_off'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsStudyMenuOpen(true)}
              className="flex items-center gap-2 rounded-full border border-[#0f49bd] bg-[#0f49bd] px-4 py-2 text-white shadow-[0_10px_30px_rgba(15,73,189,0.24)] transition-colors hover:bg-[#0c3b97]"
              aria-label="공부하기 메뉴 열기"
              aria-expanded={isStudyMenuOpen}
            >
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
              <span className="font-sans text-sm font-bold">공부하기</span>
            </button>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center py-10 space-y-12 pb-32">
          <div className="text-center w-full space-y-6">
            <div className="inline-block relative">
              <h1 className="font-serif text-6xl md:text-7xl font-extrabold tracking-tight text-black mb-2">
                수능 1번
              </h1>
              <p className="font-serif text-lg text-gray-600 border-t border-black pt-2 inline-block px-8">
                기초 연산 능력 평가 및 타임어택
              </p>
            </div>
            <div className="max-w-xl mx-auto mt-8 border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={handleNoticeToggle}
                className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left cursor-pointer"
              >
                <span className="font-serif font-bold text-sm text-gray-800 tracking-wide">◀ 유의사항 확인 (클릭)</span>
                <span className={`text-gray-500 text-xs transition-transform duration-300 ${showNotice ? 'rotate-180' : ''}`}>▼</span>
              </button>
              <div
                className={`transition-all duration-400 ease-in-out overflow-hidden ${showNotice ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
              >
                <div className="px-5 py-4 bg-white border-t border-gray-200">
                  <p className="font-sans text-sm leading-7 text-justify break-keep text-gray-700">
                    1. 문제지의 해당란에 <strong>소속</strong>과 <strong>이름</strong>을 정확히 기입하시오.<br />
                    2. 답안은 5지선다 OMR 형식이며, 하나의 보기만 선택할 수 있습니다.<br />
                    3. 제한시간은 <strong>60초</strong>이며, 연속 정답 시 추가 시간과 콤보 보너스가 부여됩니다.<br />
                    4. 10콤보 달성 시 <strong style={{ color: '#c62828' }}>🔥 피버 모드</strong>가 발동하여 점수가 2배가 됩니다.<br />
                    5. 콤보가 쌓이면 레벨이 상승하며 고난이도 문제가 출제됩니다.<br />
                    6. 시험이 시작되면 <strong>중도에 멈출 수 없으며</strong>, 감독관에 대한 항의는 불가합니다.<br />
                    7. 본 시험의 성적은 <strong>전국 랭킹</strong>에 즉시 반영됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-6">
            <div className="w-full bg-white border border-slate-300 p-6 rounded-lg shadow-sm flex flex-col items-center gap-4">
              <div className="font-serif font-bold text-lg text-slate-800 border-b-2 border-slate-800 pb-1 w-full text-center tracking-widest">수험생 정보 입력</div>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <input
                  type="text"
                  placeholder="이름"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={5}
                  className="w-full sm:flex-1 px-4 py-3 border border-slate-300 rounded font-sans text-center outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-700 placeholder:font-normal text-base"
                />
                <input
                  type="text"
                  placeholder="소속"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  maxLength={10}
                  className="w-full sm:flex-1 px-4 py-3 border border-slate-300 rounded font-sans text-center outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-700 placeholder:font-normal text-base"
                />
              </div>
            </div>

            {/* Suneung Modes */}
            <div className="flex w-full">
              <button onClick={handleStart} className="group relative px-10 py-4 rounded-md shadow-sm border-2 border-navy-official text-navy-official hover:bg-navy-official hover:text-white hover:shadow-md transition-all duration-300 w-full block text-center">
                <div className="flex items-center justify-center space-x-3">
                  <span className="font-serif font-bold text-2xl tracking-widest whitespace-nowrap">수능 실전</span>
                  <span className="material-symbols-outlined text-2xl group-hover:translate-x-1 transition-transform">edit_square</span>
                </div>
              </button>
            </div>

            {/* Middle School Modes */}
            <div className="mt-8 flex w-full border-t border-slate-200 pt-8">
              <button onClick={handleMiddleStart} className="group relative px-10 py-4 rounded-md shadow-sm border-2 border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white hover:shadow-md transition-all duration-300 w-full block text-center">
                <div className="flex items-center justify-center space-x-3">
                  <span className="font-serif font-bold text-2xl tracking-widest whitespace-nowrap">중등 실전</span>
                  <span className="material-symbols-outlined text-2xl group-hover:translate-x-1 transition-transform">bolt</span>
                </div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsStudyMenuOpen(true)}
              className="w-full rounded-[28px] border-2 border-[#bfd0ff] bg-[linear-gradient(135deg,#f7fbff_0%,#edf4ff_100%)] p-5 text-left shadow-[0_18px_45px_rgba(15,73,189,0.12)] transition-transform duration-200 hover:-translate-y-0.5"
              aria-label="공부하기 메뉴 열기 버튼"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="inline-flex rounded-full border border-[#bfd0ff] bg-white px-3 py-1 text-[11px] font-bold tracking-[0.18em] text-[#0f49bd]">
                    STUDY
                  </div>
                  <div className="mt-3 font-serif text-2xl font-bold text-slate-900">공부하기</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    타임어택이 아니라 공부용 세트로 들어갑니다. 메뉴에서 고등학교 학습, 중학교 학습을 바로 고르면 됩니다.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#bfd0ff] bg-white px-3 py-1 text-xs font-semibold text-[#0f49bd]">고등학교 학습</span>
                    <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-700">중학교 학습</span>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#0f49bd]">
                    <span>학습 메뉴 열기</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </div>
                </div>
                <div className="rounded-3xl border border-[#bfd0ff] bg-white p-3 text-[#0f49bd] shadow-sm">
                  <span className="material-symbols-outlined block text-[28px]">menu_book</span>
                </div>
              </div>
            </button>
            <div className="w-full border-t border-b border-black py-4">
              <div className="grid grid-cols-4 divide-x divide-gray-400 text-center font-serif text-sm">
                <div className="px-2 flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-gray-700 text-xl">timer</span>
                  <span>60초 제한</span>
                </div>
                <div className="px-2 flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-gray-700 text-xl">list_alt</span>
                  <span>5지선다</span>
                </div>
                <div className="px-2 flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-gray-700 text-xl">whatshot</span>
                  <span>콤보 점수</span>
                </div>
                <div className="px-2 flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-gray-700 text-xl">leaderboard</span>
                  <span>전국 석차</span>
                </div>
              </div>
            </div>
          </div>

          {/* PB & Achievements Section */}
          {(personalBest > 0 || history.length > 0) && (
            <div className="w-full max-w-2xl mt-4">
              <div className="flex items-center gap-2 mb-2 border-b border-black w-full pb-1">
                <span className="bg-slate-800 text-white px-2 py-0.5 text-xs font-serif font-bold rounded-sm">내 기록</span>
                <h3 className="font-serif font-bold text-base">개인 성적표</h3>
              </div>
              <div className="border border-slate-300 bg-white p-6 rounded-sm shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-6 pb-2">
                <div className="flex flex-col border-b sm:border-b-0 sm:border-r border-slate-200 pb-4 sm:pb-0 sm:pr-6">
                  <div className="text-xs font-serif text-slate-500 mb-1">최고 표점 (Personal Best)</div>
                  <div className="text-3xl font-black text-primary font-handwriting">{personalBest.toLocaleString()}</div>

                  <div className="text-xs font-serif text-slate-500 mt-4 mb-1">최근 정답률</div>
                  <div className="text-xl font-bold text-slate-800">
                    {history.length > 0
                      ? Math.round(history.slice(0, 5).reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / Math.min(5, history.length)) + '%'
                      : '-'}
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="text-xs font-serif text-slate-500 mb-2">획득한 업적 (배지)</div>
                  <div className="flex flex-wrap gap-2">
                    {achievements.length === 0 ? (
                      <span className="text-sm text-slate-400 font-serif">아직 획득한 업적이 없습니다.</span>
                    ) : (
                      <>
                        {achievements.includes('COMBO_10') && <div className="px-2 py-1 bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold rounded shadow-sm">🔥 10콤보</div>}
                        {achievements.includes('COMBO_20') && <div className="px-2 py-1 bg-orange-100 border border-orange-300 text-orange-800 text-[10px] font-bold rounded shadow-sm">⚡ 20콤보</div>}
                        {achievements.includes('COMBO_30') && <div className="px-2 py-1 bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-bold rounded shadow-sm">🌟 30콤보</div>}
                        {achievements.includes('COMBO_50') && <div className="px-2 py-1 bg-purple-100 border border-purple-300 text-purple-800 text-[10px] font-bold rounded shadow-sm">💎 50콤보</div>}
                        {achievements.includes('SCORE_10K') && <div className="px-2 py-1 bg-blue-100 border border-blue-300 text-blue-800 text-[10px] font-bold rounded shadow-sm">🎯 1만점 돌파</div>}
                        {achievements.includes('SCORE_30K') && <div className="px-2 py-1 bg-indigo-100 border border-indigo-300 text-indigo-800 text-[10px] font-bold rounded shadow-sm">🏆 3만점 돌파</div>}
                        {achievements.includes('PERFECT_10') && <div className="px-2 py-1 bg-green-100 border border-green-300 text-green-800 text-[10px] font-bold rounded shadow-sm">💯 퍼펙트(10문제+)</div>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="w-full mt-8">
            <div className="flex items-center gap-2 mb-2 border-b border-black w-full pb-1">
              <span className="bg-black text-white px-2 py-0.5 text-xs font-serif font-bold rounded-sm">참고</span>
              <h3 className="font-serif font-bold text-base">실시간 성적 우수자 현황</h3>
            </div>

            {/* Tabs */}
            <div className="flex w-full mb-4 border-b border-slate-300">
              <button
                onClick={() => setActiveTab('suneung')}
                className={`flex-1 py-3 text-sm font-bold font-serif transition-colors relative ${activeTab === 'suneung' ? 'text-navy-official' : 'text-slate-400 hover:text-slate-600'}`}
              >
                수능 실전
                {activeTab === 'suneung' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-navy-official" />}
              </button>
              <button
                onClick={() => setActiveTab('middle')}
                className={`flex-1 py-3 text-sm font-bold font-serif transition-colors relative ${activeTab === 'middle' ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                중등 실전
                {activeTab === 'middle' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-600" />}
              </button>
            </div>

            <div className="border border-gray-300 bg-gray-50 p-6 rounded-sm min-h-[150px]">
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 border-2 border-gray-300 rounded-full flex items-center justify-center bg-white">
                    <span className="material-symbols-outlined text-4xl text-gray-300 animate-spin">refresh</span>
                  </div>
                  <p className="font-serif font-bold text-gray-800">로딩 중...</p>
                </div>
              ) : (activeTab === 'suneung' ? suneungLeaderboard : middleLeaderboard).length === 0 ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-16 h-16 border-2 border-gray-300 rounded-full flex items-center justify-center bg-white">
                    <span className="material-symbols-outlined text-4xl text-gray-300">person_off</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-serif font-bold text-gray-800">현재 등록된 기록이 없습니다.</p>
                    <p className="font-sans text-xs text-gray-500">첫 번째 만점자가 되어 명예의 전당에 이름을 올리십시오.</p>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <div className="divide-y divide-gray-200">
                    {(activeTab === 'suneung' ? suneungLeaderboard : middleLeaderboard).slice(0, 10).map((entry, i) => (
                      <div key={entry.userId} className="flex justify-between items-center py-3">
                        <div className="flex items-center gap-4">
                          <span className={`font-serif font-bold text-lg w-6 text-center ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-gray-500'}`}>{i + 1}</span>
                          <span className="font-sans text-gray-800">{entry.userId.split('#')[0]}</span>
                        </div>
                        <span className="font-serif font-bold text-navy-official text-lg">{entry.score.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="absolute bottom-4 left-0 w-full text-center">
          <div className="border-t border-black w-10 mx-auto mb-2"></div>
          <p className="font-serif text-xs text-gray-500">한국교육과정평가원 스타일 패러디 - 수능1번</p>
          <div className="mt-2 font-serif font-bold text-lg">1 <span className="text-sm font-normal text-gray-400">/</span> 1</div>
        </footer>
      </div>
    </div>
  );
}
