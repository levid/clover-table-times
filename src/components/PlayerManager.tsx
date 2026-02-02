'use client';

import { useState, useEffect } from 'react';
import { X, Plus, UserPlus, Search, Trash2, User, Pencil } from 'lucide-react';
import { Player } from '@/lib/store';

// Apple-inspired design tokens
const spacing = {
    modal: { paddingX: 32, paddingY: 28 },
    header: { paddingY: 24 },
    section: { gap: 28, labelGap: 14 },
    input: { height: 52, paddingX: 18, radius: 14 },
    button: { height: 52, radius: 14 },
    card: { padding: 18, radius: 14, gap: 16 },
};

interface PlayerManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
    tableName: string;
    currentPlayers: Player[];
    onPlayerAdded: (player: Player) => void;
    onPlayerRemoved: (playerId: string) => void;
    onPlayerUpdated: (player: Player) => void;
}

export function PlayerManagerModal({
    isOpen,
    onClose,
    sessionId,
    tableName,
    currentPlayers,
    onPlayerAdded,
    onPlayerRemoved,
    onPlayerUpdated,
}: PlayerManagerModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Player[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showNewPlayer, setShowNewPlayer] = useState(false);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerPhone, setNewPlayerPhone] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState('');
    const [editingPlayer, setEditingPlayer] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const searchPlayers = async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/players?search=${encodeURIComponent(searchQuery)}&limit=10`);
                if (res.ok) {
                    const players = await res.json();
                    const currentIds = new Set(currentPlayers.map(p => p.id));
                    setSearchResults(players.filter((p: Player) => !currentIds.has(p.id)));
                }
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(searchPlayers, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, currentPlayers]);

    const handleAddExistingPlayer = async (player: Player) => {
        setError('');
        setIsAdding(true);
        try {
            const res = await fetch(`/api/sessions/${sessionId}/players`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId: player.id }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to add player');
            }
            const added = await res.json();
            onPlayerAdded(added);
            setSearchQuery('');
            setSearchResults([]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add player');
        } finally {
            setIsAdding(false);
        }
    };

    const handleAddNewPlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPlayerName.trim()) return;

        setError('');
        setIsAdding(true);
        try {
            const res = await fetch(`/api/sessions/${sessionId}/players`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerName: newPlayerName.trim(),
                    phone: newPlayerPhone.trim() || undefined,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to add player');
            }
            const added = await res.json();
            onPlayerAdded(added);
            setNewPlayerName('');
            setNewPlayerPhone('');
            setShowNewPlayer(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add player');
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemovePlayer = async (playerId: string) => {
        try {
            const res = await fetch(`/api/sessions/${sessionId}/players?playerId=${playerId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                onPlayerRemoved(playerId);
            }
        } catch (err) {
            console.error('Failed to remove player:', err);
        }
    };

    const handleEditPlayer = async (playerId: string, newName: string) => {
        try {
            const res = await fetch(`/api/players/${playerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName }),
            });
            if (res.ok) {
                const updated = await res.json();
                onPlayerUpdated(updated);
            }
        } catch (err) {
            console.error('Failed to edit player:', err);
            setError('Failed to update player name');
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ padding: 24 }}
        >
            <div
                className="absolute inset-0 backdrop-blur-md"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
                onClick={onClose}
            />
            <div
                className="relative w-full flex flex-col overflow-hidden"
                style={{
                    maxWidth: 460,
                    maxHeight: '85vh',
                    backgroundColor: '#18181b',
                    borderRadius: 20,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
                }}
            >
                {/* Header */}
                <div
                    className="shrink-0"
                    style={{
                        padding: `${spacing.header.paddingY}px ${spacing.modal.paddingX}px`,
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h2
                                className="font-semibold tracking-tight"
                                style={{ fontSize: 22, color: '#fafafa' }}
                            >
                                Manage Players
                            </h2>
                            <p style={{ fontSize: 14, color: '#71717a', marginTop: 6 }}>{tableName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center transition-all hover:bg-white/10"
                            style={{ width: 36, height: 36, borderRadius: 10, marginRight: -6 }}
                        >
                            <X style={{ width: 20, height: 20, color: '#71717a' }} />
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div
                        style={{
                            margin: `20px ${spacing.modal.paddingX}px 0`,
                            padding: 16,
                            borderRadius: 12,
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            fontSize: 14,
                            color: '#ef4444',
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Current Players Section */}
                <div
                    className="shrink-0"
                    style={{
                        padding: `${spacing.modal.paddingY}px ${spacing.modal.paddingX}px`,
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                >
                    <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
                        <User style={{ width: 20, height: 20, color: '#0ea5e9' }} />
                        <h3 className="font-semibold" style={{ fontSize: 16, color: '#fafafa' }}>
                            Current Players ({currentPlayers.length})
                        </h3>
                    </div>
                    {currentPlayers.length === 0 ? (
                        <p style={{ fontSize: 14, color: '#52525b', padding: '8px 0' }}>No players on this table</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {currentPlayers.map((player) => (
                                <div
                                    key={player.id}
                                    style={{
                                        padding: spacing.card.padding,
                                        borderRadius: spacing.card.radius,
                                        backgroundColor: '#27272a',
                                    }}
                                >
                                    {editingPlayer?.id === player.id ? (
                                        // Edit mode - stacked layout for better fit
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="flex items-center justify-center font-semibold shrink-0"
                                                    style={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: 22,
                                                        fontSize: 16,
                                                        color: '#0ea5e9',
                                                        backgroundColor: 'rgba(14, 165, 233, 0.1)',
                                                    }}
                                                >
                                                    {editingPlayer.name.charAt(0).toUpperCase() || 'P'}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={editingPlayer.name}
                                                    onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                                                    autoFocus
                                                    style={{
                                                        flex: 1,
                                                        height: 40,
                                                        padding: '0 12px',
                                                        fontSize: 15,
                                                        color: '#fafafa',
                                                        backgroundColor: '#3f3f46',
                                                        border: '1px solid #52525b',
                                                        borderRadius: 10,
                                                        outline: 'none',
                                                    }}
                                                />
                                            </div>
                                            <div className="flex gap-2" style={{ marginLeft: 56 }}>
                                                <button
                                                    onClick={() => setEditingPlayer(null)}
                                                    className="font-medium transition-all hover:bg-zinc-600"
                                                    style={{
                                                        height: 36,
                                                        padding: '0 16px',
                                                        fontSize: 13,
                                                        color: '#a1a1aa',
                                                        backgroundColor: '#3f3f46',
                                                        borderRadius: 8,
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleEditPlayer(editingPlayer.id, editingPlayer.name);
                                                        setEditingPlayer(null);
                                                    }}
                                                    disabled={!editingPlayer.name.trim()}
                                                    className="font-medium transition-all hover:brightness-110"
                                                    style={{
                                                        height: 36,
                                                        padding: '0 16px',
                                                        fontSize: 13,
                                                        color: '#fff',
                                                        backgroundColor: '#0ea5e9',
                                                        borderRadius: 8,
                                                        opacity: !editingPlayer.name.trim() ? 0.5 : 1,
                                                    }}
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // View mode
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center" style={{ gap: spacing.card.gap }}>
                                                <div
                                                    className="flex items-center justify-center font-semibold"
                                                    style={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: 22,
                                                        fontSize: 16,
                                                        color: '#a1a1aa',
                                                        backgroundColor: '#3f3f46',
                                                    }}
                                                >
                                                    {player.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium" style={{ fontSize: 15, color: '#fafafa' }}>{player.name}</p>
                                                    {player.phone && <p style={{ fontSize: 14, color: '#71717a', marginTop: 2 }}>{player.phone}</p>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setEditingPlayer({ id: player.id, name: player.name })}
                                                    className="flex items-center justify-center transition-all hover:bg-sky-500/10"
                                                    style={{ width: 40, height: 40, borderRadius: 10 }}
                                                    title="Edit player"
                                                >
                                                    <Pencil style={{ width: 18, height: 18, color: '#71717a' }} />
                                                </button>
                                                <button
                                                    onClick={() => handleRemovePlayer(player.id)}
                                                    className="flex items-center justify-center transition-all hover:bg-red-500/10"
                                                    style={{ width: 40, height: 40, borderRadius: 10 }}
                                                    title="Remove player"
                                                >
                                                    <Trash2 style={{ width: 18, height: 18, color: '#71717a' }} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Players Section */}
                <div
                    className="flex-1 overflow-y-auto"
                    style={{ padding: `${spacing.modal.paddingY}px ${spacing.modal.paddingX}px` }}
                >
                    {!showNewPlayer ? (
                        <>
                            {/* Search existing players */}
                            <div style={{ marginBottom: spacing.section.gap }}>
                                <label
                                    className="block font-medium"
                                    style={{ fontSize: 14, color: '#a1a1aa', marginBottom: spacing.section.labelGap }}
                                >
                                    Add Existing Player
                                </label>
                                <div className="relative">
                                    <Search
                                        style={{
                                            position: 'absolute',
                                            left: 18,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            width: 20,
                                            height: 20,
                                            color: '#52525b'
                                        }}
                                    />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by name or phone..."
                                        style={{
                                            width: '100%',
                                            height: spacing.input.height,
                                            paddingLeft: 50,
                                            paddingRight: spacing.input.paddingX,
                                            fontSize: 16,
                                            color: '#fafafa',
                                            backgroundColor: '#27272a',
                                            border: '1px solid #3f3f46',
                                            borderRadius: spacing.input.radius,
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Search Results */}
                            {isSearching && (
                                <p style={{ fontSize: 14, color: '#52525b', marginBottom: 16 }}>Searching...</p>
                            )}

                            {searchResults.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: spacing.section.gap }}>
                                    {searchResults.map((player) => (
                                        <button
                                            key={player.id}
                                            onClick={() => handleAddExistingPlayer(player)}
                                            disabled={isAdding}
                                            className="flex items-center text-left transition-all hover:bg-zinc-700/50"
                                            style={{
                                                padding: spacing.card.padding,
                                                borderRadius: spacing.card.radius,
                                                backgroundColor: '#27272a',
                                                opacity: isAdding ? 0.5 : 1,
                                            }}
                                        >
                                            <div className="flex items-center flex-1" style={{ gap: spacing.card.gap }}>
                                                <div
                                                    className="flex items-center justify-center font-semibold"
                                                    style={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: 22,
                                                        fontSize: 16,
                                                        color: '#a1a1aa',
                                                        backgroundColor: '#3f3f46',
                                                    }}
                                                >
                                                    {player.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium" style={{ fontSize: 15, color: '#fafafa' }}>{player.name}</p>
                                                    {player.phone && <p style={{ fontSize: 14, color: '#71717a', marginTop: 2 }}>{player.phone}</p>}
                                                </div>
                                            </div>
                                            <Plus style={{ width: 22, height: 22, color: '#0ea5e9' }} />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Create new player button */}
                            <button
                                onClick={() => setShowNewPlayer(true)}
                                className="w-full flex items-center justify-center gap-3 font-medium transition-all hover:bg-sky-500/10"
                                style={{
                                    height: spacing.button.height,
                                    fontSize: 15,
                                    color: '#0ea5e9',
                                    border: '1px dashed #3f3f46',
                                    borderRadius: spacing.button.radius,
                                }}
                            >
                                <UserPlus style={{ width: 20, height: 20 }} />
                                Create New Player
                            </button>
                        </>
                    ) : (
                        /* New Player Form */
                        <form onSubmit={handleAddNewPlayer}>
                            <h3 className="font-semibold" style={{ fontSize: 16, color: '#fafafa', marginBottom: 24 }}>
                                New Player
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div>
                                    <label
                                        className="block font-medium"
                                        style={{ fontSize: 14, color: '#a1a1aa', marginBottom: spacing.section.labelGap }}
                                    >
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newPlayerName}
                                        onChange={(e) => setNewPlayerName(e.target.value)}
                                        placeholder="Player name"
                                        autoFocus
                                        style={{
                                            width: '100%',
                                            height: spacing.input.height,
                                            padding: `0 ${spacing.input.paddingX}px`,
                                            fontSize: 16,
                                            color: '#fafafa',
                                            backgroundColor: '#27272a',
                                            border: '1px solid #3f3f46',
                                            borderRadius: spacing.input.radius,
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label
                                        className="block font-medium"
                                        style={{ fontSize: 14, color: '#a1a1aa', marginBottom: spacing.section.labelGap }}
                                    >
                                        Phone <span style={{ color: '#52525b' }}>(optional)</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={newPlayerPhone}
                                        onChange={(e) => setNewPlayerPhone(e.target.value)}
                                        placeholder="555-123-4567"
                                        style={{
                                            width: '100%',
                                            height: spacing.input.height,
                                            padding: `0 ${spacing.input.paddingX}px`,
                                            fontSize: 16,
                                            color: '#fafafa',
                                            backgroundColor: '#27272a',
                                            border: '1px solid #3f3f46',
                                            borderRadius: spacing.input.radius,
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4" style={{ marginTop: 32 }}>
                                <button
                                    type="button"
                                    onClick={() => setShowNewPlayer(false)}
                                    className="flex-1 font-semibold transition-all hover:bg-zinc-600"
                                    style={{
                                        height: spacing.button.height,
                                        fontSize: 16,
                                        color: '#fff',
                                        backgroundColor: '#3f3f46',
                                        borderRadius: spacing.button.radius,
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newPlayerName.trim() || isAdding}
                                    className="flex-1 flex items-center justify-center gap-2 font-semibold transition-all hover:brightness-110"
                                    style={{
                                        height: spacing.button.height,
                                        fontSize: 16,
                                        color: '#fff',
                                        backgroundColor: '#0ea5e9',
                                        borderRadius: spacing.button.radius,
                                        opacity: !newPlayerName.trim() || isAdding ? 0.5 : 1,
                                    }}
                                >
                                    <Plus style={{ width: 20, height: 20 }} />
                                    {isAdding ? 'Adding...' : 'Add Player'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div
                    className="shrink-0"
                    style={{
                        padding: `${spacing.header.paddingY}px ${spacing.modal.paddingX}px`,
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                >
                    <button
                        onClick={onClose}
                        className="w-full font-semibold transition-all hover:bg-zinc-600"
                        style={{
                            height: spacing.button.height,
                            fontSize: 16,
                            color: '#fff',
                            backgroundColor: '#3f3f46',
                            borderRadius: spacing.button.radius,
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
