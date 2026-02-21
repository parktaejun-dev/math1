'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { QType } from '@/lib/MathGenerator';
import PracticeGame from '@/components/PracticeGame';

const TOPICS: { id: QType; label: string; subject: string }[] = [
    { id: 'exp', label: '지수 계산', subject: '수학 I' },
    { id: 'log', label: '로그 계산', subject: '수학 I' },
    { id: 'trig_basic', label: '삼각함수 기본', subject: '수학 I' },
    { id: 'sigma_basic', label: '시그마 성질', subject: '수학 I' },
    { id: 'seq', label: '수열의 합 추론', subject: '수학 I' },
    { id: 'limit_basic', label: '함수의 극한', subject: '수학 II' },
    { id: 'continuity', label: '함수의 연속', subject: '수학 II' },
    { id: 'diff', label: '미분계수', subject: '수학 II' },
    { id: 'extrema', label: '다항함수 극대/극소', subject: '수학 II' },
    { id: 'int', label: '정적분', subject: '수학 II' }
];

export default function PracticeSetupPage() {
    const [selectedTypes, setSelectedTypes] = useState<Set<QType>>(new Set(TOPICS.map(t => t.id)));
    const [isPracticing, setIsPracticing] = useState(false);
    const [seed, setSeed] = useState<string>('');

    const toggleType = (type: QType) => {
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
        setSeed(`practice-${Date.now()}`);
        setIsPracticing(true);
    };

    if (isPracticing && seed) {
        return <PracticeGame seed={seed} allowedTypes={Array.from(selectedTypes)} onQuit={() => setIsPracticing(false)} />;
    }

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 font-sans p-4 sm:p-8 flex items-center justify-center">
            <div className="w-full max-w-lg bg-paper shadow-2xl overflow-hidden relative">
                <header className="px-6 py-4 border-b-2 border-slate-800 flex items-center justify-between">
                    <h1 className="text-xl sm:text-2xl font-black font-serif text-slate-900">연습 모드 설정</h1>
                    <Link href="/">
                        <button className="text-slate-500 hover:text-slate-900 transition-colors">
                            <span className="material-symbols-outlined text-2xl">close</span>
                        </button>
                    </Link>
                </header>

                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-bold text-slate-500 tracking-tight">연습할 유형 선택</h2>
                        <button
                            onClick={toggleAll}
                            className="text-xs font-bold text-primary hover:underline"
                        >
                            {selectedTypes.size === TOPICS.length ? '전체 해제' : '전체 선택'}
                        </button>
                    </div>

                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                        {TOPICS.map(topic => (
                            <label key={topic.id} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer select-none active:scale-[0.99] ${selectedTypes.has(topic.id) ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}>
                                <div className="flex flex-col">
                                    <span className={`font-bold ${selectedTypes.has(topic.id) ? 'text-primary' : 'text-slate-700'}`}>
                                        {topic.label}
                                    </span>
                                    <span className="text-xs text-slate-400 font-serif mt-0.5">{topic.subject}</span>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedTypes.has(topic.id) ? 'border-primary bg-primary' : 'border-slate-300'
                                    }`}>
                                    {selectedTypes.has(topic.id) && <span className="material-symbols-outlined text-[16px] text-white">check</span>}
                                </div>
                            </label>
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
                </div>
            </div>
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
        </div>
    );
}
