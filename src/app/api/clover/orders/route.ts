import { NextRequest, NextResponse } from 'next/server';
import { dollarsToCents } from '@/lib/clover-client';
import { getAuthenticatedCloverClient } from '@/lib/clover-tokens';

/**
 * POST /api/clover/orders
 * Create a new order for a table session
 */
export async function POST(request: NextRequest) {
    try {
        const client = await getAuthenticatedCloverClient();

        if (!client) {
            return NextResponse.json(
                { error: 'Not connected to Clover. Please authorize first.' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { tableName, tableNumber, sessionId } = body;

        if (!tableName) {
            return NextResponse.json(
                { error: 'Table name is required' },
                { status: 400 }
            );
        }

        // Create order
        const order = await client.createOrder(
            tableName,
            `Table #${tableNumber} - Session ID: ${sessionId}`
        );

        return NextResponse.json({
            orderId: order.id,
            status: order.state,
        });
    } catch (error) {
        console.error('Failed to create Clover order:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create order' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/clover/orders
 * Update order with final charge and get payment URL
 */
export async function PUT(request: NextRequest) {
    try {
        const client = await getAuthenticatedCloverClient();

        if (!client) {
            return NextResponse.json(
                { error: 'Not connected to Clover. Please authorize first.' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { orderId, amount, tableName, duration } = body;

        if (!orderId || amount === undefined) {
            return NextResponse.json(
                { error: 'Order ID and amount are required' },
                { status: 400 }
            );
        }

        const amountInCents = dollarsToCents(amount);

        // Add line item for the table session
        await client.addLineItem(
            orderId,
            `${tableName} - ${duration}`,
            amountInCents,
            1
        );

        // Lock the order for payment
        await client.createPaymentIntent(orderId, amountInCents);

        // Get payment URL for redirect
        const paymentUrl = client.getPaymentUrl(orderId);
        console.log('[Clover] Payment URL:', paymentUrl);

        return NextResponse.json({
            orderId,
            paymentUrl,
            amount: amountInCents,
        });
    } catch (error) {
        console.error('Failed to update Clover order:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update order' },
            { status: 500 }
        );
    }
}
