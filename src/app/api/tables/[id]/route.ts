import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/tables/[id] - Get a single table
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        const table = await prisma.table.findUnique({
            where: { id },
            include: {
                sessions: {
                    where: {
                        status: {
                            in: ['ACTIVE', 'PAUSED'],
                        },
                    },
                    take: 1,
                },
            },
        });

        if (!table) {
            return NextResponse.json(
                { error: 'Table not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            ...table,
            currentSession: table.sessions[0] || null,
        });
    } catch (error) {
        console.error('Error fetching table:', error);
        return NextResponse.json(
            { error: 'Failed to fetch table' },
            { status: 500 }
        );
    }
}

// PUT /api/tables/[id] - Update a table
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, tableNumber, hourlyRate, status, timeLimitMinutes } = body;

        const table = await prisma.table.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(tableNumber !== undefined && { tableNumber }),
                ...(hourlyRate !== undefined && { hourlyRate }),
                ...(status && { status }),
                ...(timeLimitMinutes !== undefined && { timeLimitMinutes: timeLimitMinutes || null }),
            },
        });

        return NextResponse.json(table);
    } catch (error) {
        console.error('Error updating table:', error);
        return NextResponse.json(
            { error: 'Failed to update table' },
            { status: 500 }
        );
    }
}

// DELETE /api/tables/[id] - Delete a table
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        await prisma.table.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting table:', error);
        return NextResponse.json(
            { error: 'Failed to delete table' },
            { status: 500 }
        );
    }
}
