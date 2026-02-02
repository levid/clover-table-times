import prisma from './prisma';
import { getAuthenticatedCloverClient } from './clover-tokens';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

interface QueuedPayment {
    id: string;
    sessionId: string | null;
    tableName: string;
    amount: number;
    tipAmount: number;
}

/**
 * Add a payment to the offline queue
 */
export async function queuePayment(data: {
    sessionId?: string;
    tableName: string;
    amount: number;
    tipAmount?: number;
}) {
    return prisma.paymentQueue.create({
        data: {
            sessionId: data.sessionId,
            tableName: data.tableName,
            amount: data.amount,
            tipAmount: data.tipAmount || 0,
            status: 'PENDING',
        },
    });
}

/**
 * Process all pending payments in the queue
 */
export async function processPaymentQueue(): Promise<{
    processed: number;
    failed: number;
}> {
    let processed = 0;
    let failed = 0;

    const pendingPayments = await prisma.paymentQueue.findMany({
        where: {
            status: 'PENDING',
            retryCount: { lt: MAX_RETRIES },
        },
        orderBy: { createdAt: 'asc' },
    });

    for (const payment of pendingPayments) {
        try {
            await processQueuedPayment(payment);
            processed++;
        } catch (error) {
            failed++;
            console.error(`[PaymentQueue] Failed to process ${payment.id}:`, error);
        }
    }

    return { processed, failed };
}

/**
 * Process a single queued payment
 */
async function processQueuedPayment(payment: QueuedPayment) {
    // Mark as processing
    await prisma.paymentQueue.update({
        where: { id: payment.id },
        data: { status: 'PROCESSING' },
    });

    try {
        const client = await getAuthenticatedCloverClient();
        if (!client) {
            throw new Error('Clover not connected');
        }

        // Create order in Clover
        const order = await client.createOrder(payment.tableName);

        // Add line item
        await client.addLineItem(
            order.id,
            payment.tableName,
            payment.amount,
            1
        );

        // Add tip if present
        if (payment.tipAmount > 0) {
            await client.addTipToOrder(order.id, payment.tipAmount);
        }

        // Create payment record
        await prisma.payment.create({
            data: {
                sessionId: payment.sessionId,
                cloverOrderId: order.id,
                amount: payment.amount,
                tipAmount: payment.tipAmount,
                totalAmount: payment.amount + payment.tipAmount,
                status: 'PENDING',
                paymentMethod: 'card',
            },
        });

        // Mark queue item as completed
        await prisma.paymentQueue.update({
            where: { id: payment.id },
            data: {
                status: 'COMPLETED',
                processedAt: new Date(),
            },
        });
    } catch (error) {
        // Increment retry count
        await prisma.paymentQueue.update({
            where: { id: payment.id },
            data: {
                status: 'PENDING',
                retryCount: { increment: 1 },
                lastError: error instanceof Error ? error.message : 'Unknown error',
            },
        });
        throw error;
    }
}

/**
 * Get queue status
 */
export async function getQueueStatus() {
    const [pending, processing, completed, failed] = await Promise.all([
        prisma.paymentQueue.count({ where: { status: 'PENDING' } }),
        prisma.paymentQueue.count({ where: { status: 'PROCESSING' } }),
        prisma.paymentQueue.count({ where: { status: 'COMPLETED' } }),
        prisma.paymentQueue.count({ where: { status: 'FAILED' } }),
    ]);

    return { pending, processing, completed, failed };
}

/**
 * Retry failed payments
 */
export async function retryFailedPayments() {
    await prisma.paymentQueue.updateMany({
        where: {
            status: 'FAILED',
            retryCount: { lt: MAX_RETRIES },
        },
        data: {
            status: 'PENDING',
        },
    });
}
