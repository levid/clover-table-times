'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Settings as SettingsIcon, RefreshCw, History, LayoutGrid, Users, DollarSign } from 'lucide-react';
import { TableCard } from './TableCard';
import { CheckoutModal } from './CheckoutModal';
import { AddTableModal, SettingsModal } from './Modals';
import { SessionHistoryModal } from './SessionHistory';
import { PlayerManagerModal } from './PlayerManager';
import { WaitlistPanel } from './WaitlistPanel';
import { CloverStatusIndicator } from './CloverStatusIndicator';
import { PaymentHistory } from './PaymentHistory';
import { useTableStore, Table, Session, Settings, Player } from '@/lib/store';

export function Dashboard() {
    const {
        tables,
        settings,
        isLoading,
        error,
        setTables,
        setSettings,
        setLoading,
        setError,
        startSession,
        updateSession,
        endSession,
        addTable,
        removeTable,
        addPlayerToSession,
        removePlayerFromSession,
    } = useTableStore();

    const [showAddTable, setShowAddTable] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showWaitlist, setShowWaitlist] = useState(false);
    const [showPaymentHistory, setShowPaymentHistory] = useState(false);
    const [playerManagerTable, setPlayerManagerTable] = useState<Table | null>(null);
    const [displayMode, setDisplayMode] = useState<'grid' | 'list'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('displayMode');
            return (saved === 'list' || saved === 'grid') ? saved : 'grid';
        }
        return 'grid';
    });
    const [checkoutData, setCheckoutData] = useState<{
        table: Table;
        session: Session;
        charge: number;
    } | null>(null);

    const fetchTables = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/tables');
            if (!res.ok) throw new Error('Failed to fetch tables');
            const data = await res.json();
            setTables(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load tables');
        } finally {
            setLoading(false);
        }
    }, [setLoading, setTables, setError]);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await fetch('/api/settings');
            if (!res.ok) throw new Error('Failed to fetch settings');
            const data = await res.json();
            setSettings(data);
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    }, [setSettings]);

    useEffect(() => {
        fetchTables();
        fetchSettings();
    }, [fetchTables, fetchSettings]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(fetchTables, 30000);
        return () => clearInterval(interval);
    }, [fetchTables]);

    const handleStartSession = async (tableId: string) => {
        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableId }),
            });
            if (!res.ok) throw new Error('Failed to start session');
            const session = await res.json();
            startSession(tableId, session);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start session');
        }
    };

    const handlePauseSession = async (sessionId: string) => {
        try {
            const res = await fetch(`/api/sessions/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'pause' }),
            });
            if (!res.ok) throw new Error('Failed to pause session');
            const updated = await res.json();
            updateSession(updated.tableId, {
                status: 'PAUSED',
                pausedAt: updated.pausedAt,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to pause session');
        }
    };

    const handleResumeSession = async (sessionId: string) => {
        try {
            const res = await fetch(`/api/sessions/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'resume' }),
            });
            if (!res.ok) throw new Error('Failed to resume session');
            const updated = await res.json();
            updateSession(updated.tableId, {
                status: 'ACTIVE',
                pausedAt: undefined,
                totalPausedMs: updated.totalPausedMs,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to resume session');
        }
    };

    const handleEndSession = async (sessionId: string) => {
        const table = tables.find(t => t.currentSession?.id === sessionId);
        if (!table || !table.currentSession) return;

        try {
            const res = await fetch(`/api/sessions/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'end' }),
            });
            if (!res.ok) throw new Error('Failed to end session');
            const updated = await res.json();

            setCheckoutData({
                table,
                session: { ...table.currentSession, ...updated },
                charge: updated.totalCharge,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to end session');
        }
    };

    const handleCheckoutConfirm = async () => {
        if (!checkoutData) return;
        endSession(checkoutData.table.id);
        // Don't close the modal here - let CheckoutModal show payment confirmation first
        // The modal will close itself via onClose when user dismisses the confirmation
        await fetchTables();
    };

    const handleAddTable = async (name: string, tableNumber: number, hourlyRate: number) => {
        try {
            const res = await fetch('/api/tables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, tableNumber, hourlyRate }),
            });
            if (!res.ok) throw new Error('Failed to add table');
            const table = await res.json();
            addTable(table);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add table');
        }
    };

    const handleDeleteTable = async (id: string) => {
        try {
            const res = await fetch(`/api/tables/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete table');
            removeTable(id);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete table');
        }
    };

    const handleEditTable = async (id: string, name: string, hourlyRate: number, timeLimitMinutes?: number) => {
        try {
            const res = await fetch(`/api/tables/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, hourlyRate, timeLimitMinutes }),
            });
            if (!res.ok) throw new Error('Failed to update table');
            // Refresh tables to get updated data
            await fetchTables();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update table');
        }
    };

    const handleSaveSettings = async (newSettings: Settings) => {
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings),
            });
            if (!res.ok) throw new Error('Failed to save settings');
            const saved = await res.json();
            setSettings(saved);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save settings');
        }
    };

    const handlePlayerAdded = (player: Player) => {
        if (playerManagerTable) {
            addPlayerToSession(playerManagerTable.id, player);
            // Update the local state too
            const updatedTable = tables.find(t => t.id === playerManagerTable.id);
            if (updatedTable) {
                setPlayerManagerTable({
                    ...updatedTable,
                    currentSession: updatedTable.currentSession
                        ? {
                            ...updatedTable.currentSession,
                            players: [...(updatedTable.currentSession.players || []), player],
                        }
                        : undefined,
                });
            }
        }
    };

    const handlePlayerRemoved = (playerId: string) => {
        if (playerManagerTable) {
            removePlayerFromSession(playerManagerTable.id, playerId);
            setPlayerManagerTable({
                ...playerManagerTable,
                currentSession: playerManagerTable.currentSession
                    ? {
                        ...playerManagerTable.currentSession,
                        players: (playerManagerTable.currentSession.players || []).filter(
                            p => p.id !== playerId
                        ),
                    }
                    : undefined,
            });
        }
    };

    const handlePlayerUpdated = (updatedPlayer: Player) => {
        if (playerManagerTable?.currentSession) {
            // Update local state with new player data
            setPlayerManagerTable({
                ...playerManagerTable,
                currentSession: {
                    ...playerManagerTable.currentSession,
                    players: (playerManagerTable.currentSession.players || []).map(
                        p => p.id === updatedPlayer.id ? updatedPlayer : p
                    ),
                },
            });
        }
    };

    const activeTables = tables.filter(t => t.currentSession);
    const availableTables = tables.filter(t => !t.currentSession);

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
            {/* Header - Apple style with frosted glass */}
            <header
                className="sticky top-0 z-40"
                style={{
                    backgroundColor: 'rgba(10, 10, 10, 0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                }}
            >
                <div
                    className="mx-auto flex items-center justify-between"
                    style={{ paddingLeft: 32, paddingRight: 24, height: 72 }}
                >
                    {/* Venue Name */}
                    <div className="flex items-center" style={{ gap: 20 }}>
                        <span
                            style={{
                                fontSize: 24,
                                fontWeight: 700,
                                background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                letterSpacing: '-0.02em',
                            }}
                        >
                            {settings.venueName || 'Fat Cats'}
                        </span>
                        <div style={{ width: 1, height: 28, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                        <div className="flex items-baseline" style={{ gap: 10 }}>
                            <span style={{ fontSize: 18, fontWeight: 600, color: '#fafafa', letterSpacing: '-0.02em' }}>
                                Table Times
                            </span>
                            <span className="hidden sm:inline" style={{ fontSize: 13, color: '#52525b' }}>
                                Powered by Digital Pool
                            </span>
                        </div>
                    </div>

                    {/* Stats summary - pill style */}
                    <div className="hidden md:flex items-center" style={{ gap: 16 }}>
                        <div
                            className="flex items-center"
                            style={{
                                gap: 10,
                                padding: '10px 18px',
                                borderRadius: 24,
                                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                                border: '1px solid rgba(14, 165, 233, 0.2)',
                            }}
                        >
                            <div
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: '#0ea5e9',
                                    boxShadow: '0 0 8px rgba(14, 165, 233, 0.5)',
                                }}
                            />
                            <span style={{ fontSize: 14, fontWeight: 500, color: '#0ea5e9' }}>
                                {activeTables.length} Active
                            </span>
                        </div>
                        <div
                            className="flex items-center"
                            style={{
                                gap: 10,
                                padding: '10px 18px',
                                borderRadius: 24,
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                        >
                            <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3f3f46' }} />
                            <span style={{ fontSize: 14, fontWeight: 500, color: '#71717a' }}>
                                {availableTables.length} Available
                            </span>
                        </div>
                        {/* Clover Status */}
                        <CloverStatusIndicator />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center" style={{ gap: 8 }}>
                        <button
                            onClick={() => setShowPaymentHistory(true)}
                            className="flex items-center justify-center transition-all hover:bg-white/10"
                            style={{ width: 44, height: 44, borderRadius: 12 }}
                            title="Payment History"
                        >
                            <DollarSign style={{ width: 20, height: 20, color: '#71717a' }} />
                        </button>
                        <button
                            onClick={() => setShowWaitlist(true)}
                            className="flex items-center justify-center transition-all hover:bg-white/10"
                            style={{ width: 44, height: 44, borderRadius: 12 }}
                            title="Waitlist"
                        >
                            <Users style={{ width: 20, height: 20, color: '#71717a' }} />
                        </button>
                        <button
                            onClick={() => setShowHistory(true)}
                            className="flex items-center justify-center transition-all hover:bg-white/10"
                            style={{ width: 44, height: 44, borderRadius: 12 }}
                            title="Session History"
                        >
                            <History style={{ width: 20, height: 20, color: '#71717a' }} />
                        </button>
                        {/* <button
                            onClick={fetchTables}
                            disabled={isLoading}
                            className="flex items-center justify-center transition-all hover:bg-white/10 disabled:opacity-50"
                            style={{ width: 44, height: 44, borderRadius: 12 }}
                            title="Refresh"
                        >
                            <RefreshCw style={{ width: 20, height: 20, color: '#71717a' }} className={isLoading ? 'animate-spin' : ''} />
                        </button> */}
                        <button
                            onClick={() => setShowSettings(true)}
                            className="flex items-center justify-center transition-all hover:bg-white/10"
                            style={{ width: 44, height: 44, borderRadius: 12 }}
                            title="Settings"
                        >
                            <SettingsIcon style={{ width: 20, height: 20, color: '#71717a' }} />
                        </button>
                        <button
                            onClick={() => setShowAddTable(true)}
                            className="flex items-center justify-center font-semibold transition-all hover:brightness-110"
                            style={{
                                height: 44,
                                padding: '0 20px',
                                marginLeft: 8,
                                gap: 8,
                                fontSize: 14,
                                color: '#fff',
                                background: 'linear-gradient(180deg, #0ea5e9 0%, #0284c7 100%)',
                                borderRadius: 12,
                                boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)',
                            }}
                        >
                            <Plus style={{ width: 18, height: 18 }} />
                            <span className="hidden sm:inline">Add Table</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto" style={{ padding: '32px' }}>
                {/* Error Banner */}
                {error && (
                    <div
                        className="flex items-center justify-between"
                        style={{
                            marginBottom: 24,
                            padding: '16px 20px',
                            borderRadius: 14,
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}
                    >
                        <span style={{ fontSize: 14, color: '#ef4444' }}>{error}</span>
                        <button
                            onClick={() => setError(null)}
                            style={{ fontSize: 20, color: '#ef4444', padding: '0 8px' }}
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Tables Grid */}
                {tables.length === 0 ? (
                    <div className="text-center" style={{ padding: '80px 0' }}>
                        <div
                            className="flex items-center justify-center mx-auto"
                            style={{
                                width: 80,
                                height: 80,
                                borderRadius: 20,
                                backgroundColor: '#1c1c1e',
                                marginBottom: 24,
                            }}
                        >
                            <LayoutGrid style={{ width: 36, height: 36, color: '#3f3f46' }} />
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 600, color: '#fafafa', marginBottom: 10 }}>
                            No tables configured
                        </h2>
                        <p style={{ fontSize: 15, color: '#52525b', marginBottom: 28 }}>
                            Add your first pool table to start tracking sessions
                        </p>
                        <button
                            onClick={() => setShowAddTable(true)}
                            className="inline-flex items-center font-semibold transition-all hover:brightness-110"
                            style={{
                                height: 48,
                                padding: '0 24px',
                                gap: 10,
                                fontSize: 15,
                                color: '#fff',
                                background: 'linear-gradient(180deg, #0ea5e9 0%, #0284c7 100%)',
                                borderRadius: 14,
                                boxShadow: '0 4px 16px rgba(14, 165, 233, 0.3)',
                            }}
                        >
                            <Plus style={{ width: 20, height: 20 }} />
                            Add Table
                        </button>
                    </div>
                ) : (
                    <div
                        style={{
                            display: displayMode === 'list' ? 'flex' : 'grid',
                            flexDirection: displayMode === 'list' ? 'column' : undefined,
                            gap: displayMode === 'list' ? 12 : 20,
                            gridTemplateColumns: displayMode === 'list' ? undefined : 'repeat(auto-fill, minmax(280px, 1fr))',
                        }}
                    >
                        {tables.map((table) => (
                            <TableCard
                                key={table.id}
                                table={table}
                                onStartSession={handleStartSession}
                                onPauseSession={handlePauseSession}
                                onResumeSession={handleResumeSession}
                                onEndSession={handleEndSession}
                                onManagePlayers={setPlayerManagerTable}
                                layout={displayMode}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Modals */}
            <AddTableModal
                isOpen={showAddTable}
                onClose={() => setShowAddTable(false)}
                onAdd={handleAddTable}
                existingNumbers={tables.map(t => t.tableNumber)}
            />

            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                settings={settings}
                onSave={handleSaveSettings}
                tables={tables}
                onDeleteTable={handleDeleteTable}
                onEditTable={handleEditTable}
                displayMode={displayMode}
                onDisplayModeChange={(mode) => {
                    setDisplayMode(mode);
                    localStorage.setItem('displayMode', mode);
                }}
            />

            <SessionHistoryModal
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
            />

            {playerManagerTable && playerManagerTable.currentSession && (
                <PlayerManagerModal
                    isOpen={!!playerManagerTable}
                    onClose={() => setPlayerManagerTable(null)}
                    sessionId={playerManagerTable.currentSession.id}
                    tableName={playerManagerTable.name}
                    currentPlayers={playerManagerTable.currentSession.players || []}
                    onPlayerAdded={handlePlayerAdded}
                    onPlayerRemoved={handlePlayerRemoved}
                    onPlayerUpdated={handlePlayerUpdated}
                />
            )}

            <CheckoutModal
                isOpen={!!checkoutData}
                onClose={() => setCheckoutData(null)}
                onConfirm={handleCheckoutConfirm}
                table={checkoutData?.table || null}
                session={checkoutData?.session || null}
                finalCharge={checkoutData?.charge || 0}
            />

            <WaitlistPanel
                isOpen={showWaitlist}
                onClose={() => setShowWaitlist(false)}
            />

            <PaymentHistory
                isOpen={showPaymentHistory}
                onClose={() => setShowPaymentHistory(false)}
            />
        </div>
    );
}
