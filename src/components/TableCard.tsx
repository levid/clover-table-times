'use client';

import { useState, useEffect } from 'react';
import { Users, Play, Pause, Square } from 'lucide-react';
import { formatCurrency } from '@/lib/pricing';
import { Timer } from './Timer';
import { Table } from '@/lib/store';

interface TableCardProps {
    table: Table;
    onStartSession: (tableId: string) => void;
    onPauseSession: (sessionId: string) => void;
    onResumeSession: (sessionId: string) => void;
    onEndSession: (sessionId: string) => void;
    onManagePlayers: (table: Table) => void;
    layout?: 'grid' | 'list';
}

export function TableCard({
    table,
    onStartSession,
    onPauseSession,
    onResumeSession,
    onEndSession,
    onManagePlayers,
    layout = 'grid',
}: TableCardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [estimatedCharge, setEstimatedCharge] = useState(0);
    const [isOverLimit, setIsOverLimit] = useState(false);
    const session = table.currentSession;
    const isActive = session?.status === 'ACTIVE';
    const isPaused = session?.status === 'PAUSED';
    const isOccupied = isActive || isPaused;
    const players = session?.players || [];

    useEffect(() => {
        if (!session || !isOccupied) {
            setEstimatedCharge(0);
            setIsOverLimit(false);
            return;
        }

        const updateCharge = () => {
            const start = new Date(session.startTime);
            const paused = session.pausedAt ? new Date(session.pausedAt) : null;
            const now = paused || new Date();
            const elapsedMs = now.getTime() - start.getTime() - session.totalPausedMs;
            const hours = Math.max(0, elapsedMs / (1000 * 60 * 60));
            setEstimatedCharge(hours * table.hourlyRate);

            // Check if over time limit
            if (table.timeLimitMinutes) {
                const elapsedMinutes = elapsedMs / (1000 * 60);
                setIsOverLimit(elapsedMinutes > table.timeLimitMinutes);
            } else {
                setIsOverLimit(false);
            }
        };

        updateCharge();
        const interval = setInterval(updateCharge, 1000);
        return () => clearInterval(interval);
    }, [session, isOccupied, table.hourlyRate, table.timeLimitMinutes]);

    const handleAction = async (action: () => void) => {
        setIsLoading(true);
        try {
            await action();
        } finally {
            setIsLoading(false);
        }
    };

    const handleCardClick = () => {
        if (!isOccupied && !isLoading) {
            handleAction(() => onStartSession(table.id));
        }
    };

    // List layout - horizontal full-width row
    if (layout === 'list') {
        const accentColor = isOverLimit ? '#ef4444' : '#0ea5e9';
        const accentBg = isOverLimit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)';

        return (
            <div
                className="relative overflow-hidden"
                style={{
                    background: isOccupied
                        ? isOverLimit
                            ? 'linear-gradient(180deg, #1c0c0c 0%, #140808 100%)'
                            : 'linear-gradient(180deg, #0c1929 0%, #0a1420 100%)'
                        : 'linear-gradient(180deg, #1c1c1e 0%, #141416 100%)',
                    borderRadius: 14,
                    border: isOccupied
                        ? `1px solid ${isOverLimit ? 'rgba(239, 68, 68, 0.4)' : 'rgba(14, 165, 233, 0.3)'}`
                        : '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    cursor: !isOccupied ? 'pointer' : undefined,
                    boxShadow: isOccupied
                        ? `0 4px 24px ${isOverLimit ? 'rgba(239, 68, 68, 0.15)' : 'rgba(14, 165, 233, 0.1)'}`
                        : undefined,
                }}
                onClick={!isOccupied ? handleCardClick : undefined}
            >
                {/* Table Name */}
                <div style={{ width: 100, flexShrink: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#fafafa' }}>
                        {table.name}
                    </span>
                </div>

                {/* Status/Timer */}
                <div style={{ width: 120, flexShrink: 0 }}>
                    {isOccupied && session ? (
                        <div className="flex items-center gap-2">
                            <div
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: isPaused ? '#f59e0b' : accentColor,
                                    boxShadow: isPaused
                                        ? '0 0 8px rgba(245, 158, 11, 0.5)'
                                        : `0 0 8px ${isOverLimit ? 'rgba(239, 68, 68, 0.5)' : 'rgba(14, 165, 233, 0.5)'}`,
                                }}
                            />
                            <Timer
                                startTime={session.startTime}
                                pausedAt={session.pausedAt}
                                totalPausedMs={session.totalPausedMs}
                                isPaused={isPaused}
                                style={{ fontSize: 14, fontWeight: 500, color: isOverLimit ? '#ef4444' : '#fafafa' }}
                            />
                        </div>
                    ) : (
                        <span style={{ fontSize: 13, color: '#52525b' }}>Available</span>
                    )}
                </div>

                {/* Charge */}
                <div style={{ width: 80, flexShrink: 0 }}>
                    {isOccupied ? (
                        <span style={{ fontSize: 15, fontWeight: 600, color: accentColor }}>
                            {formatCurrency(estimatedCharge)}
                        </span>
                    ) : (
                        <span style={{ fontSize: 13, color: '#71717a' }}>
                            {formatCurrency(table.hourlyRate)}/hr
                        </span>
                    )}
                </div>

                {/* Players */}
                <div style={{ flex: 1, minWidth: 100 }}>
                    {isOccupied && players.length > 0 ? (
                        <div className="flex items-center gap-2">
                            <Users style={{ width: 14, height: 14, color: '#71717a' }} />
                            <span style={{ fontSize: 13, color: '#a1a1aa' }}>
                                {players.map(p => p.name).join(', ')}
                            </span>
                        </div>
                    ) : isOccupied ? (
                        <span style={{ fontSize: 13, color: '#52525b' }}>No players</span>
                    ) : null}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                    {isOccupied ? (
                        <>
                            <button
                                onClick={() => onManagePlayers(table)}
                                className="flex items-center justify-center transition-all hover:bg-white/10"
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 10,
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                }}
                                title="Manage Players"
                            >
                                <Users style={{ width: 16, height: 16, color: '#a1a1aa' }} />
                            </button>
                            {isPaused ? (
                                <button
                                    onClick={() => handleAction(() => onResumeSession(session!.id))}
                                    disabled={isLoading}
                                    className="flex items-center justify-center transition-all hover:brightness-110"
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        backgroundColor: '#0ea5e9',
                                    }}
                                    title="Resume"
                                >
                                    <Play style={{ width: 16, height: 16, color: '#fff', marginLeft: 2 }} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleAction(() => onPauseSession(session!.id))}
                                    disabled={isLoading}
                                    className="flex items-center justify-center transition-all hover:bg-amber-500/20"
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                    }}
                                    title="Pause"
                                >
                                    <Pause style={{ width: 16, height: 16, color: '#f59e0b' }} />
                                </button>
                            )}
                            <button
                                onClick={() => handleAction(() => onEndSession(session!.id))}
                                disabled={isLoading}
                                className="flex items-center justify-center transition-all hover:bg-red-500/20"
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 10,
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                }}
                                title="End Session"
                            >
                                <Square style={{ width: 14, height: 14, color: '#ef4444' }} />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleCardClick}
                            disabled={isLoading}
                            className="flex items-center justify-center transition-all hover:brightness-110"
                            style={{
                                height: 36,
                                padding: '0 16px',
                                borderRadius: 10,
                                fontSize: 13,
                                fontWeight: 500,
                                color: '#fff',
                                backgroundColor: '#0ea5e9',
                            }}
                        >
                            Start
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Available table card (grid layout)
    if (!isOccupied) {
        return (
            <div
                onClick={handleCardClick}
                className="relative cursor-pointer group"
                style={{
                    background: 'linear-gradient(180deg, #1c1c1e 0%, #141416 100%)',
                    borderRadius: 16,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: 24,
                    minHeight: 180,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.3)';
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#fafafa', letterSpacing: '-0.01em' }}>
                        {table.name}
                    </span>
                    <div
                        style={{
                            padding: '6px 12px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 500,
                            color: '#71717a',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        }}
                    >
                        Available
                    </div>
                </div>

                {/* Timer placeholder */}
                <div className="flex-1 flex items-center justify-center" style={{ padding: '16px 0' }}>
                    <span
                        className="timer-display font-mono"
                        style={{
                            fontSize: 52,
                            fontWeight: 300,
                            letterSpacing: '0.02em',
                            color: '#3f3f46',
                        }}
                    >
                        00:00:00
                    </span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 13, color: '#52525b' }}>Tap to start</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#71717a' }}>
                        {formatCurrency(table.hourlyRate)}/hr
                    </span>
                </div>
            </div>
        );
    }

    // Active/Paused table card - Blue accent (or Red when over limit)
    const accentColor = isOverLimit ? '#ef4444' : '#0ea5e9';

    return (
        <div
            className="relative overflow-hidden"
            style={{
                background: isOverLimit
                    ? 'linear-gradient(180deg, #1c0c0c 0%, #140808 100%)'
                    : 'linear-gradient(180deg, #0c1929 0%, #0a1420 100%)',
                borderRadius: 16,
                border: `1px solid ${isOverLimit ? 'rgba(239, 68, 68, 0.4)' : 'rgba(14, 165, 233, 0.3)'}`,
                padding: 24,
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: isOverLimit
                    ? '0 4px 24px rgba(239, 68, 68, 0.15), 0 0 0 1px rgba(239, 68, 68, 0.05) inset'
                    : '0 4px 24px rgba(14, 165, 233, 0.1), 0 0 0 1px rgba(14, 165, 233, 0.05) inset',
            }}
        >
            {/* Glow effect */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: isOverLimit
                        ? 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.3), transparent)'
                        : 'linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.3), transparent)',
                }}
            />

            {/* Header */}
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#fafafa', letterSpacing: '-0.01em' }}>
                    {table.name}
                </span>
                <div className="flex items-center gap-2">
                    <div
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: isPaused ? '#f59e0b' : accentColor,
                            boxShadow: isPaused
                                ? '0 0 12px rgba(245, 158, 11, 0.5)'
                                : `0 0 12px ${isOverLimit ? 'rgba(239, 68, 68, 0.5)' : 'rgba(14, 165, 233, 0.5)'}`,
                            animation: isPaused ? 'none' : 'pulse 2s infinite',
                        }}
                    />
                    <span
                        style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: isPaused ? '#f59e0b' : accentColor,
                        }}
                    >
                        {isOverLimit ? 'Over Limit' : isPaused ? 'Paused' : 'Active'}
                    </span>
                </div>
            </div>

            {/* Players row */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onManagePlayers(table);
                }}
                className="flex items-center gap-2 transition-colors"
                style={{
                    padding: '8px 12px',
                    marginTop: 4,
                    marginBottom: 4,
                    borderRadius: 10,
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    fontSize: 13,
                    color: '#71717a',
                }}
            >
                <Users style={{ width: 16, height: 16 }} />
                {players.length === 0 ? (
                    <span>Add players</span>
                ) : (
                    <span className="truncate" style={{ maxWidth: 180 }}>
                        {players.map(p => p.name).join(', ')}
                    </span>
                )}
            </button>

            {/* Timer */}
            <div className="flex-1 flex items-center justify-center" style={{ padding: '12px 0' }}>
                <Timer
                    startTime={session!.startTime}
                    pausedAt={session!.pausedAt}
                    totalPausedMs={session!.totalPausedMs}
                    isPaused={isPaused}
                    className="timer-display"
                    style={{
                        fontSize: 52,
                        fontWeight: 300,
                        letterSpacing: '0.02em',
                        color: isOverLimit ? '#ef4444' : isPaused ? '#f59e0b' : '#fafafa',
                    }}
                />
            </div>

            {/* Footer with Running Charge */}
            <div
                className="flex items-center justify-between"
                style={{
                    padding: '12px 16px',
                    marginTop: 8,
                    borderRadius: 12,
                    backgroundColor: isOverLimit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.08)',
                }}
            >
                <span style={{ fontSize: 13, color: '#71717a' }}>Running Charge</span>
                <span style={{ fontSize: 18, fontWeight: 600, color: accentColor }}>
                    {formatCurrency(estimatedCharge)}
                </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3" style={{ marginTop: 16 }}>
                {isActive && session && (
                    <>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAction(() => onPauseSession(session.id));
                            }}
                            disabled={isLoading}
                            className="flex-1 flex items-center justify-center gap-2 font-semibold transition-all hover:brightness-110"
                            style={{
                                height: 44,
                                fontSize: 14,
                                color: '#fff',
                                backgroundColor: '#f59e0b',
                                borderRadius: 12,
                                opacity: isLoading ? 0.5 : 1,
                            }}
                        >
                            <Pause style={{ width: 16, height: 16 }} />
                            Pause
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAction(() => onEndSession(session.id));
                            }}
                            disabled={isLoading}
                            className="flex-1 flex items-center justify-center gap-2 font-semibold transition-all hover:brightness-110"
                            style={{
                                height: 44,
                                fontSize: 14,
                                color: '#fff',
                                backgroundColor: '#ef4444',
                                borderRadius: 12,
                                opacity: isLoading ? 0.5 : 1,
                            }}
                        >
                            <Square style={{ width: 14, height: 14 }} />
                            End
                        </button>
                    </>
                )}

                {isPaused && session && (
                    <>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAction(() => onResumeSession(session.id));
                            }}
                            disabled={isLoading}
                            className="flex-1 flex items-center justify-center gap-2 font-semibold transition-all hover:brightness-110"
                            style={{
                                height: 44,
                                fontSize: 14,
                                color: '#fff',
                                backgroundColor: '#0ea5e9',
                                borderRadius: 12,
                                opacity: isLoading ? 0.5 : 1,
                            }}
                        >
                            <Play style={{ width: 16, height: 16 }} />
                            Resume
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAction(() => onEndSession(session.id));
                            }}
                            disabled={isLoading}
                            className="flex-1 flex items-center justify-center gap-2 font-semibold transition-all hover:brightness-110"
                            style={{
                                height: 44,
                                fontSize: 14,
                                color: '#fff',
                                backgroundColor: '#ef4444',
                                borderRadius: 12,
                                opacity: isLoading ? 0.5 : 1,
                            }}
                        >
                            <Square style={{ width: 14, height: 14 }} />
                            End
                        </button>
                    </>
                )}
            </div>

            {/* Pulse animation for active indicator */}
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}
