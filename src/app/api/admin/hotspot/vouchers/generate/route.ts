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
 * POST /api/admin/hotspot/vouchers/generate
 * Generate vouchers
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      serverId,
      packageId,
      quantity,
      prefix,
      codeLength,
      combination,
      username,
      password,
      resellerUserId
    } = body;

    // Validate required fields
    if (!serverId || !packageId || !quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Missing required fields: serverId, packageId, quantity (min 1)' },
        { status: 400 }
      );
    }

    // Validate codeLength
    if (codeLength && (codeLength < 1 || codeLength > 10)) {
      return NextResponse.json(
        { error: 'codeLength must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Generate vouchers
    const vouchers = await hotspotVoucherService.generateVouchers(
      serverId,
      packageId,
      quantity,
      {
        prefix: prefix || '',
        codeLength: codeLength || 8,
        combination: combination || 'ALPHANUMERIC',
        username: username || false,
        password: password || false
      },
      resellerUserId
    );

    return NextResponse.json({ 
      vouchers,
      count: vouchers.length 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error generating vouchers:', error);
    return NextResponse.json(
      { error: 'Failed to generate vouchers', details: error.message },
      { status: 500 }
    );
  }
}


