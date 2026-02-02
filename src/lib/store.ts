import { create } from 'zustand';

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
export type SessionStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface Player {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
    joinedAt?: string;
    leftAt?: string;
}

export interface Table {
    id: string;
    name: string;
    tableNumber: number;
    status: TableStatus;
    hourlyRate: number;
    timeLimitMinutes?: number;
    currentSession?: Session;
}

export interface Session {
    id: string;
    tableId: string;
    startTime: string;
    endTime?: string;
    pausedAt?: string;
    totalPausedMs: number;
    totalMinutes?: number;
    totalCharge?: number;
    status: SessionStatus;
    notes?: string;
    players?: Player[];
}

export type WaitlistStatus = 'WAITING' | 'NOTIFIED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';

export interface WaitlistEntry {
    id: string;
    name: string;
    partySize: number;
    phone?: string;
    notes?: string;
    status: WaitlistStatus;
    createdAt: string;
    seatedAt?: string;
    cancelledAt?: string;
}

export interface Settings {
    id?: string;
    venueName: string;
    defaultHourlyRate: number;
    minimumCharge: number;
    gracePeriodMinutes: number;
    billingIncrement: 'MINUTE' | 'QUARTER_HOUR' | 'HALF_HOUR' | 'HOUR';
    displayMode: 'grid' | 'list';
}

interface TableStore {
    tables: Table[];
    players: Player[];
    settings: Settings;
    isLoading: boolean;
    error: string | null;
    selectedTable: Table | null;

    // Actions
    setTables: (tables: Table[]) => void;
    setPlayers: (players: Player[]) => void;
    setSettings: (settings: Settings) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setSelectedTable: (table: Table | null) => void;

    // Table operations
    updateTable: (id: string, updates: Partial<Table>) => void;
    addTable: (table: Table) => void;
    removeTable: (id: string) => void;

    // Session operations
    startSession: (tableId: string, session: Session) => void;
    updateSession: (tableId: string, updates: Partial<Session>) => void;
    endSession: (tableId: string) => void;

    // Player operations
    addPlayer: (player: Player) => void;
    updatePlayer: (id: string, updates: Partial<Player>) => void;
    removePlayer: (id: string) => void;
    addPlayerToSession: (tableId: string, player: Player) => void;
    removePlayerFromSession: (tableId: string, playerId: string) => void;
}

export const useTableStore = create<TableStore>((set) => ({
    tables: [],
    players: [],
    settings: {
        venueName: 'Fat Cats',
        defaultHourlyRate: 15.00,
        minimumCharge: 5.00,
        gracePeriodMinutes: 0,
        billingIncrement: 'MINUTE',
        displayMode: 'grid',
    },
    isLoading: false,
    error: null,
    selectedTable: null,

    setTables: (tables) => set({ tables }),
    setPlayers: (players) => set({ players }),
    setSettings: (settings) => set({ settings }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    setSelectedTable: (selectedTable) => set({ selectedTable }),

    updateTable: (id, updates) =>
        set((state) => ({
            tables: state.tables.map((table) =>
                table.id === id ? { ...table, ...updates } : table
            ),
        })),

    addTable: (table) =>
        set((state) => ({
            tables: [...state.tables, table],
        })),

    removeTable: (id) =>
        set((state) => ({
            tables: state.tables.filter((table) => table.id !== id),
        })),

    startSession: (tableId, session) =>
        set((state) => ({
            tables: state.tables.map((table) =>
                table.id === tableId
                    ? { ...table, status: 'OCCUPIED' as TableStatus, currentSession: session }
                    : table
            ),
        })),

    updateSession: (tableId, updates) =>
        set((state) => ({
            tables: state.tables.map((table) =>
                table.id === tableId && table.currentSession
                    ? {
                        ...table,
                        currentSession: { ...table.currentSession, ...updates },
                    }
                    : table
            ),
        })),

    endSession: (tableId) =>
        set((state) => ({
            tables: state.tables.map((table) =>
                table.id === tableId
                    ? { ...table, status: 'AVAILABLE' as TableStatus, currentSession: undefined }
                    : table
            ),
        })),

    addPlayer: (player) =>
        set((state) => ({
            players: [...state.players, player],
        })),

    updatePlayer: (id, updates) =>
        set((state) => ({
            players: state.players.map((p) =>
                p.id === id ? { ...p, ...updates } : p
            ),
        })),

    removePlayer: (id) =>
        set((state) => ({
            players: state.players.filter((p) => p.id !== id),
        })),

    addPlayerToSession: (tableId, player) =>
        set((state) => ({
            tables: state.tables.map((table) =>
                table.id === tableId && table.currentSession
                    ? {
                        ...table,
                        currentSession: {
                            ...table.currentSession,
                            players: [...(table.currentSession.players || []), player],
                        },
                    }
                    : table
            ),
        })),

    removePlayerFromSession: (tableId, playerId) =>
        set((state) => ({
            tables: state.tables.map((table) =>
                table.id === tableId && table.currentSession
                    ? {
                        ...table,
                        currentSession: {
                            ...table.currentSession,
                            players: (table.currentSession.players || []).filter(
                                (p) => p.id !== playerId
                            ),
                        },
                    }
                    : table
            ),
        })),
}));
