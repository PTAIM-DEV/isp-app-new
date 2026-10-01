import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { whatsappVoucherService } from '@/lib/services/whatsapp-voucher-service';

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
 * POST /api/admin/hotspot/vouchers/batch-send-whatsapp
 * Send multiple vouchers via WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { voucherIds, phoneNumber } = body;

    if (!voucherIds || !Array.isArray(voucherIds) || voucherIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: voucherIds (array)' },
        { status: 400 }
      );
    }

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required field: phoneNumber' },
        { status: 400 }
      );
    }

    // Send vouchers via WhatsApp
    await whatsappVoucherService.sendVouchers(voucherIds, phoneNumber);

    return NextResponse.json({ 
      success: true, 
      message: `${voucherIds.length} vouchers sent via WhatsApp` 
    });
  } catch (error: any) {
    console.error('Error sending vouchers via WhatsApp:', error);
    return NextResponse.json(
      { error: 'Failed to send vouchers via WhatsApp', details: error.message },
      { status: 500 }
    );
  }
}


