import { NextRequest, NextResponse } from 'next/server';
import { createCloverClient } from '@/lib/clover-client';
import { saveCloverToken } from '@/lib/clover-tokens';

/**
 * GET /api/clover/oauth/callback
 * Handle Clover OAuth callback - stores tokens in database
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const merchantId = searchParams.get('merchant_id');
    const error = searchParams.get('error');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (error) {
        return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent(error)}`);
    }

    if (!code || !merchantId) {
        return NextResponse.redirect(`${appUrl}?error=missing_code_or_merchant`);
    }

    try {
        const redirectUri = `${appUrl}/api/clover/oauth/callback`;
        const client = createCloverClient();

        // Exchange code for tokens (v2 OAuth returns access + refresh + expires_in)
        const tokenResponse = await exchangeCodeForTokens(code, redirectUri);

        // Store tokens in database
        await saveCloverToken(merchantId, {
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            expiresIn: tokenResponse.expires_in,
        });

        // Store merchant ID in env for this session (optional - for single merchant setup)
        // In multi-merchant setup, you'd handle this differently

        return NextResponse.redirect(`${appUrl}?clover_connected=true&merchant_id=${merchantId}`);
    } catch (err) {
        console.error('OAuth error:', err);
        return NextResponse.redirect(`${appUrl}?error=oauth_failed`);
    }
}

/**
 * Exchange authorization code for tokens using v2 OAuth
 */
async function exchangeCodeForTokens(code: string, redirectUri: string) {
    const appId = process.env.CLOVER_APP_ID;
    const appSecret = process.env.CLOVER_APP_SECRET;
    const environment = process.env.CLOVER_ENVIRONMENT || 'sandbox';

    const baseUrl = environment === 'production'
        ? 'https://www.clover.com'
        : 'https://sandbox.dev.clover.com';

    const params = new URLSearchParams({
        client_id: appId!,
        client_secret: appSecret!,
        code,
        redirect_uri: redirectUri,
    });

    const response = await fetch(`${baseUrl}/oauth/token?${params.toString()}`);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${errorText}`);
    }

    return response.json();
}
