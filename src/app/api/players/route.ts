import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/players
 * List all players with optional search
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get('search');
        const limit = parseInt(searchParams.get('limit') || '50');

        const where = search
            ? {
                OR: [
                    { name: { contains: search } },
                    { phone: { contains: search } },
                    { email: { contains: search } },
                ],
            }
            : {};

        const players = await prisma.player.findMany({
            where,
            orderBy: { name: 'asc' },
            take: limit,
            include: {
                sessionPlayers: {
                    where: {
                        session: {
                            status: { in: ['ACTIVE', 'PAUSED'] },
                        },
                    },
                    include: {
                        session: {
                            include: {
                                table: true,
                            },
                        },
                    },
                },
            },
        });

        // Transform to include current session info
        const playersWithStatus = players.map((player: (typeof players)[number]) => ({
            ...player,
            currentSession: player.sessionPlayers[0]?.session || null,
            sessionPlayers: undefined,
        }));

        return NextResponse.json(playersWithStatus);
    } catch (error) {
        console.error('Failed to fetch players:', error);
        return NextResponse.json(
            { error: 'Failed to fetch players' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/players
 * Create a new player
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, phone, email, notes } = body;

        if (!name || !name.trim()) {
            return NextResponse.json(
                { error: 'Player name is required' },
                { status: 400 }
            );
        }

        const player = await prisma.player.create({
            data: {
                name: name.trim(),
                phone: phone?.trim() || null,
                email: email?.trim() || null,
                notes: notes?.trim() || null,
            },
        });

        return NextResponse.json(player, { status: 201 });
    } catch (error) {
        console.error('Failed to create player:', error);
        return NextResponse.json(
            { error: 'Failed to create player' },
            { status: 500 }
        );
    }
}
