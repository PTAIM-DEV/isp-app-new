import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { whatsappVoucherService } from '@/lib/services/whatsapp-voucher-service';
import { hotspotVoucherService } from '@/lib/services/hotspot-voucher-service';

async function checkAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  if (!session) return false;
  const adminPass = await prisma.systemSetting.findUnique({
    where: { key: 'admin_password' }
  });
  if (!adminPass) { return false; }
  return session.value === adminPass.value;
}

/**
 * POST /api/admin/hotspot/vouchers/[id]/send-whatsapp
 * Send voucher via WhatsApp
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required field: phoneNumber' },
        { status: 400 }
      );
    }

    // Check voucher exists
    const voucher = await prisma.hotspotVoucher.findUnique({
      where: { id }
    });

    if (!voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    }

    // Sync voucher to MikroTik if not already synced
    if (!voucher.syncedToMikrotik) {
      try {
        await hotspotVoucherService.syncVoucherToMikrotik(id);
      } catch (syncError: any) {
        return NextResponse.json(
          { 
            error: 'Failed to sync voucher to MikroTik before sending',
            details: syncError.message 
          },
          { status: 500 }
        );
      }
    }

    // Send voucher via WhatsApp
    await whatsappVoucherService.sendVoucher(id, phoneNumber);

    return NextResponse.json({ success: true, message: 'Voucher sent via WhatsApp' });
  } catch (error: any) {
    console.error('Error sending voucher via WhatsApp:', error);
    return NextResponse.json(
      { error: 'Failed to send voucher via WhatsApp', details: error.message },
      { status: 500 }
    );
  }
}


