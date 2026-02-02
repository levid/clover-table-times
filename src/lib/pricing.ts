/**
 * Pricing Engine for Table Sessions
 * Calculates charges based on time and configured rates
 */

export interface PricingConfig {
    hourlyRate: number;
    minimumCharge: number;
    gracePeriodMinutes: number;
    billingIncrement: 'MINUTE' | 'QUARTER_HOUR' | 'HALF_HOUR' | 'HOUR';
}

export interface SessionTime {
    startTime: Date;
    endTime: Date;
    totalPausedMs: number;
}

/**
 * Calculate the billable minutes for a session
 */
export function calculateBillableMinutes(session: SessionTime): number {
    const { startTime, endTime, totalPausedMs } = session;

    const totalMs = endTime.getTime() - startTime.getTime() - totalPausedMs;
    const totalMinutes = Math.max(0, totalMs / (1000 * 60));

    return totalMinutes;
}

/**
 * Round minutes up to the nearest billing increment
 */
export function roundToIncrement(minutes: number, increment: PricingConfig['billingIncrement']): number {
    switch (increment) {
        case 'MINUTE':
            return Math.ceil(minutes);
        case 'QUARTER_HOUR':
            return Math.ceil(minutes / 15) * 15;
        case 'HALF_HOUR':
            return Math.ceil(minutes / 30) * 30;
        case 'HOUR':
            return Math.ceil(minutes / 60) * 60;
        default:
            return Math.ceil(minutes);
    }
}

/**
 * Calculate the total charge for a session
 */
export function calculateCharge(session: SessionTime, config: PricingConfig): number {
    const { hourlyRate, minimumCharge, gracePeriodMinutes, billingIncrement } = config;

    const rawMinutes = calculateBillableMinutes(session);

    // Apply grace period
    if (rawMinutes <= gracePeriodMinutes) {
        return 0;
    }

    // Subtract grace period from billable time
    const billableMinutes = rawMinutes - gracePeriodMinutes;

    // Round to billing increment
    const roundedMinutes = roundToIncrement(billableMinutes, billingIncrement);

    // Calculate charge
    const charge = (roundedMinutes / 60) * hourlyRate;

    // Apply minimum charge
    return Math.max(charge, minimumCharge);
}

/**
 * Format a charge as currency
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
}

/**
 * Format duration in minutes to HH:MM:SS
 */
export function formatDuration(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0'),
    ].join(':');
}

/**
 * Get elapsed seconds from a start time, accounting for pauses
 */
export function getElapsedSeconds(startTime: Date, totalPausedMs: number = 0, pausedAt?: Date | null): number {
    const now = pausedAt ? pausedAt.getTime() : Date.now();
    const elapsedMs = now - startTime.getTime() - totalPausedMs;
    return Math.max(0, Math.floor(elapsedMs / 1000));
}
