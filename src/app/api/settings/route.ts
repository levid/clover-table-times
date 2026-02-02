import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/settings - Get current settings
export async function GET() {
    try {
        let settings = await prisma.settings.findFirst();

        // Create default settings if none exist
        if (!settings) {
            settings = await prisma.settings.create({
                data: {
                    defaultHourlyRate: 15.00,
                    minimumCharge: 5.00,
                    gracePeriodMinutes: 0,
                    billingIncrement: 'MINUTE',
                },
            });
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch settings' },
            { status: 500 }
        );
    }
}

// PUT /api/settings - Update settings
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { defaultHourlyRate, minimumCharge, gracePeriodMinutes, billingIncrement } = body;

        let settings = await prisma.settings.findFirst();

        if (!settings) {
            settings = await prisma.settings.create({
                data: {
                    defaultHourlyRate: defaultHourlyRate ?? 15.00,
                    minimumCharge: minimumCharge ?? 5.00,
                    gracePeriodMinutes: gracePeriodMinutes ?? 0,
                    billingIncrement: billingIncrement ?? 'MINUTE',
                },
            });
        } else {
            settings = await prisma.settings.update({
                where: { id: settings.id },
                data: {
                    ...(defaultHourlyRate !== undefined && { defaultHourlyRate }),
                    ...(minimumCharge !== undefined && { minimumCharge }),
                    ...(gracePeriodMinutes !== undefined && { gracePeriodMinutes }),
                    ...(billingIncrement !== undefined && { billingIncrement }),
                },
            });
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json(
            { error: 'Failed to update settings' },
            { status: 500 }
        );
    }
}
