import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/tables - List all tables with current sessions and players
export async function GET() {
    try {
        const tables = await prisma.table.findMany({
            include: {
                sessions: {
                    where: {
                        status: {
                            in: ['ACTIVE', 'PAUSED'],
                        },
                    },
                    include: {
                        players: {
                            where: {
                                leftAt: null,
                            },
                            include: {
                                player: true,
                            },
                            orderBy: {
                                joinedAt: 'asc',
                            },
                        },
                    },
                    orderBy: {
                        startTime: 'desc',
                    },
                    take: 1,
                },
            },
            orderBy: {
                tableNumber: 'asc',
            },
        });

        // Transform to include currentSession with players
        const tablesWithSession = tables.map((table) => {
            const session = table.sessions[0];
            return {
                id: table.id,
                name: table.name,
                tableNumber: table.tableNumber,
                status: table.status,
                hourlyRate: table.hourlyRate,
                timeLimitMinutes: table.timeLimitMinutes,
                currentSession: session
                    ? {
                        id: session.id,
                        tableId: session.tableId,
                        startTime: session.startTime.toISOString(),
                        endTime: session.endTime?.toISOString(),
                        pausedAt: session.pausedAt?.toISOString(),
                        totalPausedMs: session.totalPausedMs,
                        totalMinutes: session.totalMinutes,
                        totalCharge: session.totalCharge,
                        status: session.status,
                        notes: session.notes,
                        players: session.players.map((sp) => ({
                            id: sp.player.id,
                            name: sp.player.name,
                            phone: sp.player.phone,
                            email: sp.player.email,
                            joinedAt: sp.joinedAt.toISOString(),
                        })),
                    }
                    : null,
            };
        });

        return NextResponse.json(tablesWithSession);
    } catch (error) {
        console.error('Error fetching tables:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tables' },
            { status: 500 }
        );
    }
}

// POST /api/tables - Create a new table
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, tableNumber, hourlyRate, timeLimitMinutes } = body;

        if (!name || tableNumber === undefined) {
            return NextResponse.json(
                { error: 'Name and table number are required' },
                { status: 400 }
            );
        }

        // Check if table number already exists
        const existing = await prisma.table.findUnique({
            where: { tableNumber },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Table number already exists' },
                { status: 400 }
            );
        }

        const table = await prisma.table.create({
            data: {
                name,
                tableNumber,
                hourlyRate: hourlyRate || 15.00,
                timeLimitMinutes: timeLimitMinutes || null,
            },
        });

        return NextResponse.json(table, { status: 201 });
    } catch (error) {
        console.error('Error creating table:', error);
        return NextResponse.json(
            { error: 'Failed to create table' },
            { status: 500 }
        );
    }
}
