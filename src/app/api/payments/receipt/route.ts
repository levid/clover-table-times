import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * POST /api/payments/receipt
 * Send a receipt via email or SMS (stub - would integrate with Twilio/SendGrid)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { orderId, email, phone, amount, tableName } = body;

        if (!email && !phone) {
            return NextResponse.json({ error: 'Email or phone required' }, { status: 400 });
        }

        // Update payment record with customer contact
        if (orderId) {
            await prisma.payment.updateMany({
                where: { cloverOrderId: orderId },
                data: {
                    customerEmail: email || undefined,
                    customerPhone: phone || undefined,
                    receiptSent: true,
                },
            });
        }

        // TODO: Integrate with actual email/SMS service
        // Example: await sendgrid.send({ to: email, ... })
        // Example: await twilio.messages.create({ to: phone, ... })

        console.log(`[Receipt] Sending to ${email || phone}:`, {
            orderId,
            amount,
            tableName,
        });

        // For now, just log and return success
        return NextResponse.json({
            success: true,
            sentTo: email || phone,
        });
    } catch (error) {
        console.error('Failed to send receipt:', error);
        return NextResponse.json(
            { error: 'Failed to send receipt' },
            { status: 500 }
        );
    }
}
