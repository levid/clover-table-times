/**
 * Clover API Client
 * Handles OAuth flow, order creation, and payment processing
 */

const CLOVER_API_BASE = {
    sandbox: 'https://sandbox.dev.clover.com',
    production: 'https://api.clover.com',
};

const CLOVER_WEB_BASE = {
    sandbox: 'https://sandbox.dev.clover.com',
    production: 'https://www.clover.com',
};

interface CloverConfig {
    appId: string;
    appSecret: string;
    merchantId: string;
    accessToken?: string;
    environment: 'sandbox' | 'production';
}

interface CloverOrder {
    id: string;
    currency: string;
    total: number;
    state: string;
    createdTime: number;
    modifiedTime: number;
}

interface CloverLineItem {
    id: string;
    name: string;
    price: number;
    unitQty: number;
}

interface CloverPayment {
    id: string;
    orderId: string;
    amount: number;
    tipAmount: number;
    result: 'SUCCESS' | 'FAIL' | 'PENDING';
}

export class CloverClient {
    private config: CloverConfig;
    private baseUrl: string;
    private webUrl: string;

    constructor(config: CloverConfig) {
        this.config = config;
        this.baseUrl = CLOVER_API_BASE[config.environment];
        this.webUrl = CLOVER_WEB_BASE[config.environment];
    }

