import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/sessions - List sessions with optional filters
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const tableId = searchParams.get('tableId');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');

        const sessions = await prisma.session.findMany({
            where: {
                ...(tableId && { tableId }),
                ...(status && { status: status as 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' }),
            },
            include: {
                table: true,
            },
            orderBy: {
                startTime: 'desc',
            },
            take: limit,
        });

        return NextResponse.json(sessions);
    } catch (error) {
        console.error('Error fetching sessions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sessions' },
            { status: 500 }
        );
    }
}

// POST /api/sessions - Start a new session on a table
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { tableId, notes } = body;

        if (!tableId) {
            return NextResponse.json(
                { error: 'Table ID is required' },
                { status: 400 }
            );
        }

        // Check if table exists and is available
        const table = await prisma.table.findUnique({
            where: { id: tableId },
            include: {
                sessions: {
                    where: {
                        status: {
                            in: ['ACTIVE', 'PAUSED'],
                        },
                    },
                },
            },
        });

        if (!table) {
            return NextResponse.json(
                { error: 'Table not found' },
                { status: 404 }
            );
        }

        if (table.sessions.length > 0) {
            return NextResponse.json(
                { error: 'Table already has an active session' },
                { status: 400 }
            );
        }

        // Create session and update table status
        const [session] = await prisma.$transaction([
            prisma.session.create({
                data: {
                    tableId,
                    notes,
                    status: 'ACTIVE',
                },
            }),
            prisma.table.update({
                where: { id: tableId },
                data: { status: 'OCCUPIED' },
            }),
        ]);

        return NextResponse.json(session, { status: 201 });
    } catch (error) {
        console.error('Error creating session:', error);
        return NextResponse.json(
            { error: 'Failed to create session' },
            { status: 500 }
        );
    }
}
