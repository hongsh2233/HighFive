import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export function useAuth(requiredRole?: string) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const lastOrgSlug = useAuthStore((s) => s.user?.organizationSlug);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(lastOrgSlug ? `/${lastOrgSlug}/login` : '/login');
    } else if (requiredRole && session?.user?.role !== requiredRole) {
      if (requiredRole === 'ADMIN' || requiredRole === 'LEADER') {
        // ADMIN, LEADER 권한 필요하지만 없으면 대시보드로
        if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'LEADER') {
          router.push('/dashboard');
        }
      }
    }
  }, [status, session, requiredRole, router, lastOrgSlug]);

  return {
    user: session?.user || null,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    isSuperAdmin: (session?.user as any)?.role === 'SUPERADMIN',
    logout: () => {
      const slug = (session?.user as any)?.organizationSlug || lastOrgSlug;
      signOut({ redirect: true, callbackUrl: slug ? `/${slug}/login` : '/login' });
    },
  };
}
