import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/sessions/[id]/players
 * Get all players in a session
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const sessionPlayers = await prisma.sessionPlayer.findMany({
            where: { sessionId: id },
            include: {
                player: true,
            },
            orderBy: {
                joinedAt: 'asc',
            },
        });

        return NextResponse.json(sessionPlayers.map(sp => ({
            ...sp.player,
            joinedAt: sp.joinedAt,
            leftAt: sp.leftAt,
        })));
    } catch (error) {
        console.error('Failed to fetch session players:', error);
        return NextResponse.json(
            { error: 'Failed to fetch session players' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/sessions/[id]/players
 * Add a player to a session (existing or new player)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { playerId, playerName, phone, email } = body;

        // Check session exists and is active
        const session = await prisma.session.findUnique({
            where: { id },
        });

        if (!session) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            );
        }

        if (!['ACTIVE', 'PAUSED'].includes(session.status)) {
            return NextResponse.json(
                { error: 'Cannot add players to a completed session' },
                { status: 400 }
            );
        }

        let player;

        if (playerId) {
            // Add existing player
            player = await prisma.player.findUnique({
                where: { id: playerId },
            });

            if (!player) {
                return NextResponse.json(
                    { error: 'Player not found' },
                    { status: 404 }
                );
            }
        } else if (playerName) {
            // Create new player and add
            player = await prisma.player.create({
                data: {
                    name: playerName.trim(),
                    phone: phone?.trim() || null,
                    email: email?.trim() || null,
                },
            });
        } else {
            return NextResponse.json(
                { error: 'Either playerId or playerName is required' },
                { status: 400 }
            );
        }

        // Check if player is already in this session
        const existing = await prisma.sessionPlayer.findUnique({
            where: {
                sessionId_playerId: {
                    sessionId: id,
                    playerId: player.id,
                },
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Player is already in this session' },
                { status: 400 }
            );
        }

        // Check if player is in another active session
        const inOtherSession = await prisma.sessionPlayer.findFirst({
            where: {
                playerId: player.id,
                leftAt: null,
                session: {
                    status: { in: ['ACTIVE', 'PAUSED'] },
                    id: { not: id },
                },
            },
            include: {
                session: {
                    include: { table: true },
                },
            },
        });

        if (inOtherSession) {
            return NextResponse.json(
                { error: `Player is already on ${inOtherSession.session.table.name}` },
                { status: 400 }
            );
        }

        // Add player to session
        const sessionPlayer = await prisma.sessionPlayer.create({
            data: {
                sessionId: id,
                playerId: player.id,
            },
            include: {
                player: true,
            },
        });

        return NextResponse.json({
            ...sessionPlayer.player,
            joinedAt: sessionPlayer.joinedAt,
        }, { status: 201 });
    } catch (error) {
        console.error('Failed to add player to session:', error);
        return NextResponse.json(
            { error: 'Failed to add player' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/sessions/[id]/players
 * Remove a player from a session
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const searchParams = request.nextUrl.searchParams;
        const playerId = searchParams.get('playerId');

        if (!playerId) {
            return NextResponse.json(
                { error: 'playerId is required' },
                { status: 400 }
            );
        }

        const sessionPlayer = await prisma.sessionPlayer.findUnique({
            where: {
                sessionId_playerId: {
                    sessionId: id,
                    playerId,
                },
            },
        });

        if (!sessionPlayer) {
            return NextResponse.json(
                { error: 'Player not in this session' },
                { status: 404 }
            );
        }

        // Mark as left (or delete entirely)
        await prisma.sessionPlayer.update({
            where: {
                sessionId_playerId: {
                    sessionId: id,
                    playerId,
                },
            },
            data: {
                leftAt: new Date(),
            },
        });

        return NextResponse.json({ removed: true });
    } catch (error) {
        console.error('Failed to remove player:', error);
        return NextResponse.json(
            { error: 'Failed to remove player' },
            { status: 500 }
        );
    }
}
