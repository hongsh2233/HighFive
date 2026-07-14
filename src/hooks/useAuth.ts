import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

// 미인증 시 로그인 페이지로 보내는 책임은 middleware.ts(최초 접근 차단)와
// Providers.tsx의 AuthSync(세션 만료/로그아웃 시점 감지, 수동 로그아웃 플래그 존중)에 있다.
// 과거 이 훅에서도 별도로 리다이렉트를 시도해 AuthSync/AppHeader의 로그아웃 처리와 경합이 발생했다
// (Zustand 스토어의 organizationSlug가 로그아웃 처리 중 먼저 null로 지워지는 타이밍에 이 훅의
// 리다이렉트가 나중에 실행되면 슬러그 없는 /login으로 덮어써버리는 문제) — 그래서 여기서는 제거.
export function useAuth(requiredRole?: string) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const lastOrgSlug = useAuthStore((s) => s.user?.organizationSlug);

  useEffect(() => {
    if (requiredRole && session?.user?.role !== requiredRole) {
      if (requiredRole === 'ADMIN' || requiredRole === 'LEADER') {
        // ADMIN, LEADER 권한 필요하지만 없으면 대시보드로
        if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'LEADER') {
          router.push('/dashboard');
        }
      }
    }
  }, [session, requiredRole, router]);

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
