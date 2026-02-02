import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/waitlist - Get all active waitlist entries
export async function GET() {
    try {
        const entries = await prisma.waitlistEntry.findMany({
            where: {
                status: {
                    in: ['WAITING', 'NOTIFIED'],
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        return NextResponse.json(entries);
    } catch (error) {
        console.error('Error fetching waitlist:', error);
        return NextResponse.json(
            { error: 'Failed to fetch waitlist' },
            { status: 500 }
        );
    }
}

// POST /api/waitlist - Add to waitlist
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, partySize, phone, notes } = body;

        if (!name) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            );
        }

        const entry = await prisma.waitlistEntry.create({
            data: {
                name,
                partySize: partySize || 1,
                phone: phone || null,
                notes: notes || null,
            },
        });

        return NextResponse.json(entry, { status: 201 });
    } catch (error) {
        console.error('Error adding to waitlist:', error);
        return NextResponse.json(
            { error: 'Failed to add to waitlist' },
            { status: 500 }
        );
    }
}
