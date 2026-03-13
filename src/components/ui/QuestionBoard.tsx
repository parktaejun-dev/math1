import React, { useState } from 'react';
import katex from 'katex';
import { Question } from '@/lib/MathGenerator';
import GeometryCanvas from '@/components/GeometryCanvas';

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
    const containerRef = React.useRef<HTMLDivElement | null>(null);

    // Reset state when question changes
    React.useEffect(() => {
        setIsHintOpen(false);
        setAiExplanation(null);
        setIsAiLoading(false);
        containerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
        window.scrollTo({ top: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.requestAnimationFrame(() => {
            containerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
            window.scrollTo({ top: 0, behavior: 'auto' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        });
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
            } catch {
                setAiExplanation('오류가 발생했습니다. 다시 시도해주세요.');
            } finally {
                setIsAiLoading(false);
            }
        } else {
            setIsHintOpen(!isHintOpen);
        }
    };

    const normalizeProblemFragment = (fragment: string) => fragment
        .replace(/\\qquad/g, ' ')
        .replace(/\\quad/g, ' ')
        .replace(/\\,/g, ' ')
        .replace(/\\:/g, ' ')
        .replace(/\\;/g, ' ')
        .replace(/\\!/g, '')
        .replace(/~/g, ' ');

    const renderMathFragment = (fragment: string, key: string, displayMode: boolean) => {
        const normalized = normalizeProblemFragment(fragment).trim();
        if (!normalized) {
            return null;
        }

        try {
            return (
                <span
                    key={key}
                    className={
                        displayMode
                            ? 'study-problem-latex my-1 block max-w-full [&_.katex-display]:!my-0 [&_.katex-display]:!max-w-full [&_.katex]:!text-slate-900 [&_.katex_*]:!text-slate-900'
                            : 'inline-block max-w-full align-middle [&_.katex]:!text-slate-900 [&_.katex_*]:!text-slate-900'
                    }
                    dangerouslySetInnerHTML={{
                        __html: katex.renderToString(normalized, {
                            throwOnError: false,
                            displayMode,
                        })
                    }}
                />
            );
        } catch {
            return <React.Fragment key={key}>{normalized}</React.Fragment>;
        }
    };

    const isPlainProblemText = (fragment: string) => !/[\\^_{}]/.test(fragment);

    const isDisplayMathFragment = (fragment: string) => /\\begin\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\}/.test(fragment);

    const renderMixedProblemLatex = (latex: string) => {
        if (!latex.includes('\\text{') && !latex.includes('\\begin{gather')) {
            return null;
        }

        const tokens: Array<
            | { kind: 'text'; value: string }
            | { kind: 'inline-math'; value: string }
            | { kind: 'display-math'; value: string }
            | { kind: 'newline' }
        > = [];

        const pushFragment = (fragment: string) => {
            if (!fragment) {
                return;
            }

            const normalized = normalizeProblemFragment(fragment);
            if (!normalized.trim()) {
                return;
            }

            const lineParts = normalized.includes('\\begin{cases}')
                ? [normalized.replace(/^\s*\\\\/, '').replace(/\\\\\s*$/, '').trim()]
                : normalized.split(/\\\\/g);
            lineParts.forEach((part, index) => {
                const value = part.trim();
                if (value) {
                    if (isPlainProblemText(value)) {
                        tokens.push({ kind: 'text', value });
                    } else if (isDisplayMathFragment(value)) {
                        tokens.push({ kind: 'display-math', value });
                    } else {
                        tokens.push({ kind: 'inline-math', value });
                    }
                }

                if (index < lineParts.length - 1) {
                    tokens.push({ kind: 'newline' });
                }
            });
        };

        const gatherMatch = latex.match(/\\begin\{gather\*?\}([\s\S]*)\\end\{gather\*?\}/);
        const source = gatherMatch ? gatherMatch[1] : latex;
        const textPattern = /\\text\{([^{}]*)\}/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = textPattern.exec(source)) !== null) {
            pushFragment(source.slice(lastIndex, match.index));

            if (match[1]) {
                tokens.push({ kind: 'text', value: match[1] });
            }

            lastIndex = textPattern.lastIndex;
        }

        pushFragment(source.slice(lastIndex));

        if (tokens.length === 0) {
            return null;
        }

        const blocks: React.ReactNode[] = [];
        let inlineNodes: React.ReactNode[] = [];
        let paragraphIndex = 0;

        const flushInlineNodes = () => {
            if (inlineNodes.length === 0) {
                return;
            }

            blocks.push(
                <p
                    key={`problem-line-${paragraphIndex}`}
                    className="min-w-0 whitespace-pre-wrap break-words"
                >
                    {inlineNodes}
                </p>
            );
            inlineNodes = [];
            paragraphIndex += 1;
        };

        tokens.forEach((token, index) => {
            if (token.kind === 'newline') {
                flushInlineNodes();
                return;
            }

            if (token.kind === 'display-math') {
                flushInlineNodes();
                const block = renderMathFragment(token.value, `problem-display-${index}`, true);
                if (block) {
                    blocks.push(block);
                }
                return;
            }

            if (token.kind === 'text') {
                inlineNodes.push(
                    <React.Fragment key={`problem-text-${index}`}>
                        {token.value}
                    </React.Fragment>
                );
                return;
            }

            const inlineMath = renderMathFragment(token.value, `problem-math-${index}`, false);
            if (inlineMath) {
                inlineNodes.push(inlineMath);
            }
        });

        flushInlineNodes();

        return (
            <div className="max-w-full min-w-0 pb-2 text-base font-bold leading-relaxed text-slate-900 sm:text-lg">
                {blocks}
            </div>
        );
    };

    // Render KaTeX safely or inject GeometryCanvas
    const renderLatexOrSvg = (latex: string) => {
        if (latex.includes('[SVG_')) {
            return <GeometryCanvas latexParams={latex} />;
        }

        const mixedLatex = renderMixedProblemLatex(latex);
        if (mixedLatex) {
            return mixedLatex;
        }

        try {
            return (
                <div
                    className="study-problem-latex max-w-full min-w-0 pb-2 text-base font-bold leading-relaxed text-slate-900 sm:text-lg [&_.katex-display]:!my-0 [&_.katex-display]:!max-w-full [&_.katex]:!text-slate-900 [&_.katex_*]:!text-slate-900"
                    dangerouslySetInnerHTML={{
                        __html: katex.renderToString(latex, {
                            throwOnError: false,
                            displayMode: true,
                        })
                    }}
                />
            );
        } catch {
            return <div dangerouslySetInnerHTML={{ __html: latex }} />;
        }
    };

    const renderInlineMathText = (content: string, keyPrefix: string) => {
        const segments = content.split(/(\$\$[\s\S]+?\$\$|\$[^$]+\$)/g).filter(Boolean);

        return segments.map((segment, index) => {
            const isDisplayMath = segment.startsWith('$$') && segment.endsWith('$$');
            const isInlineMath = segment.startsWith('$') && segment.endsWith('$');

            if (!isDisplayMath && !isInlineMath) {
                return <React.Fragment key={`${keyPrefix}-text-${index}`}>{segment}</React.Fragment>;
            }

            const expression = segment.slice(isDisplayMath ? 2 : 1, isDisplayMath ? -2 : -1).trim();
            if (!expression) {
                return null;
            }

            try {
                return (
                    <span
                        key={`${keyPrefix}-math-${index}`}
                        className={isDisplayMath ? 'my-1 block max-w-full overflow-x-auto overflow-y-hidden' : 'inline-block max-w-full align-middle'}
                        dangerouslySetInnerHTML={{
                            __html: katex.renderToString(expression, {
                                throwOnError: false,
                                displayMode: isDisplayMath,
                            }),
                        }}
                    />
                );
            } catch {
                return <React.Fragment key={`${keyPrefix}-fallback-${index}`}>{segment}</React.Fragment>;
            }
        });
    };

    const renderRichText = (content: string) => {
        const lines = content.replace(/\r\n?/g, '\n').split('\n');

        return (
            <div className="space-y-3 text-sm leading-7 text-slate-700">
                {lines.map((line, index) => {
                    const trimmed = line.trim();

                    if (!trimmed) {
                        return <div key={`spacer-${index}`} className="h-1" />;
                    }

                    const stepMatch = trimmed.match(/^(\d+)\.\s*(.*)$/);
                    if (stepMatch) {
                        return (
                            <div key={`step-${index}`} className="flex items-start gap-3">
                                <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                                    {stepMatch[1]}
                                </span>
                                <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                                    {renderInlineMathText(stepMatch[2], `step-${index}`)}
                                </p>
                            </div>
                        );
                    }

                    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
                    if (bulletMatch) {
                        return (
                            <div key={`bullet-${index}`} className="flex items-start gap-3">
                                <span className="mt-[10px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                                <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                                    {renderInlineMathText(bulletMatch[1], `bullet-${index}`)}
                                </p>
                            </div>
                        );
                    }

                    return (
                        <p key={`line-${index}`} className="whitespace-pre-wrap break-words">
                            {renderInlineMathText(trimmed, `line-${index}`)}
                        </p>
                    );
                })}
            </div>
        );
    };

    return (
        <div ref={containerRef} className="flex h-full w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto scrollbar-hide">
            <div key={`question-${currentIndex}`} className={`slide-in min-w-0 pb-4 pr-1 ${feedback === 'wrong' ? 'animate-shake' : ''}`}>
                <div className="mt-2 flex min-w-0 items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                    <div className="text-xl font-black text-slate-900 leading-none mt-0.5 font-serif flex-shrink-0 w-6">{currentIndex + 1}.</div>
                    <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
                        {renderLatexOrSvg(currentQuestion.latex)}
                    </div>
                    {currentLevel !== undefined && (
                        <div className="inline-block text-[11px] font-normal align-middle border border-slate-400 rounded-full px-1.5 py-0.5 ml-1 text-slate-600 leading-none whitespace-nowrap flex-shrink-0">
                            Lv.{currentLevel}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-shrink-0 pt-1.5 border-t border-slate-100">
                <div className="mb-2">
                    <button
                        onClick={handleToggleHint}
                        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer rounded-lg border border-slate-200"
                    >
                        <span className="font-serif font-bold text-xs text-slate-700 tracking-wide flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-amber-500">{aiMode ? "smart_toy" : "lightbulb"}</span>
                            {aiMode ? "AI 정답 해설 보기" : "Hint"}
                        </span>
                        <span className={`text-slate-400 text-[10px] transition-transform duration-300 ${isHintOpen ? 'rotate-180' : ''}`}>▼</span>
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
                                ) : renderRichText(aiExplanation || '')
                            ) : (
                                renderRichText(currentQuestion.hint || '이 문제에 대한 팁이 없습니다.')
                            )}
                        </div>
                    </div>
                </div>

                {onPass && (
                    <div className="mb-3">
                        <button
                            onClick={onPass}
                            disabled={feedback !== null || isProcessing}
                            className="w-full px-3 py-2 bg-white text-slate-700 border-2 border-slate-300 border-dashed hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100 transition-all rounded-xl shadow-sm disabled:opacity-50 disabled:pointer-events-none flex flex-col items-center justify-center gap-0"
                        >
                            <span className="font-bold tracking-widest text-sm">PASS</span>
                            {passPenaltyText && (
                                <span className="text-[10px] font-medium text-slate-500">{passPenaltyText}</span>
                            )}
                        </button>
                    </div>
                )}
                <div className="grid grid-cols-1 gap-2 w-full">
                    {currentQuestion.choices.map((choice, idx) => {
                        const numMap = ['①', '②', '③', '④', '⑤'];
                        const isSelected = feedback !== null && selectedAnswer === choice;
                        const isWrongSelect = feedback === 'wrong' && isSelected;

                        let containerClass = "flex items-start p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm";
                        let circleClass = "w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full border border-slate-300 text-xs font-serif mr-2.5 text-slate-500 bg-white mt-0.5";
                        let textClass = "text-sm sm:text-base font-serif font-medium text-slate-800 flex-1 break-keep break-words whitespace-pre-wrap";

                        if (feedback !== null) {
                            if (choice === currentQuestion.answer) {
                                containerClass = "flex items-start p-2.5 rounded-lg border-2 border-green-500 bg-green-500/5 transition-all shadow-sm";
                                circleClass = "w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full border-2 border-green-500 bg-white text-green-500 text-xs font-serif mr-2.5 shadow-sm mt-0.5";
                                textClass = "text-sm sm:text-base font-serif font-bold text-green-500 flex-1 break-keep break-words whitespace-pre-wrap";
                            } else if (isWrongSelect) {
                                containerClass = "flex items-start p-2.5 rounded-lg border-2 border-grading-red bg-grading-red/5 transition-all opacity-80 shadow-sm";
                                circleClass = "w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full border-2 border-grading-red bg-white text-grading-red text-xs font-serif mr-2.5 shadow-sm mt-0.5";
                                textClass = "text-sm sm:text-base font-serif font-bold text-grading-red line-through decoration-2 flex-1 break-keep break-words whitespace-pre-wrap";
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

                {feedback !== null && (
                    <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold tracking-[0.16em] text-slate-600">
                                REVIEW
                            </span>
                            <span className="text-sm font-bold text-slate-900">정답 {currentQuestion.answer}</span>
                        </div>

                        <div>
                            <div className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">풀이 해설</div>
                            {renderRichText(currentQuestion.solution || currentQuestion.hint || '이 문제의 해설이 아직 준비되지 않았습니다.')}
                        </div>

                        {currentQuestion.misconception ? (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                                <div className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-rose-700">자주 하는 실수</div>
                                <div className="text-rose-900">
                                    {renderRichText(currentQuestion.misconception)}
                                </div>
                            </div>
                        ) : null}

                        {currentQuestion.teacherNote ? (
                            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                                <div className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-sky-700">교사 메모</div>
                                <div className="text-sky-900">
                                    {renderRichText(currentQuestion.teacherNote)}
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}
