import { useState, useEffect, useRef } from 'react';

type TimerMode = 'countdown' | 'stopwatch';

interface UseGameTimerProps {
    mode: TimerMode;
    initialValue: number;
    isPlaying: boolean;
    onComplete?: () => void;
}

export function useGameTimer({ mode, initialValue, isPlaying, onComplete }: UseGameTimerProps) {
    const [time, setTime] = useState(initialValue);
    const [timeDelta, setTimeDelta] = useState<{ value: number; key: number } | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!isPlaying) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        timerRef.current = setInterval(() => {
            setTime((prev) => {
                if (mode === 'countdown') {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        onComplete?.();
                        return 0;
                    }
                    return prev - 1;
                } else {
                    return prev + 1;
                }
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPlaying, mode, onComplete]);

    const addTime = (amount: number) => {
        if (mode === 'stopwatch') return;

        setTime((prev) => Math.max(0, prev + amount));
        setTimeDelta({ value: amount, key: Date.now() });
    };

    return { time, setTime, timeDelta, addTime };
}
