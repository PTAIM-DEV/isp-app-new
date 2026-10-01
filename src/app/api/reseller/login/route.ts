import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone dan password harus diisi' },
        { status: 400 }
      );
    }

    // Find user by phone with RESELLER role
    const user = await prisma.user.findFirst({
      where: {
        phone: phone,
        role: 'RESELLER',
        status: 'ACTIVE'
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Nomor telepon atau password salah' },
        { status: 401 }
      );
    }

    // Verify password
    if (!user.password) {
      return NextResponse.json(
        { error: 'Password belum diatur' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Nomor telepon atau password salah' },
        { status: 401 }
      );
    }

    // Generate session token
    const sessionToken = crypto.randomUUID();
    const sessionKey = `reseller_session_${user.id}`;
    
    // Store session in SystemSetting
    await prisma.systemSetting.upsert({
      where: { key: sessionKey },
      update: {
        value: JSON.stringify({ token: sessionToken, createdAt: new Date() })
      },
      create: {
        key: sessionKey,
        value: JSON.stringify({ token: sessionToken, createdAt: new Date() })
      }
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('reseller_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone
      }
    });
  } catch (error: any) {
    console.error('Reseller login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat login', details: error.message },
      { status: 500 }
    );
  }
}


