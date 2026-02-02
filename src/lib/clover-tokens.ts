/**
 * Clover Token Management
 * Handles token storage, retrieval, and refresh for v2 OAuth
 */

import prisma from '@/lib/prisma';
import { createCloverClient } from '@/lib/clover-client';

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 min before expiry

interface TokenData {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number; // seconds
}

/**
 * Save or update Clover tokens for a merchant
 */
export async function saveCloverToken(merchantId: string, tokens: TokenData) {
    const expiresAt = tokens.expiresIn
        ? new Date(Date.now() + tokens.expiresIn * 1000)
        : null;

    await prisma.cloverToken.upsert({
        where: { merchantId },
        update: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken || undefined,
            expiresAt,
        },
        create: {
            merchantId,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt,
        },
    });
}

/**
 * Get the valid access token for a merchant, refreshing if needed
 */
export async function getValidToken(merchantId?: string): Promise<string | null> {
    const mId = merchantId || process.env.CLOVER_MERCHANT_ID;
    if (!mId) return null;

    const token = await prisma.cloverToken.findUnique({
        where: { merchantId: mId },
    });

    if (!token) return null;

    // Check if token needs refresh
    if (token.expiresAt && token.refreshToken) {
        const now = new Date();
        const expiresAt = new Date(token.expiresAt);

        if (now.getTime() > expiresAt.getTime() - TOKEN_REFRESH_BUFFER_MS) {
            // Token expired or expiring soon, refresh it
            const newToken = await refreshAccessToken(mId, token.refreshToken);
            return newToken;
        }
    }

    return token.accessToken;
}

/**
 * Refresh the access token using refresh token
 */
export async function refreshAccessToken(merchantId: string, refreshToken: string): Promise<string | null> {
    try {
        const appId = process.env.CLOVER_APP_ID;
        const appSecret = process.env.CLOVER_APP_SECRET;
        const environment = process.env.CLOVER_ENVIRONMENT || 'sandbox';

        const baseUrl = environment === 'production'
            ? 'https://www.clover.com'
            : 'https://sandbox.dev.clover.com';

        const params = new URLSearchParams({
            client_id: appId!,
            client_secret: appSecret!,
            refresh_token: refreshToken,
        });

        const response = await fetch(`${baseUrl}/oauth/token?${params.toString()}`, {
            method: 'POST',
        });

        if (!response.ok) {
            console.error('Failed to refresh token:', await response.text());
            return null;
        }

        const data = await response.json();

        // Save new tokens
        await saveCloverToken(merchantId, {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in,
        });

        return data.access_token;
    } catch (error) {
        console.error('Token refresh error:', error);
        return null;
    }
}

/**
 * Delete tokens for a merchant (logout)
 */
export async function deleteCloverToken(merchantId: string) {
    await prisma.cloverToken.delete({
        where: { merchantId },
    }).catch(() => { }); // Ignore if not found
}

/**
 * Check if merchant has valid Clover connection
 */
export async function hasValidCloverConnection(merchantId?: string): Promise<boolean> {
    const token = await getValidToken(merchantId);
    return !!token;
}

/**
 * Get authenticated Clover client with valid token
 */
export async function getAuthenticatedCloverClient(merchantId?: string) {
    const token = await getValidToken(merchantId);
    if (!token) return null;

    return createCloverClient(token);
}
