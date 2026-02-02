import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// PUT /api/waitlist/[id] - Update waitlist entry status
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status, name, partySize, phone, notes } = body;

        const updateData: Record<string, unknown> = {};

        if (name) updateData.name = name;
        if (partySize !== undefined) updateData.partySize = partySize;
        if (phone !== undefined) updateData.phone = phone;
        if (notes !== undefined) updateData.notes = notes;

        if (status) {
            updateData.status = status;
            if (status === 'SEATED') {
                updateData.seatedAt = new Date();
            } else if (status === 'CANCELLED' || status === 'NO_SHOW') {
                updateData.cancelledAt = new Date();
            }
        }

        const entry = await prisma.waitlistEntry.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(entry);
    } catch (error) {
        console.error('Error updating waitlist entry:', error);
        return NextResponse.json(
            { error: 'Failed to update waitlist entry' },
            { status: 500 }
        );
    }
}

// DELETE /api/waitlist/[id] - Remove from waitlist
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        await prisma.waitlistEntry.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting waitlist entry:', error);
        return NextResponse.json(
            { error: 'Failed to delete waitlist entry' },
            { status: 500 }
        );
    }
}
