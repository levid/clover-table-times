import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedCloverClient } from '@/lib/clover-tokens';

/**
 * POST /api/clover/webhooks
 * Handle Clover webhook events for order and payment updates
 * 
 * Configure this URL in Clover Developer Dashboard:
 * https://your-domain.com/api/clover/webhooks
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log('Clover webhook received:', JSON.stringify(body, null, 2));

        // Clover sends different event types
        const { merchants, type } = body;

        if (!merchants || !type) {
            return NextResponse.json({ received: true });
        }

        // Process each merchant's events
        for (const merchantId of Object.keys(merchants)) {
            const events = merchants[merchantId];

            for (const event of events) {
                await handleWebhookEvent(merchantId, type, event);
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

async function handleWebhookEvent(merchantId: string, type: string, event: any) {
    const { objectId, ts } = event;

    console.log(`Processing ${type} event for merchant ${merchantId}:`, objectId);

    switch (type) {
        case 'PAYMENT':
            await handlePaymentEvent(objectId);
            break;

        case 'ORDER':
            await handleOrderEvent(objectId);
            break;

        case 'APP':
            if (event.type === 'UNINSTALL') {
                // Clean up tokens when app is uninstalled
                await prisma.cloverToken.delete({
                    where: { merchantId },
                }).catch(() => { });
            }
            break;

        default:
            console.log('Unhandled event type:', type);
    }
}

/**
 * Handle payment webhook - update local payment record
 */
async function handlePaymentEvent(paymentId: string) {
    try {
        const client = await getAuthenticatedCloverClient();
        if (!client) return;

        // Get payment details from Clover
        const payment = await client.getPaymentDetails(paymentId);

        if (!payment) return;

        // Find and update local payment record
        const localPayment = await prisma.payment.findFirst({
            where: { cloverOrderId: payment.orderId },
        });

        if (localPayment) {
            await prisma.payment.update({
                where: { id: localPayment.id },
                data: {
                    cloverPaymentId: paymentId,
                    status: payment.result === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
                    tipAmount: payment.tipAmount || 0,
                    totalAmount: payment.amount + (payment.tipAmount || 0),
                },
            });
            console.log(`[Webhook] Updated payment ${localPayment.id} to ${payment.result}`);
        } else {
            // Create new payment record if we don't have one
            await prisma.payment.create({
                data: {
                    cloverOrderId: payment.orderId,
                    cloverPaymentId: paymentId,
                    amount: payment.amount - (payment.tipAmount || 0),
                    tipAmount: payment.tipAmount || 0,
                    totalAmount: payment.amount,
                    status: payment.result === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
                    paymentMethod: 'card',
                },
            });
            console.log(`[Webhook] Created new payment record for ${paymentId}`);
        }
    } catch (error) {
        console.error(`[Webhook] Failed to handle payment ${paymentId}:`, error);
    }
}

/**
 * Handle order webhook - update session link if needed
 */
async function handleOrderEvent(orderId: string) {
    try {
        // Check if we have a session linked to this order
        const session = await prisma.session.findFirst({
            where: { cloverOrderId: orderId },
        });

        if (session) {
            console.log(`[Webhook] Order ${orderId} linked to session ${session.id}`);
            // Could update session status here if needed
        }
    } catch (error) {
        console.error(`[Webhook] Failed to handle order ${orderId}:`, error);
    }
}

/**
 * GET /api/clover/webhooks
 * Verification endpoint for Clover webhook setup
 */
export async function GET(request: NextRequest) {
    const verificationCode = request.nextUrl.searchParams.get('verificationCode');

    if (verificationCode) {
        // Return the verification code to confirm webhook URL ownership
        return new NextResponse(verificationCode, {
            headers: { 'Content-Type': 'text/plain' },
        });
    }

    return NextResponse.json({ status: 'Webhook endpoint active' });
}
