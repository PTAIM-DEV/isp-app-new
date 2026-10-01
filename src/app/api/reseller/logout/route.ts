import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('reseller_session');
    
    if (session) {
      // Delete session from database
      const sessions = await prisma.systemSetting.findMany({
        where: {
          key: { startsWith: 'reseller_session_' }
        }
      });

      for (const sessionData of sessions) {
        try {
          const { token } = JSON.parse(sessionData.value);
          if (token === session.value) {
            await prisma.systemSetting.delete({
              where: { key: sessionData.key }
            });
            break;
          }
        } catch (e) {
          // Skip invalid session data
        }
      }

      // Delete cookie
      cookieStore.delete('reseller_session');
    }

    // Redirect to login page
    return NextResponse.redirect(new URL('/reseller-login', request.url));
  } catch (error: any) {
    console.error('Reseller logout error:', error);
    return NextResponse.redirect(new URL('/reseller-login', request.url));
  }
}

