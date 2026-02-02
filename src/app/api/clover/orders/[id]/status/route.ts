import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCloverClient } from '@/lib/clover-tokens';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/clover/orders/[id]/status
 * Check if an order has been paid
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: orderId } = await params;

        const client = await getAuthenticatedCloverClient();
        if (!client) {
            return NextResponse.json(
                { error: 'Not connected to Clover' },
                { status: 401 }
            );
        }

        // Get order details
        const order = await client.getOrder(orderId);

        // Get payments for this order
        const payments = await client.getOrderPayments(orderId);

        const hasPaidPayments = payments.elements?.some(
            (p: any) => p.result === 'SUCCESS'
        );

        return NextResponse.json({
            orderId,
            state: order.state,
            total: order.total,
            paid: hasPaidPayments,
            paymentCount: payments.elements?.length || 0,
        });
    } catch (error) {
        console.error('Failed to get order status:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get status' },
            { status: 500 }
        );
    }
}
