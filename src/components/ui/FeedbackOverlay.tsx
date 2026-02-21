import React from 'react';

interface FeedbackOverlayProps {
    feedback: 'correct' | 'wrong' | null;
    correctText?: string;
    wrongText?: string;
}

export default function FeedbackOverlay({
    feedback,
    correctText = "1등급",
    wrongText = "오답"
}: FeedbackOverlayProps) {
    if (!feedback) return null;

    if (feedback === 'correct') {
        return (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50 animate-pulse-fast">
                <div className="bg-green-500/20 w-full h-full absolute"></div>
                <span className="text-6xl sm:text-7xl font-bold text-green-500 drop-shadow-md rotate-[-10deg] animate-pop-in font-serif">
                    {correctText}
                </span>
            </div>
        );
    }

    if (feedback === 'wrong') {
        return (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
                <div className="bg-red-500/10 w-full h-full absolute animate-flash"></div>
                <span className="text-6xl sm:text-7xl font-bold text-red-500 drop-shadow-md rotate-[5deg] animate-pop-in font-serif">
                    {wrongText}
                </span>
            </div>
        );
    }

    return null;
}
