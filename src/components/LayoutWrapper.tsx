'use client';

import { usePathname } from 'next/navigation';
import AppHeader from './AppHeader';

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const showHeader = !pathname.includes('/login');

  return (
    <div>
      {showHeader && <AppHeader />}
      {children}
    </div>
  );
}
