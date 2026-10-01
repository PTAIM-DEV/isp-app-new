import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
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
 * POST /api/admin/hotspot/vouchers/[id]/activate
 * Activate voucher (sync to MikroTik)
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

    const voucher = await prisma.hotspotVoucher.findUnique({
      where: { id }
    });

    if (!voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    }

    // Activate voucher (will sync to MikroTik)
    const activatedVoucher = await hotspotVoucherService.activateVoucher(voucher.code);

    return NextResponse.json({ voucher: activatedVoucher });
  } catch (error: any) {
    console.error('Error activating voucher:', error);
    return NextResponse.json(
      { error: 'Failed to activate voucher', details: error.message },
      { status: 500 }
    );
  }
}


