import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/players/[id]
 * Get a single player
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const player = await prisma.player.findUnique({
            where: { id },
            include: {
                sessionPlayers: {
                    include: {
                        session: {
                            include: {
                                table: true,
                            },
                        },
                    },
                    orderBy: {
                        joinedAt: 'desc',
                    },
                    take: 10,
                },
            },
        });

        if (!player) {
            return NextResponse.json(
                { error: 'Player not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(player);
    } catch (error) {
        console.error('Failed to fetch player:', error);
        return NextResponse.json(
            { error: 'Failed to fetch player' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/players/[id]
 * Update a player
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, phone, email, notes } = body;

        const player = await prisma.player.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(phone !== undefined && { phone: phone?.trim() || null }),
                ...(email !== undefined && { email: email?.trim() || null }),
                ...(notes !== undefined && { notes: notes?.trim() || null }),
            },
        });

        return NextResponse.json(player);
    } catch (error) {
        console.error('Failed to update player:', error);
        return NextResponse.json(
            { error: 'Failed to update player' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/players/[id]
 * Delete a player
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Check if player is in an active session
        const activeSession = await prisma.sessionPlayer.findFirst({
            where: {
                playerId: id,
                session: {
                    status: { in: ['ACTIVE', 'PAUSED'] },
                },
            },
        });

        if (activeSession) {
            return NextResponse.json(
                { error: 'Cannot delete player who is in an active session' },
                { status: 400 }
            );
        }

        await prisma.player.delete({
            where: { id },
        });

        return NextResponse.json({ deleted: true });
    } catch (error) {
        console.error('Failed to delete player:', error);
        return NextResponse.json(
            { error: 'Failed to delete player' },
            { status: 500 }
        );
    }
}
