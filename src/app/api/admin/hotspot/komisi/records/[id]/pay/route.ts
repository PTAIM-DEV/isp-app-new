import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

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
 * POST /api/admin/hotspot/komisi/records/[id]/pay
 * Mark komisi as paid
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
    const { paymentNotes } = body;

    const record = await prisma.komisiRecord.findUnique({
      where: { id },
      include: {
        sale: true
      }
    });

    if (!record) {
      return NextResponse.json({ error: 'Komisi record not found' }, { status: 404 });
    }

    if (record.status === 'PAID') {
      return NextResponse.json(
        { error: 'Komisi already paid' },
        { status: 400 }
      );
    }

    // Update komisi record
    const updatedRecord = await prisma.komisiRecord.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentNotes: paymentNotes || null
      },
      include: {
        resellerUser: {
          select: {
            id: true,
            name: true
          }
        },
        sale: {
          include: {
            voucher: {
              select: {
                code: true
              }
            }
          }
        }
      }
    });

    // Update sale komisi status
    await prisma.voucherSale.update({
      where: { id: record.saleId },
      data: {
        komisiStatus: 'PAID',
        komisiPaidAt: new Date()
      }
    });

    return NextResponse.json({ record: updatedRecord });
  } catch (error: any) {
    console.error('Error marking komisi as paid:', error);
    return NextResponse.json(
      { error: 'Failed to mark komisi as paid', details: error.message },
      { status: 500 }
    );
  }
}