    /**
     * Generate OAuth authorization URL
     */
    getAuthUrl(redirectUri: string): string {
        const params = new URLSearchParams({
            client_id: this.config.appId,
            redirect_uri: redirectUri,
        });
        return `${this.webUrl}/oauth/authorize?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access token
     */
    async exchangeCode(code: string, redirectUri: string): Promise<string> {
        const params = new URLSearchParams({
            client_id: this.config.appId,
            client_secret: this.config.appSecret,
            code,
            redirect_uri: redirectUri,
        });

        const response = await fetch(`${this.webUrl}/oauth/token?${params.toString()}`);

        if (!response.ok) {
            throw new Error('Failed to exchange authorization code');
        }

        const data = await response.json();
        return data.access_token;
    }

    /**
     * Make authenticated API request
     */
    private async request<T>(
        method: string,
        endpoint: string,
        body?: object
    ): Promise<T> {
        if (!this.config.accessToken) {
            throw new Error('Access token not set. Complete OAuth flow first.');
        }

        const url = `${this.baseUrl}/v3/merchants/${this.config.merchantId}${endpoint}`;

        console.log(`[Clover API] ${method} ${url}`);
        console.log(`[Clover API] Token: ${this.config.accessToken.substring(0, 20)}...`);

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${this.config.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`[Clover API] Error ${response.status}:`, error);
            throw new Error(`Clover API error: ${response.status} - ${error}`);
        }

        return response.json();
    }

    /**
     * Set access token
     */
    setAccessToken(token: string) {
        this.config.accessToken = token;
    }

    /**
     * Get merchant information
     */
    async getMerchant() {
        return this.request<{ id: string; name: string }>('GET', '');
    }

    /**
     * Create an order for a table session
     */
    async createOrder(tableName: string, note?: string): Promise<CloverOrder> {
        return this.request<CloverOrder>('POST', '/orders', {
            state: 'open',
            note: note || `Table session: ${tableName}`,
        });
    }

    /**
     * Add line item to an order
     */
    async addLineItem(
        orderId: string,
        name: string,
        priceInCents: number,
        quantity: number = 1
    ): Promise<CloverLineItem> {
        return this.request<CloverLineItem>('POST', `/orders/${orderId}/line_items`, {
            name,
            price: priceInCents,
            unitQty: quantity * 1000, // Clover uses thousandths for quantity
        });
    }

    /**
     * Update order total (for time-based pricing)
     */
    async updateOrderTotal(orderId: string, totalInCents: number): Promise<CloverOrder> {
        return this.request<CloverOrder>('POST', `/orders/${orderId}`, {
            total: totalInCents,
        });
    }

    /**
     * Get order details
     */
    async getOrder(orderId: string): Promise<CloverOrder> {
        return this.request<CloverOrder>('GET', `/orders/${orderId}`);
    }

    /**
     * Pay for an order
     * Note: This creates a payment intent. Actual payment is processed on Clover device.
     */
    async createPaymentIntent(orderId: string, amountInCents: number): Promise<{ paymentId: string }> {
        // In a real implementation, this would integrate with Clover's payment flow
        // For web apps, you'd typically redirect to Clover's payment page
        // or use the Clover Payments API with a registered payment device

        const order = await this.request<CloverOrder>('POST', `/orders/${orderId}`, {
            state: 'locked',
            total: amountInCents,
        });

        return { paymentId: `payment_${orderId}` };
    }

    /**
     * Generate a payment URL for the Clover payment page
     * Note: In sandbox, we link to the merchant dashboard order view
     * In production, this would be the actual payment page
     */
    getPaymentUrl(orderId: string): string {
        if (this.config.environment === 'sandbox') {
            // Sandbox: Link to merchant dashboard to view/manage the order
            return `${this.webUrl}/dashboard/m/${this.config.merchantId}/orders/${orderId}`;
        }
        // Production: Link to the payment page
        return `${this.webUrl}/m/${this.config.merchantId}/orders/${orderId}/pay`;
    }

    /**
     * Close/finalize an order
     */
    async closeOrder(orderId: string): Promise<CloverOrder> {
        return this.request<CloverOrder>('POST', `/orders/${orderId}`, {
            state: 'closed',
        });
    }

    /**
     * Delete/cancel an order
     */
    async deleteOrder(orderId: string): Promise<void> {
        await this.request<void>('DELETE', `/orders/${orderId}`);
    }

    /**
     * Get payment status
     */
    async getPayment(paymentId: string): Promise<CloverPayment> {
        return this.request<CloverPayment>('GET', `/payments/${paymentId}`);
    }

    /**
     * List payments for an order
     */
    async getOrderPayments(orderId: string): Promise<{ elements: CloverPayment[] }> {
        return this.request<{ elements: CloverPayment[] }>('GET', `/orders/${orderId}/payments`);
    }

    /**
     * Create a refund for a payment
     */
    async createRefund(paymentId: string, amountInCents: number, reason?: string): Promise<{ id: string }> {
        return this.request<{ id: string }>('POST', `/refunds`, {
            payment: { id: paymentId },
            amount: amountInCents,
            reason: reason || 'Customer refund',
        });
    }

    /**
     * Add tip to an order
     */
    async addTipToOrder(orderId: string, tipAmountInCents: number): Promise<CloverOrder> {
        return this.request<CloverOrder>('POST', `/orders/${orderId}`, {
            tipAmount: tipAmountInCents,
        });
    }

    /**
     * Get all refunds for a merchant
     */
    async getRefunds(limit: number = 50): Promise<{ elements: any[] }> {
        return this.request<{ elements: any[] }>('GET', `/refunds?limit=${limit}`);
    }

    /**
     * Get a specific payment
     */
    async getPaymentDetails(paymentId: string): Promise<CloverPayment> {
        return this.request<CloverPayment>('GET', `/payments/${paymentId}`);
    }

    /**
     * Check if Clover is configured
     */
    static isConfigured(): boolean {
        return !!(
            process.env.CLOVER_APP_ID &&
            process.env.CLOVER_APP_SECRET &&
            process.env.CLOVER_MERCHANT_ID
        );
    }
}

/**
 * Helper to create a CloverClient from environment variables
 */
export function createCloverClient(accessToken?: string): CloverClient {
    const config: CloverConfig = {
        appId: process.env.CLOVER_APP_ID || '',
        appSecret: process.env.CLOVER_APP_SECRET || '',
        merchantId: process.env.CLOVER_MERCHANT_ID || '',
        accessToken,
        environment: (process.env.CLOVER_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    };

    return new CloverClient(config);
}

/**
 * Convert dollars to cents for Clover API
 */
export function dollarsToCents(amount: number): number {
    return Math.round(amount * 100);
}

/**
 * Convert cents to dollars
 */
export function centsToDollars(cents: number): number {
    return cents / 100;
}
