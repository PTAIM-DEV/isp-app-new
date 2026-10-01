import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// POST /api/technician/tasks/[id]/complete - Complete a task and create report
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Get current technician from session
        const cookieStore = await cookies();
        const session = cookieStore.get('technician_session');

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Find technician by session
        const sessions = await prisma.systemSetting.findMany({
            where: {
                key: { startsWith: 'technician_session_' }
            }
        });

        let technicianId: string | null = null;
        for (const sessionData of sessions) {
            try {
                const { token } = JSON.parse(sessionData.value);
                if (token === session.value) {
                    technicianId = sessionData.key.replace('technician_session_', '');
                    break;
                }
            } catch (e) {
                // Skip invalid session data
            }
        }

        if (!technicianId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const {
            status,
            description,
            materialsUsed,
            timeSpent,
            issuesFound,
            recommendations,
            photos,
        } = body;

        // Try installation first
        const installation = await prisma.installation.findFirst({
            where: {
                id,
                technicianUserId: technicianId,
            }
        });

        if (installation) {
            // Update installation status
            // Update installation status
            await prisma.installation.update({
                where: { id },
                data: {
                    status: status === 'SUCCESS' ? 'COMPLETED' : status === 'FAILED' ? 'FAILED' : 'PENDING',
                    completedDate: new Date(),
                }
            });

            // Update User Status & Trigger Auto-Next-Step
            if (status === 'SUCCESS') {
                const user = await prisma.user.findUnique({
                    where: { id: installation.userId },
                    include: { assignedPaymentFlow: true }
                });

                if (user) {
                    // 1. Update status to INSTALLED
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { status: 'INSTALLED' }
                    });

                    // 2. Check Payment Flow for Next Step
                    if (user.assignedPaymentFlow) {
                        const flow = user.assignedPaymentFlow;

                        // Scenario A: Auto-Invoice First Month
                        if (flow.requiresFirstMonthPayment && flow.firstMonthPaymentAfterInstall) {
                            const { generateFirstMonthInvoice } = await import('@/lib/invoice-generator');
                            try {
                                await generateFirstMonthInvoice(user.id, flow.id, user.registeredPromoCode || undefined);
                                // Update status again to reflect payment pending
                                await prisma.user.update({
                                    where: { id: user.id },
                                    data: { status: 'INSTALLED_PAYMENT_PENDING' }
                                });
                                console.log(`[Technician Complete] Auto-generated first month invoice for ${user.name}`);
                            } catch (err) {
                                console.error(`[Technician Complete] Failed to generate first month invoice:`, err);
                            }
                        }
                        // Scenario B: Auto-Activate (Postpaid or No Payment Required)
                        else {
                            const { activateSubscription } = await import('@/lib/subscription');
                            try {
                                await activateSubscription(user.id);
                                // Status is set to ACTIVE inside activateSubscription
                                console.log(`[Technician Complete] Auto-activated subscription for ${user.name}`);
                            } catch (err) {
                                console.error(`[Technician Complete] Failed to activate subscription:`, err);
                            }
                        }
                    }
                }
            }

            // Create task report
            await prisma.taskReport.create({
                data: {
                    installationId: id,
                    technicianUserId: technicianId,
                    status,
                    description,
                    materialsUsed: materialsUsed || null,
                    timeSpent: timeSpent || null,
                    issuesFound: issuesFound || null,
                    recommendations: recommendations || null,
                    photos: photos || [],
                    approved: true, // Auto-approved per requirement
                }
            });

            return NextResponse.json({ success: true });
        }

        // Try maintenance task
        const maintenanceTask = await prisma.maintenanceTask.findFirst({
            where: {
                id,
                technicianUserId: technicianId,
            }
        });

        if (maintenanceTask) {
            // Update maintenance task status
            await prisma.maintenanceTask.update({
                where: { id },
                data: {
                    status: status === 'SUCCESS' ? 'COMPLETED' : status === 'FAILED' ? 'FAILED' : 'PENDING',
                    completedDate: new Date(),
                }
            });

            // Create task report
            await prisma.taskReport.create({
                data: {
                    maintenanceTaskId: id,
                    technicianUserId: technicianId,
                    status,
                    description,
                    materialsUsed: materialsUsed || null,
                    timeSpent: timeSpent || null,
                    issuesFound: issuesFound || null,
                    recommendations: recommendations || null,
                    photos: photos || [],
                    approved: true, // Auto-approved per requirement
                }
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json(
            { error: 'Task not found' },
            { status: 404 }
        );
    } catch (error: any) {
        console.error('Error completing task:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to complete task' },
            { status: 500 }
        );
    }
}

