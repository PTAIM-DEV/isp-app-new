import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const flows = await prisma.paymentFlow.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(flows);
    } catch (error) {
        console.error('Error fetching payment flows:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const flow = await prisma.paymentFlow.create({
            data: {
                name: body.name,
                description: body.description || null,
                requiresInstallationPayment: body.requiresInstallationPayment || false,
                installationFeeAmount: body.installationFeeAmount ? body.installationFeeAmount : null,
                freeInstallation: body.freeInstallation || false,
                requiresFirstMonthPayment: body.requiresFirstMonthPayment !== undefined ? body.requiresFirstMonthPayment : true,
                firstMonthPaymentAfterInstall: body.firstMonthPaymentAfterInstall !== undefined ? body.firstMonthPaymentAfterInstall : true,
                supportsTrial: body.supportsTrial || false,
                trialDays: body.trialDays ? parseInt(body.trialDays) : null,
                isActive: body.isActive !== undefined ? body.isActive : true,
            },
        });

        return NextResponse.json(flow);
    } catch (error) {
        console.error('Error creating payment flow:', error);
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


