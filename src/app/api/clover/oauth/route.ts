import { NextRequest, NextResponse } from 'next/server';
import { createCloverClient } from '@/lib/clover-client';

/**
 * GET /api/clover/oauth
 * Redirect to Clover OAuth authorization
 */
export async function GET(request: NextRequest) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${appUrl}/api/clover/oauth/callback`;

    const client = createCloverClient();
    const authUrl = client.getAuthUrl(redirectUri);

    return NextResponse.redirect(authUrl);
}
