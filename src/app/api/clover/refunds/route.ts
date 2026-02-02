import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedCloverClient } from '@/lib/clover-tokens';

/**
 * POST /api/clover/refunds
 * Issue a refund for a payment
 */
export async function POST(request: NextRequest) {
    try {
        const client = await getAuthenticatedCloverClient();
        if (!client) {
            return NextResponse.json({ error: 'Not connected to Clover' }, { status: 401 });
        }

        const body = await request.json();
        const { paymentId, amount, reason } = body;

        if (!paymentId || !amount) {
            return NextResponse.json({ error: 'Payment ID and amount required' }, { status: 400 });
        }

        // Create refund in Clover
        const refund = await client.createRefund(paymentId, amount, reason);

        // Update local payment record if exists
        await prisma.payment.updateMany({
            where: { cloverPaymentId: paymentId },
            data: {
                refundedAmount: { increment: amount },
                refundReason: reason,
                refundedAt: new Date(),
                status: 'REFUNDED',
            },
        });

        return NextResponse.json({
            refundId: refund.id,
            amount,
            status: 'REFUNDED',
        });
    } catch (error) {
        console.error('Refund failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Refund failed' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/clover/refunds
 * List recent refunds
 */
export async function GET() {
    try {
        const client = await getAuthenticatedCloverClient();
        if (!client) {
            return NextResponse.json({ error: 'Not connected to Clover' }, { status: 401 });
        }

        const refunds = await client.getRefunds(50);
        return NextResponse.json(refunds);
    } catch (error) {
        console.error('Failed to get refunds:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get refunds' },
            { status: 500 }
        );
    }
}
