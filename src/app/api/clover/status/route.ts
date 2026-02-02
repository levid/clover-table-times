import { NextResponse } from 'next/server';
import { CloverClient } from '@/lib/clover-client';
import { getAuthenticatedCloverClient, hasValidCloverConnection, deleteCloverToken } from '@/lib/clover-tokens';

/**
 * GET /api/clover/status
 * Check if Clover is connected and get merchant info
 */
export async function GET() {
    try {
        const isConfigured = CloverClient.isConfigured();
        const merchantId = process.env.CLOVER_MERCHANT_ID;

        if (!isConfigured) {
            return NextResponse.json({
                configured: false,
                connected: false,
                message: 'Clover API credentials not configured',
            });
        }

        const hasConnection = await hasValidCloverConnection(merchantId);

        if (!hasConnection) {
            return NextResponse.json({
                configured: true,
                connected: false,
                message: 'Not connected to Clover',
            });
        }

        // Verify token by getting merchant info
        const client = await getAuthenticatedCloverClient(merchantId);
        if (!client) {
            return NextResponse.json({
                configured: true,
                connected: false,
                message: 'Failed to get authenticated client',
            });
        }

        const merchant = await client.getMerchant();

        return NextResponse.json({
            configured: true,
            connected: true,
            merchant: {
                id: merchant.id,
                name: merchant.name,
            },
        });
    } catch (error) {
        console.error('Clover status check failed:', error);
        return NextResponse.json({
            configured: true,
            connected: false,
            message: 'Connection verification failed',
        });
    }
}

/**
 * DELETE /api/clover/status
 * Disconnect from Clover (clear tokens)
 */
export async function DELETE() {
    const merchantId = process.env.CLOVER_MERCHANT_ID;

    if (merchantId) {
        await deleteCloverToken(merchantId);
    }

    return NextResponse.json({ disconnected: true });
}
