import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateCharge, calculateBillableMinutes } from '@/lib/pricing';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/sessions/[id] - Get a single session
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        const session = await prisma.session.findUnique({
            where: { id },
            include: {
                table: true,
            },
        });

        if (!session) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(session);
    } catch (error) {
        console.error('Error fetching session:', error);
        return NextResponse.json(
            { error: 'Failed to fetch session' },
            { status: 500 }
        );
    }
}

// PUT /api/sessions/[id] - Update session (pause/resume/end)
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { action, notes } = body;

        const session = await prisma.session.findUnique({
            where: { id },
            include: { table: true },
        });

        if (!session) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            );
        }

        // Get settings for pricing
        const settings = await prisma.settings.findFirst() || {
            defaultHourlyRate: 15.00,
            minimumCharge: 5.00,
            gracePeriodMinutes: 0,
            billingIncrement: 'MINUTE' as const,
        };

        let updateData: Record<string, unknown> = {};
        let tableUpdate: Record<string, unknown> = {};

        switch (action) {
            case 'pause':
                if (session.status !== 'ACTIVE') {
                    return NextResponse.json(
                        { error: 'Session is not active' },
                        { status: 400 }
                    );
                }
                updateData = {
                    status: 'PAUSED',
                    pausedAt: new Date(),
                };
                break;

            case 'resume':
                if (session.status !== 'PAUSED' || !session.pausedAt) {
                    return NextResponse.json(
                        { error: 'Session is not paused' },
                        { status: 400 }
                    );
                }
                const pausedDuration = Date.now() - session.pausedAt.getTime();
                updateData = {
                    status: 'ACTIVE',
                    pausedAt: null,
                    totalPausedMs: session.totalPausedMs + pausedDuration,
                };
                break;

            case 'end':
                if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
                    return NextResponse.json(
                        { error: 'Session already ended' },
                        { status: 400 }
                    );
                }

                const endTime = new Date();
                let finalPausedMs = session.totalPausedMs;

                // If currently paused, add remaining pause time
                if (session.status === 'PAUSED' && session.pausedAt) {
                    finalPausedMs += Date.now() - session.pausedAt.getTime();
                }

                const sessionTime = {
                    startTime: session.startTime,
                    endTime,
                    totalPausedMs: finalPausedMs,
                };

                const totalMinutes = calculateBillableMinutes(sessionTime);
                const totalCharge = calculateCharge(sessionTime, {
                    hourlyRate: session.table.hourlyRate,
                    minimumCharge: settings.minimumCharge,
                    gracePeriodMinutes: settings.gracePeriodMinutes,
                    billingIncrement: settings.billingIncrement,
                });

                updateData = {
                    status: 'COMPLETED',
                    endTime,
                    pausedAt: null,
                    totalPausedMs: finalPausedMs,
                    totalMinutes,
                    totalCharge,
                };
                tableUpdate = { status: 'AVAILABLE' };
                break;

            case 'cancel':
                updateData = {
                    status: 'CANCELLED',
                    endTime: new Date(),
                    pausedAt: null,
                };
                tableUpdate = { status: 'AVAILABLE' };
                break;

            default:
                if (notes !== undefined) {
                    updateData = { notes };
                } else {
                    return NextResponse.json(
                        { error: 'Invalid action' },
                        { status: 400 }
                    );
                }
        }

        // Update session and table in transaction
        const operations = [
            prisma.session.update({
                where: { id },
                data: updateData,
                include: { table: true },
            }),
        ];

        if (Object.keys(tableUpdate).length > 0) {
            operations.push(
                prisma.table.update({
                    where: { id: session.tableId },
                    data: tableUpdate,
                }) as never
            );
        }

        const [updatedSession] = await prisma.$transaction(operations);

        return NextResponse.json(updatedSession);
    } catch (error) {
        console.error('Error updating session:', error);
        return NextResponse.json(
            { error: 'Failed to update session' },
            { status: 500 }
        );
    }
}

// DELETE /api/sessions/[id] - Delete a session
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        const session = await prisma.session.findUnique({
            where: { id },
        });

        if (!session) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            );
        }

        // If session is active, also update table status
        if (session.status === 'ACTIVE' || session.status === 'PAUSED') {
            await prisma.$transaction([
                prisma.session.delete({ where: { id } }),
                prisma.table.update({
                    where: { id: session.tableId },
                    data: { status: 'AVAILABLE' },
                }),
            ]);
        } else {
            await prisma.session.delete({ where: { id } });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting session:', error);
        return NextResponse.json(
            { error: 'Failed to delete session' },
            { status: 500 }
        );
    }
}
