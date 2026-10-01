import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reseller Login',
  description: 'Login ke portal reseller',
};

// Login page doesn't use the reseller layout - standalone layout
export default function ResellerLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

