'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CognitiveType } from '@/lib/MiddleMathGenerator';
import MiddlePracticeGame from '@/components/MiddlePracticeGame';

const TOPICS: { id: CognitiveType; label: string; subject: string }[] = [
    { id: 'reflex', label: '기본 연산 / 직관적 사고', subject: '인지: 반사 연산' },
    { id: 'sense', label: '비율 파악 / 소수 판별', subject: '인지: 수 감각' },
    { id: 'pattern', label: '패턴 파악 / 분해', subject: '인지: 형태 파악' },
    { id: 'compute', label: '방정식 풀이 / 다항 연산', subject: '인지: 계산력' },
    { id: 'think', label: '이차방정식 / 근과 계수', subject: '인지: 깊은 생각' },
    { id: 'geometry', label: '피타고라스 / 닮음 / 외각', subject: '인지: 시각 직관' },
    { id: 'inference', label: '수열 규칙 찾기', subject: '인지: 규칙 추론' },
    { id: 'structure', label: '경우의 수 / 확률', subject: '인지: 공간 카운팅' },
    { id: 'judgment', label: '유/무리수 식별 / 부등식', subject: '인지: 조건 논리' },
    { id: 'logical', label: '다중 조건 결합 탐색', subject: '인지: 논리 복합' },
    { id: 'backtrack', label: '역산 / 결과에서 원인 찾기', subject: '인지: 역추적' }
];

export default function MiddlePracticeSetupPage() {
    const [selectedTypes, setSelectedTypes] = useState<Set<CognitiveType>>(new Set(TOPICS.map(t => t.id)));
    const [isPracticing, setIsPracticing] = useState(false);
    const [seed, setSeed] = useState<string>('');

    const toggleType = (type: CognitiveType) => {
        const next = new Set(selectedTypes);
        if (next.has(type)) {
            next.delete(type);
        } else {
            next.add(type);
        }
        setSelectedTypes(next);
    };

    const toggleAll = () => {
        if (selectedTypes.size === TOPICS.length) {
            setSelectedTypes(new Set());
        } else {
            setSelectedTypes(new Set(TOPICS.map(t => t.id)));
        }
    };

    const handleStart = () => {
        if (selectedTypes.size === 0) {
            alert('최소 1개 이상의 유형을 선택해야 합니다.');
            return;
        }
        setSeed(`middle-practice-${Date.now()}`);
        setIsPracticing(true);
    };

    if (isPracticing && seed) {
        return <MiddlePracticeGame seed={seed} allowedTypes={Array.from(selectedTypes)} onQuit={() => setIsPracticing(false)} />;
    }

    return (
        <div className="min-h-screen bg-[#e8e8e8] text-slate-900 font-sans p-4 sm:p-8 flex items-center justify-center">
            <div className="w-full max-w-lg bg-paper shadow-2xl overflow-hidden relative">
                <header className="px-6 py-4 border-b-2 border-slate-800 flex items-center justify-between">
                    <h1 className="text-xl sm:text-2xl font-black font-serif text-slate-900">중등 연습 모드 설정</h1>
                    <Link href="/">
                        <button className="text-slate-500 hover:text-slate-900 transition-colors">
                            <span className="material-symbols-outlined text-2xl">close</span>
                        </button>
                    </Link>
                </header>

                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-bold text-slate-500 tracking-tight">연습할 인지 유형 선택</h2>
                        <button
                            onClick={toggleAll}
                            className="text-xs font-bold text-amber-600 hover:underline"
                        >
                            {selectedTypes.size === TOPICS.length ? '전체 해제' : '전체 선택'}
                        </button>
                    </div>

                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                        {TOPICS.map(topic => (
                            <button key={topic.id}
                                onClick={() => toggleType(topic.id)}
                                className={`w-full text-left flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer select-none active:scale-[0.99] ${selectedTypes.has(topic.id) ? 'border-amber-600 bg-amber-50' : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}>
                                <div className="flex flex-col">
                                    <span className={`font-bold ${selectedTypes.has(topic.id) ? 'text-amber-700' : 'text-slate-700'}`}>
                                        {topic.label}
                                    </span>
                                    <span className="text-xs text-slate-400 font-serif mt-0.5">{topic.subject}</span>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedTypes.has(topic.id) ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                                    }`}>
                                    {selectedTypes.has(topic.id) && <span className="material-symbols-outlined text-[16px] text-white">check</span>}
                                </div>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleStart}
                        disabled={selectedTypes.size === 0}
                        className="mt-6 w-full py-4 rounded-xl text-lg font-black font-serif transition-transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 bg-slate-900 text-white shadow-md hover:shadow-lg disabled:hover:shadow-md"
                    >
                        <span className="material-symbols-outlined mb-0.5">edit_square</span>
                        연습 시작
                    </button>
                </div >
            </div >
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div >
    );
}
