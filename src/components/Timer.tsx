'use client';

import { useEffect, useState, useCallback, CSSProperties } from 'react';
import { formatDuration, getElapsedSeconds } from '@/lib/pricing';

interface TimerProps {
    startTime: string;
    pausedAt?: string | null;
    totalPausedMs: number;
    isPaused?: boolean;
    className?: string;
    style?: CSSProperties;
}

export function Timer({ startTime, pausedAt, totalPausedMs, isPaused = false, className = '', style }: TimerProps) {
    const [elapsed, setElapsed] = useState(0);

    const calculateElapsed = useCallback(() => {
        const start = new Date(startTime);
        const paused = pausedAt ? new Date(pausedAt) : null;
        return getElapsedSeconds(start, totalPausedMs, paused);
    }, [startTime, pausedAt, totalPausedMs]);

    useEffect(() => {
        setElapsed(calculateElapsed());

        if (isPaused) return;

        const interval = setInterval(() => {
            setElapsed(calculateElapsed());
        }, 1000);

        return () => clearInterval(interval);
    }, [calculateElapsed, isPaused]);

    return (
        <span className={`font-mono ${className}`} style={style}>
            {formatDuration(elapsed)}
        </span>
    );
}
