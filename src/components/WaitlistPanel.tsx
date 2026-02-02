'use client';

import { useState, useEffect } from 'react';
import { Users, X, Clock, Check, Phone, UserPlus, MoreHorizontal } from 'lucide-react';
import { WaitlistEntry } from '@/lib/store';

interface WaitlistPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WaitlistPanel({ isOpen, onClose }: WaitlistPanelProps) {
    const [entries, setEntries] = useState<WaitlistEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEntry, setNewEntry] = useState({ name: '', partySize: '1', phone: '', notes: '' });
    const [actionMenu, setActionMenu] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchWaitlist();
        }
    }, [isOpen]);

    const fetchWaitlist = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/waitlist');
            if (res.ok) {
                const data = await res.json();
                setEntries(data);
            }
        } catch (error) {
            console.error('Failed to fetch waitlist:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddEntry = async () => {
        if (!newEntry.name.trim()) return;

        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newEntry.name,
                    partySize: parseInt(newEntry.partySize) || 1,
                    phone: newEntry.phone || null,
                    notes: newEntry.notes || null,
                }),
            });

            if (res.ok) {
                await fetchWaitlist();
                setNewEntry({ name: '', partySize: '1', phone: '', notes: '' });
                setShowAddForm(false);
            }
        } catch (error) {
            console.error('Failed to add to waitlist:', error);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await fetch(`/api/waitlist/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            await fetchWaitlist();
            setActionMenu(null);
        } catch (error) {
            console.error('Failed to update entry:', error);
        }
    };

    const handleRemove = async (id: string) => {
        try {
            await fetch(`/api/waitlist/${id}`, { method: 'DELETE' });
            await fetchWaitlist();
        } catch (error) {
            console.error('Failed to remove entry:', error);
        }
    };

    const getWaitTime = (createdAt: string) => {
        const created = new Date(createdAt);
        const now = new Date();
        const diffMs = now.getTime() - created.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `${diffMins}m`;
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}h ${mins}m`;
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
                style={{
                    background: 'linear-gradient(180deg, #1c1c1e 0%, #141416 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 20,
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between"
                    style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                >
                    <div className="flex items-center gap-3">
                        <Users style={{ width: 20, height: 20, color: '#0ea5e9' }} />
                        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fafafa' }}>
                            Waiting List
                        </h2>
                        {entries.length > 0 && (
                            <span
                                style={{
                                    padding: '2px 8px',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: '#0ea5e9',
                                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                                    borderRadius: 10,
                                }}
                            >
                                {entries.length}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center transition-colors hover:bg-white/10"
                        style={{ width: 36, height: 36, borderRadius: 10 }}
                    >
                        <X style={{ width: 20, height: 20, color: '#71717a' }} />
                    </button>
                </div>

                {/* Add Button */}
                <div style={{ padding: '16px 24px' }}>
                    {!showAddForm ? (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full flex items-center justify-center gap-2 transition-all hover:brightness-110"
                            style={{
                                height: 44,
                                borderRadius: 12,
                                fontSize: 14,
                                fontWeight: 500,
                                color: '#fff',
                                backgroundColor: '#0ea5e9',
                            }}
                        >
                            <UserPlus style={{ width: 18, height: 18 }} />
                            Add to Waitlist
                        </button>
                    ) : (
                        <div
                            style={{
                                padding: 16,
                                borderRadius: 14,
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                        >
                            <div className="flex flex-col gap-3">
                                <input
                                    type="text"
                                    placeholder="Name"
                                    value={newEntry.name}
                                    onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
                                    autoFocus
                                    style={{
                                        height: 44,
                                        padding: '0 14px',
                                        fontSize: 15,
                                        color: '#fafafa',
                                        backgroundColor: '#3f3f46',
                                        border: '1px solid #52525b',
                                        borderRadius: 10,
                                        outline: 'none',
                                    }}
                                />
                                <div className="flex gap-3">
                                    <input
                                        type="number"
                                        placeholder="Party size"
                                        value={newEntry.partySize}
                                        onChange={(e) => setNewEntry({ ...newEntry, partySize: e.target.value })}
                                        style={{
                                            width: 100,
                                            height: 44,
                                            padding: '0 14px',
                                            fontSize: 15,
                                            color: '#fafafa',
                                            backgroundColor: '#3f3f46',
                                            border: '1px solid #52525b',
                                            borderRadius: 10,
                                            outline: 'none',
                                        }}
                                    />
                                    <input
                                        type="tel"
                                        placeholder="Phone (optional)"
                                        value={newEntry.phone}
                                        onChange={(e) => setNewEntry({ ...newEntry, phone: e.target.value })}
                                        style={{
                                            flex: 1,
                                            height: 44,
                                            padding: '0 14px',
                                            fontSize: 15,
                                            color: '#fafafa',
                                            backgroundColor: '#3f3f46',
                                            border: '1px solid #52525b',
                                            borderRadius: 10,
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                                <div className="flex gap-2 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddForm(false)}
                                        className="flex-1 transition-colors hover:bg-zinc-600"
                                        style={{
                                            height: 40,
                                            fontSize: 14,
                                            fontWeight: 500,
                                            color: '#a1a1aa',
                                            backgroundColor: '#3f3f46',
                                            borderRadius: 10,
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAddEntry}
                                        disabled={!newEntry.name.trim()}
                                        className="flex-1 transition-all hover:brightness-110 disabled:opacity-50"
                                        style={{
                                            height: 40,
                                            fontSize: 14,
                                            fontWeight: 500,
                                            color: '#fff',
                                            backgroundColor: '#0ea5e9',
                                            borderRadius: 10,
                                        }}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Waitlist Entries */}
                <div
                    className="flex-1 overflow-y-auto"
                    style={{
                        padding: '0 24px 24px',
                    }}
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="text-center py-12" style={{ color: '#52525b' }}>
                            <Users style={{ width: 48, height: 48, margin: '0 auto 12px', opacity: 0.5 }} />
                            <p style={{ fontSize: 14 }}>No one on the waitlist</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {entries.map((entry, index) => (
                                <div
                                    key={entry.id}
                                    style={{
                                        padding: 16,
                                        borderRadius: 14,
                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                        border: entry.status === 'NOTIFIED'
                                            ? '1px solid rgba(14, 165, 233, 0.3)'
                                            : '1px solid rgba(255, 255, 255, 0.08)',
                                    }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex items-center justify-center font-semibold"
                                                style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: 10,
                                                    fontSize: 14,
                                                    color: '#0ea5e9',
                                                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                                                }}
                                            >
                                                #{index + 1}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span style={{ fontSize: 15, fontWeight: 600, color: '#fafafa' }}>
                                                        {entry.name}
                                                    </span>
                                                    {entry.status === 'NOTIFIED' && (
                                                        <span
                                                            style={{
                                                                padding: '2px 6px',
                                                                fontSize: 10,
                                                                fontWeight: 500,
                                                                color: '#0ea5e9',
                                                                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                                                                borderRadius: 6,
                                                            }}
                                                        >
                                                            NOTIFIED
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3" style={{ marginTop: 4 }}>
                                                    <span style={{ fontSize: 13, color: '#71717a' }}>
                                                        Party of {entry.partySize}
                                                    </span>
                                                    <span className="flex items-center gap-1" style={{ fontSize: 12, color: '#52525b' }}>
                                                        <Clock style={{ width: 12, height: 12 }} />
                                                        {getWaitTime(entry.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={() => setActionMenu(actionMenu === entry.id ? null : entry.id)}
                                                className="flex items-center justify-center transition-colors hover:bg-white/10 active:bg-white/20"
                                                style={{ width: 44, height: 44, borderRadius: 10 }}
                                            >
                                                <MoreHorizontal style={{ width: 22, height: 22, color: '#71717a' }} />
                                            </button>


                                            {actionMenu === entry.id && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-[99]"
                                                        onClick={() => setActionMenu(null)}
                                                    />
                                                    <div
                                                        className="fixed z-[100]"
                                                        style={{
                                                            top: '50%',
                                                            left: '50%',
                                                            transform: 'translate(-50%, -50%)',
                                                            minWidth: 220,
                                                            padding: 8,
                                                            borderRadius: 16,
                                                            backgroundColor: '#27272a',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
                                                        }}
                                                    >
                                                        {entry.phone && (
                                                            <a
                                                                href={`tel:${entry.phone}`}
                                                                className="flex items-center gap-3 transition-colors hover:bg-white/5 active:bg-white/10"
                                                                style={{
                                                                    padding: '14px 16px',
                                                                    borderRadius: 10,
                                                                    fontSize: 15,
                                                                    color: '#fafafa',
                                                                    textDecoration: 'none',
                                                                }}
                                                            >
                                                                <Phone style={{ width: 20, height: 20, color: '#71717a' }} />
                                                                Call
                                                            </a>
                                                        )}
                                                        {entry.status === 'WAITING' && (
                                                            <button
                                                                onClick={() => handleUpdateStatus(entry.id, 'NOTIFIED')}
                                                                className="w-full flex items-center gap-3 transition-colors hover:bg-white/5 active:bg-white/10"
                                                                style={{
                                                                    padding: '14px 16px',
                                                                    borderRadius: 10,
                                                                    fontSize: 15,
                                                                    color: '#0ea5e9',
                                                                    textAlign: 'left',
                                                                }}
                                                            >
                                                                <Phone style={{ width: 20, height: 20 }} />
                                                                Mark Notified
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleUpdateStatus(entry.id, 'SEATED')}
                                                            className="w-full flex items-center gap-3 transition-colors hover:bg-white/5 active:bg-white/10"
                                                            style={{
                                                                padding: '14px 16px',
                                                                borderRadius: 10,
                                                                fontSize: 15,
                                                                color: '#22c55e',
                                                                textAlign: 'left',
                                                            }}
                                                        >
                                                            <Check style={{ width: 20, height: 20 }} />
                                                            Seat Now
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(entry.id, 'NO_SHOW')}
                                                            className="w-full flex items-center gap-3 transition-colors hover:bg-white/5 active:bg-white/10"
                                                            style={{
                                                                padding: '14px 16px',
                                                                borderRadius: 10,
                                                                fontSize: 15,
                                                                color: '#f59e0b',
                                                                textAlign: 'left',
                                                            }}
                                                        >
                                                            <X style={{ width: 20, height: 20 }} />
                                                            No Show
                                                        </button>
                                                        <div style={{ height: 1, margin: '8px 0', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
                                                        <button
                                                            onClick={() => handleRemove(entry.id)}
                                                            className="w-full flex items-center gap-3 transition-colors hover:bg-white/5 active:bg-white/10"
                                                            style={{
                                                                padding: '14px 16px',
                                                                borderRadius: 10,
                                                                fontSize: 15,
                                                                color: '#ef4444',
                                                                textAlign: 'left',
                                                            }}
                                                        >
                                                            <X style={{ width: 20, height: 20 }} />
                                                            Remove
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
