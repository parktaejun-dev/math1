import React from 'react';
import katex from 'katex';
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
}: QuestionBoardProps) {
    if (!currentQuestion) return null;

    // Render KaTeX safely
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
