import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/reports
 * Generate daily/period revenue reports from payment history
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'day'; // day, week, month
        const dateStr = searchParams.get('date'); // YYYY-MM-DD

        let startDate: Date;
        let endDate: Date;

        const baseDate = dateStr ? new Date(dateStr) : new Date();
        baseDate.setHours(0, 0, 0, 0);

        switch (period) {
            case 'week':
                startDate = new Date(baseDate);
                startDate.setDate(baseDate.getDate() - baseDate.getDay()); // Start of week
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 7);
                break;
            case 'month':
                startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
                endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
                break;
            default: // day
                startDate = baseDate;
                endDate = new Date(baseDate);
                endDate.setDate(baseDate.getDate() + 1);
        }

        // Get payments in period
        const payments = await prisma.payment.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lt: endDate,
                },
                status: 'COMPLETED',
            },
            include: {
                session: {
                    include: { table: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        type PaymentWithSessionAndTable = typeof payments[number];

        // Calculate totals
        const totals = payments.reduce(
            (acc: { revenue: number; tips: number; refunds: number; count: number }, p: PaymentWithSessionAndTable) => ({
                revenue: acc.revenue + p.amount,
                tips: acc.tips + p.tipAmount,
                refunds: acc.refunds + p.refundedAmount,
                count: acc.count + 1,
            }),
            { revenue: 0, tips: 0, refunds: 0, count: 0 }
        );

        // Group by table
        const byTable: Record<string, { count: number; revenue: number; tips: number }> = {};
        for (const p of payments) {
            const tableName = p.session?.table?.name || 'Unknown';
            if (!byTable[tableName]) {
                byTable[tableName] = { count: 0, revenue: 0, tips: 0 };
            }
            byTable[tableName].count++;
            byTable[tableName].revenue += p.amount;
            byTable[tableName].tips += p.tipAmount;
        }

        // Group by hour (for daily reports)
        const byHour: Record<number, number> = {};
        if (period === 'day') {
            for (const p of payments) {
                const hour = new Date(p.createdAt).getHours();
                byHour[hour] = (byHour[hour] || 0) + p.totalAmount;
            }
        }

        return NextResponse.json({
            period,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totals: {
                grossRevenue: totals.revenue,
                tips: totals.tips,
                refunds: totals.refunds,
                netRevenue: totals.revenue + totals.tips - totals.refunds,
                transactionCount: totals.count,
            },
            breakdown: {
                byTable: Object.entries(byTable).map(([name, data]) => ({
                    tableName: name,
                    ...data,
                })),
                byHour: period === 'day' ? byHour : undefined,
            },
            recentPayments: payments.slice(0, 10).map((p: PaymentWithSessionAndTable) => ({
                id: p.id,
                amount: p.totalAmount,
                tip: p.tipAmount,
                table: p.session?.table?.name,
                time: p.createdAt,
            })),
        });
    } catch (error) {
        console.error('Failed to generate report:', error);
        return NextResponse.json(
            { error: 'Failed to generate report' },
            { status: 500 }
        );
    }
}
