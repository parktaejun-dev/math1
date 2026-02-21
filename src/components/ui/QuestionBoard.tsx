import React, { useState } from 'react';
import katex from 'katex';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Question } from '@/lib/MathGenerator';

interface QuestionBoardProps {
    currentIndex: number;
    currentLevel?: number;
    currentQuestion: Question | null;
    feedback: 'correct' | 'wrong' | null;
    selectedAnswer: number | null;
    onAnswer: (index: number) => void;
    isProcessing: boolean;
    onPass?: () => void;
    passPenaltyText?: string;
    aiMode?: boolean;
}

export default function QuestionBoard({
    currentIndex,
    currentLevel,
    currentQuestion,
    feedback,
    selectedAnswer,
    onAnswer,
    isProcessing,
    onPass,
    passPenaltyText,
    aiMode = false,
}: QuestionBoardProps) {
    const [isHintOpen, setIsHintOpen] = useState(false);
    const [aiExplanation, setAiExplanation] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Reset state when question changes
    React.useEffect(() => {
        setIsHintOpen(false);
        setAiExplanation(null);
        setIsAiLoading(false);
    }, [currentIndex]);

    if (!currentQuestion) return null;

    const handleToggleHint = async () => {
        if (!isHintOpen && aiMode && !aiExplanation && !isAiLoading) {
            setIsHintOpen(true);
            setIsAiLoading(true);
            try {
                const res = await fetch('/api/explain', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        latex: currentQuestion.latex,
                        choices: currentQuestion.choices,
                        answer: currentQuestion.answer
                    })
                });
                const data = await res.json();
                if (data.explanation) setAiExplanation(data.explanation);
                else setAiExplanation('해설을 불러오는데 실패했습니다.');
            } catch (err) {
                setAiExplanation('오류가 발생했습니다. 다시 시도해주세요.');
            } finally {
                setIsAiLoading(false);
            }
        } else {
            setIsHintOpen(!isHintOpen);
        }
    };

    // Render KaTeX safely (for pure math strings in the question itself)
    const renderLatex = (latex: string) => {
        try {
            return {
                __html: katex.renderToString(latex, {
                    throwOnError: false,
                    displayMode: true,
                }),
            };
        } catch {
            return { __html: latex };
        }
    };

    return (
        <div className="w-full flex-grow flex flex-col">
            <div key={`question-${currentIndex}`} className={`flex flex-col gap-2 mb-4 slide-in ${feedback === 'wrong' ? 'animate-shake' : ''}`}>
                <div className="flex gap-2 items-start">
                    <div className="text-xl font-black text-slate-900 leading-none mt-0.5 font-serif">{currentIndex + 1}.</div>
                    <div className="flex-1 flex flex-col">
                        <div
                            className="text-base sm:text-lg font-bold leading-relaxed text-slate-900 overflow-x-auto [&_.katex]:!text-slate-900 [&_.katex_*]:!text-slate-900 pb-2"
                            dangerouslySetInnerHTML={renderLatex(currentQuestion.latex)}
                        />
                    </div>
                    {currentLevel !== undefined && (
                        <div className="inline-block text-[11px] font-normal align-middle border border-slate-400 rounded-full px-1.5 py-0.5 ml-1 text-slate-600 leading-none whitespace-nowrap flex-shrink-0">
                            Lv.{currentLevel}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-auto pt-2">
                <div className="mb-4">
                    <button
                        onClick={handleToggleHint}
                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer rounded-lg border border-slate-200"
                    >
                        <span className="font-serif font-bold text-sm text-slate-700 tracking-wide flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-amber-500">{aiMode ? "smart_toy" : "lightbulb"}</span>
                            {aiMode ? "AI 정답 해설 보기" : "Hint"}
                        </span>
                        <span className={`text-slate-400 text-xs transition-transform duration-300 ${isHintOpen ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    <div
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${isHintOpen ? 'max-h-[800px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
                    >
                        <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-lg">
                            {aiMode ? (
                                isAiLoading ? (
                                    <div className="flex items-center justify-center py-4 text-slate-500 gap-2">
                                        <span className="material-symbols-outlined animate-spin text-xl">refresh</span>
                                        <span className="text-sm font-medium">AI 선생님이 해설을 작성중입니다...</span>
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-wrap [&_.katex]:!text-slate-800 prose prose-slate max-w-none prose-sm prose-p:my-1 prose-strong:text-slate-800 prose-strong:font-bold prose-ul:my-1 prose-li:my-0.5">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                        >
                                            {aiExplanation || ''}
                                        </ReactMarkdown>
                                    </div>
                                )
                            ) : (
                                <div className="text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-wrap [&_.katex]:!text-slate-800 prose prose-slate max-w-none prose-sm prose-p:my-1 prose-strong:text-slate-800 prose-strong:font-bold prose-ul:my-1 prose-li:my-0.5">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {currentQuestion.hint || '이 문제에 대한 팁이 없습니다.'}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {onPass && (
                    <div className="mb-6">
                        <button
                            onClick={onPass}
                            disabled={feedback !== null || isProcessing}
                            className="w-full px-4 py-3 bg-white text-slate-700 border-2 border-slate-300 border-dashed hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100 transition-all rounded-xl shadow-sm disabled:opacity-50 disabled:pointer-events-none flex flex-col items-center justify-center gap-0.5"
                        >
                            <span className="font-bold tracking-widest text-base">PASS</span>
                            {passPenaltyText && (
                                <span className="text-xs font-medium text-slate-500">{passPenaltyText}</span>
                            )}
                        </button>
                    </div>
                )}
                <div className="grid grid-cols-1 gap-2 w-full">
                    {currentQuestion.choices.map((choice, idx) => {
                        const numMap = ['①', '②', '③', '④', '⑤'];
                        const isSelected = feedback !== null && selectedAnswer === choice;
                        const isWrongSelect = feedback === 'wrong' && isSelected;

                        let containerClass = "flex items-center p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm";
                        let circleClass = "w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full border border-slate-300 text-sm font-serif mr-3 text-slate-500 bg-white";
                        let textClass = "text-base font-serif font-medium text-slate-800";

                        if (feedback !== null) {
                            if (choice === currentQuestion.answer) {
                                containerClass = "flex items-center p-3 rounded-lg border-2 border-green-500 bg-green-500/5 transition-all shadow-sm";
                                circleClass = "w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full border-2 border-green-500 bg-white text-green-500 text-sm font-serif mr-3 shadow-sm";
                                textClass = "text-base font-serif font-bold text-green-500";
                            } else if (isWrongSelect) {
                                containerClass = "flex items-center p-3 rounded-lg border-2 border-grading-red bg-grading-red/5 transition-all opacity-80 shadow-sm";
                                circleClass = "w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full border-2 border-grading-red bg-white text-grading-red text-sm font-serif mr-3 shadow-sm";
                                textClass = "text-base font-serif font-bold text-grading-red line-through decoration-2";
                            } else {
                                containerClass += " opacity-40";
                            }
                        }

                        return (
                            <button
                                key={`${currentQuestion.id}-${idx}`}
                                className={`w-full text-left group select-none ${feedback !== null ? 'pointer-events-none' : ''}`}
                                onClick={() => onAnswer(choice)}
                                disabled={feedback !== null || isProcessing}
                            >
                                <div className={containerClass}>
                                    <span className={circleClass}>{numMap[idx] || (idx + 1)}</span>
                                    <span className={textClass}>{choice}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
