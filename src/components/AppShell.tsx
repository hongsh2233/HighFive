'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { markManualLogout } from '@/lib/logout-flag';
import TopSearch from './TopSearch';
import styles from './AppShell.module.css';

interface NavItem { href: string; label: string; icon: string }
interface NavGroup { key: string; label: string; icon: string; items: NavItem[] }

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([
    'info', 'requests', 'wiki', 'tasks', 'search', 'stats', 'calendar_sync', 'integrations',
  ]);
  const [knowledgeBaseMode, setKnowledgeBaseMode] = useState<'WIKI' | 'INFO'>('WIKI');
  const [orgName, setOrgName] = useState<string>('High5');
  const [orgLogo, setOrgLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const role = (user as any)?.role;
    if (role === 'SUPERADMIN') return;
    fetch('/api/plan-config')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.features) setEnabledFeatures(d.data.features);
        if (d.success && d.data?.knowledgeBaseMode) setKnowledgeBaseMode(d.data.knowledgeBaseMode);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user || (user as any).role === 'SUPERADMIN') return;
    fetch('/api/settings/organization')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setOrgName(d.data.displayName || d.data.name || 'High5');
          setOrgLogo(d.data.logoUrl || null);
        }
      })
      .catch(() => {});
  }, [user]);

  const has = (key: string) => {
    if (key === 'wiki') return enabledFeatures.includes('wiki') && knowledgeBaseMode === 'WIKI';
    if (key === 'info') return enabledFeatures.includes('info') && knowledgeBaseMode === 'INFO';
    return enabledFeatures.includes(key);
  };

  const handleLogout = async () => {
    markManualLogout();
    const slug = (user as any)?.organizationSlug;
    const isSuperAdminUser = (user as any)?.role === 'SUPERADMIN';
    await signOut({ redirect: false });
    router.push(isSuperAdminUser || !slug ? '/login' : `/${slug}/login`);
  };

  const isAdminOrLeader = ['ADMIN', 'LEADER'].includes(user?.role || '');
  const isSuperAdmin = (user as any)?.role === 'SUPERADMIN';
  const closeMobile = () => setMobileOpen(false);

  const groups: NavGroup[] = isSuperAdmin
    ? [
        {
          key: 'superadmin', label: '시스템관리자', icon: '🛠️', items: [
            { href: '/superadmin', label: '가입 현황', icon: '' },
            { href: '/superadmin/demo-requests', label: '데모 신청', icon: '' },
            { href: '/superadmin/plan-config', label: '플랜 설정', icon: '' },
          ],
        },
      ]
    : [
        ...(has('tasks') ? [{
          key: 'task', label: '업무', icon: '📋', items: [
            ...(isAdminOrLeader ? [{ href: '/tasks/create', label: '업무 등록', icon: '' }] : []),
            { href: '/tasks', label: '업무 목록', icon: '' },
            { href: '/tasks/kanban', label: '칸반 보드', icon: '' },
            { href: '/calendar', label: '캘린더', icon: '' },
          ],
        }] : []),
        ...((has('requests') || has('info') || has('wiki')) ? [{
          key: 'collab', label: '협업', icon: '🤝', items: [
            ...(has('requests') ? [{ href: '/requests', label: '신청(전자결재)', icon: '' }] : []),
            ...(has('wiki') ? [{ href: '/wiki', label: '위키', icon: '' }] : []),
            { href: '/meetings', label: '회의록', icon: '' },
            ...(has('info') ? [{ href: '/info', label: '정보(FAQ)', icon: '' }] : []),
          ],
        }] : []),
        {
          key: 'admin', label: '관리', icon: '🗂️', items: [
            ...(isAdminOrLeader ? [{ href: '/projects', label: '프로젝트', icon: '' }] : []),
            ...(isAdminOrLeader ? [{ href: '/inquiries', label: '문의 관리', icon: '' }] : []),
            { href: '/announcements', label: '공지/알림', icon: '' },
            ...(user?.role === 'ADMIN' ? [{ href: '/users', label: '팀원관리', icon: '' }] : []),
            ...(isAdminOrLeader && has('stats') ? [{ href: '/stats', label: '통계', icon: '' }] : []),
          ],
        },
        ...((user?.role === 'ADMIN' || has('integrations')) ? [{
          key: 'agent', label: '에이전트 관리', icon: '🔌', items: [
            ...(user?.role === 'ADMIN' ? [{ href: '/settings/ai', label: 'AI 설정', icon: '' }] : []),
            ...(has('integrations') ? [{ href: '/settings/integrations', label: '외부연동', icon: '' }] : []),
          ],
        }] : []),
        ...(user?.role === 'ADMIN' ? [{
          key: 'settings', label: '설정', icon: '⚙️', items: [
            { href: '/settings/organization', label: '조직 설정', icon: '' },
            { href: '/settings/audit', label: '감사 로그', icon: '' },
          ],
        }] : []),
      ];

  const isGroupActive = (group: NavGroup) => group.items.some((i) => pathname.startsWith(i.href));

  return (
    <div className={styles.shell}>
      <button className={styles.mobileToggle} aria-label="메뉴 열기" onClick={() => setMobileOpen((v) => !v)}>
        <span className={styles.mobileToggleBar} />
        <span className={styles.mobileToggleBar} />
        <span className={styles.mobileToggleBar} />
      </button>

      {mobileOpen && <div className={styles.mobileOverlay} onClick={closeMobile} />}

      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <Link href="/dashboard" className={styles.logo} onClick={closeMobile}>
          {orgLogo ? <img src={orgLogo} alt={orgName} className={styles.logoImg} /> : <span>{isSuperAdmin ? 'High5' : orgName}</span>}
        </Link>

        <nav className={styles.nav}>
          <Link href="/dashboard" className={pathname === '/dashboard' ? styles.navItemActive : styles.navItem} onClick={closeMobile}>
            <span className={styles.navIcon}>🏠</span>대시보드
          </Link>

          {isSuperAdmin && (
            <Link href="/announcements" className={pathname.startsWith('/announcements') ? styles.navItemActive : styles.navItem} onClick={closeMobile}>
              <span className={styles.navIcon}>📢</span>공지사항
            </Link>
          )}

          {groups.map((g) => (
            <div key={g.key} className={styles.navGroup}>
              <div className={`${styles.navGroupLabel} ${isGroupActive(g) ? styles.navGroupLabelActive : ''}`}>
                <span className={styles.navIcon}>{g.icon}</span>{g.label}
              </div>
              {g.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={pathname.startsWith(item.href) ? styles.navSubItemActive : styles.navSubItem}
                  onClick={closeMobile}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/my-notes" className={styles.navSubItem} onClick={closeMobile}>내 자료</Link>
          <Link href="/profile/password" className={styles.navSubItem} onClick={closeMobile}>비밀번호 변경</Link>
          <Link href="/settings/security" className={styles.navSubItem} onClick={closeMobile}>보안 설정</Link>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          {!isSuperAdmin && has('search') ? <TopSearch /> : <div />}

          <div className={styles.topbarRight}>
            <span className={styles.userName}>{user?.name}</span>
            <button onClick={handleLogout} className={styles.logoutBtn}>로그아웃</button>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
