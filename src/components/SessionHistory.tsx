'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Calendar, History } from 'lucide-react';
import { formatCurrency, formatDuration } from '@/lib/pricing';

interface SessionRecord {
    id: string;
    tableId: string;
    startTime: string;
    endTime: string;
    totalMinutes: number;
    totalCharge: number;
    status: string;
    table: { name: string; tableNumber: number };
}

interface SessionHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SessionHistoryModal({ isOpen, onClose }: SessionHistoryModalProps) {
    const [sessions, setSessions] = useState<SessionRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filter, setFilter] = useState<'today' | 'week' | 'all'>('today');

    useEffect(() => {
        if (isOpen) fetchSessions();
    }, [isOpen, filter]);

    const fetchSessions = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/sessions?status=COMPLETED&limit=100`);
            if (res.ok) {
                const data = await res.json();
                const now = new Date();
                const filtered = data.filter((s: SessionRecord) => {
                    const sessionDate = new Date(s.endTime);
                    if (filter === 'today') return sessionDate.toDateString() === now.toDateString();
                    if (filter === 'week') return sessionDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return true;
                });
                setSessions(filtered);
            }
        } catch (err) { console.error('Failed to fetch sessions:', err); }
        finally { setIsLoading(false); }
    };

    const totalRevenue = sessions.reduce((sum, s) => sum + (s.totalCharge || 0), 0);
    const totalTime = sessions.reduce((sum, s) => sum + (s.totalMinutes || 0), 0);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ padding: 24 }}>
            <div className="absolute inset-0 backdrop-blur-md" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }} onClick={onClose} />
            <div className="relative w-full flex flex-col" style={{ maxWidth: 560, maxHeight: '85vh', backgroundColor: '#18181b', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 64px -16px rgba(0,0,0,0.6)' }}>
                <div className="shrink-0" style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <History style={{ width: 22, height: 22, color: '#0ea5e9' }} />
                            <h2 className="font-semibold" style={{ fontSize: 22, color: '#fafafa' }}>Session History</h2>
                        </div>
                        <button onClick={onClose} className="hover:bg-white/10" style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X style={{ width: 20, height: 20, color: '#71717a' }} />
                        </button>
                    </div>
                </div>
                <div className="shrink-0 flex gap-3" style={{ padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {(['today', 'week', 'all'] as const).map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className="font-medium" style={{ padding: '12px 20px', fontSize: 14, borderRadius: 10, color: filter === f ? '#fff' : '#71717a', backgroundColor: filter === f ? '#0ea5e9' : '#27272a' }}>
                            {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'All Time'}
                        </button>
                    ))}
                </div>
                <div className="shrink-0 grid grid-cols-3 gap-6" style={{ padding: '28px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-center">
                        <p className="font-semibold" style={{ fontSize: 32, color: '#fafafa' }}>{sessions.length}</p>
                        <p style={{ fontSize: 14, color: '#71717a', marginTop: 8 }}>Sessions</p>
                    </div>
                    <div className="text-center">
                        <p className="font-semibold" style={{ fontSize: 32, color: '#0ea5e9' }}>{formatCurrency(totalRevenue)}</p>
                        <p style={{ fontSize: 14, color: '#71717a', marginTop: 8 }}>Revenue</p>
                    </div>
                    <div className="text-center">
                        <p className="font-semibold" style={{ fontSize: 32, color: '#fafafa' }}>{Math.floor(totalTime / 60)}h {Math.round(totalTime % 60)}m</p>
                        <p style={{ fontSize: 14, color: '#71717a', marginTop: 8 }}>Total Time</p>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto" style={{ padding: '28px 32px' }}>
                    {isLoading ? (
                        <div className="text-center" style={{ padding: 48, color: '#52525b' }}>Loading...</div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center" style={{ padding: 48, color: '#52525b' }}>No completed sessions</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {sessions.map((session) => (
                                <div key={session.id} className="flex items-center justify-between" style={{ padding: 18, borderRadius: 14, backgroundColor: '#27272a' }}>
                                    <div className="flex items-center gap-4">
                                        <div style={{ width: 48, height: 48, borderRadius: 12, fontSize: 15, color: '#a1a1aa', backgroundColor: '#3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>#{session.table.tableNumber}</div>
                                        <div>
                                            <p className="font-medium" style={{ fontSize: 15, color: '#fafafa' }}>{session.table.name}</p>
                                            <div className="flex items-center gap-4" style={{ marginTop: 4 }}>
                                                <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: '#71717a' }}><Calendar style={{ width: 14, height: 14 }} />{new Date(session.endTime).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: '#71717a' }}><Clock style={{ width: 14, height: 14 }} />{formatDuration(Math.round((session.totalMinutes || 0) * 60))}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold" style={{ fontSize: 15, color: '#0ea5e9' }}>{formatCurrency(session.totalCharge || 0)}</p>
                                        <p style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>{new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
