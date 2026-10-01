import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Home, CreditCard, DollarSign, TrendingUp, LogOut, User } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getReseller() {
  const cookieStore = await cookies();
  const session = cookieStore.get('reseller_session');
  
  if (!session) {
    return null;
  }

  // Find reseller by session token
  const sessions = await prisma.systemSetting.findMany({
    where: {
      key: { startsWith: 'reseller_session_' }
    }
  });

  for (const sessionData of sessions) {
    try {
      const { token } = JSON.parse(sessionData.value);
      if (token === session.value) {
        const resellerId = sessionData.key.replace('reseller_session_', '');
        
        const user = await prisma.user.findUnique({
          where: { id: resellerId },
          select: { 
            id: true, 
            name: true, 
            role: true, 
            status: true,
            phone: true,
            email: true
          }
        });

        if (user && user.role === 'RESELLER' && user.status === 'ACTIVE') {
          return user;
        }
      }
    } catch (e) {
      // Skip invalid session data
    }
  }

  return null;
}

export default async function ResellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const reseller = await getReseller();

  // If no reseller, redirect to login (but login page has its own layout)
  if (!reseller) {
    redirect('/reseller-login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Reseller Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <User className="w-4 h-4 inline mr-1" />
                {reseller.name}
              </div>
              <form action="/api/reseller/logout" method="POST">
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 bg-white rounded-lg shadow mr-6 p-4">
            <nav className="space-y-1">
              <ResellerNavLink href="/reseller/dashboard" icon={Home}>
                Dashboard
              </ResellerNavLink>
              <ResellerNavLink href="/reseller/vouchers" icon={CreditCard}>
                Vouchers
              </ResellerNavLink>
              <ResellerNavLink href="/reseller/sales" icon={DollarSign}>
                Penjualan
              </ResellerNavLink>
              <ResellerNavLink href="/reseller/komisi" icon={TrendingUp}>
                Komisi
              </ResellerNavLink>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function ResellerNavLink({ 
  href, 
  icon: Icon, 
  children 
}: { 
  href: string; 
  icon: any; 
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <Icon className="w-5 h-5 mr-3" />
      {children}
    </Link>
  );
}

