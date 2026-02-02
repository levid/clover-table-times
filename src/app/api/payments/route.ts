import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/payments
 * List payments with optional filters
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const where: any = {};
        if (sessionId) where.sessionId = sessionId;
        if (status) where.status = status;

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                include: {
                    session: {
                        include: { table: true },
                    },
                },
            }),
            prisma.payment.count({ where }),
        ]);

        return NextResponse.json({
            payments,
            total,
            limit,
            offset,
        });
    } catch (error) {
        console.error('Failed to get payments:', error);
        return NextResponse.json(
            { error: 'Failed to get payments' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/payments
 * Create a payment record
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            sessionId,
            cloverOrderId,
            cloverPaymentId,
            amount,
            tipAmount = 0,
            paymentMethod,
            customerEmail,
            customerPhone,
        } = body;

        const payment = await prisma.payment.create({
            data: {
                sessionId,
                cloverOrderId,
                cloverPaymentId,
                amount,
                tipAmount,
                totalAmount: amount + tipAmount,
                paymentMethod,
                customerEmail,
                customerPhone,
                status: 'PENDING',
            },
        });

        return NextResponse.json(payment);
    } catch (error) {
        console.error('Failed to create payment:', error);
        return NextResponse.json(
            { error: 'Failed to create payment' },
            { status: 500 }
        );
    }
}
