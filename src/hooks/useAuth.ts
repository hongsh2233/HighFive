import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuth(requiredRole?: string) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (requiredRole && session?.user?.role !== requiredRole) {
      if (requiredRole === 'ADMIN' || requiredRole === 'PLANNER') {
        // ADMIN, PLANNER 권한 필요하지만 없으면 대시보드로
        if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'PLANNER') {
          router.push('/dashboard');
        }
      }
    }
  }, [status, session, requiredRole, router]);

  return {
    user: session?.user as any,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    logout: () => signOut({ redirect: true, callbackUrl: '/login' }),
  };
}
