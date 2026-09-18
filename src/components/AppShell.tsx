'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { markManualLogout } from '@/lib/logout-flag';
import TopSearch from './TopSearch';
import NotificationBell from './NotificationBell';
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
  const [canManageCardExpense, setCanManageCardExpense] = useState(false);
  const [canManageLedger, setCanManageLedger] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!user || (user as any).role === 'SUPERADMIN' || ['ADMIN', 'LEADER'].includes(user?.role || '')) return;
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setCanManageCardExpense(!!d.data.canManageCardExpense);
          setCanManageLedger(!!d.data.canManageLedger);
        }
      })
      .catch(() => {});
  }, [user]);

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
          key: 'superadmin', label: '최고관리자', icon: '🛠️', items: [
            { href: '/superadmin', label: '가입 현황', icon: '' },
            { href: '/superadmin/demo-requests', label: '데모 신청', icon: '' },
            { href: '/superadmin/plan-config', label: '플랜 설정', icon: '' },
          ],
        },
      ]
    : [
        ...(has('tasks') ? [{
          key: 'task', label: '업무', icon: '📋', items: [
            { href: '/tasks', label: '업무 목록', icon: '' },
            { href: '/tasks/kanban', label: '칸반 보드', icon: '' },
            { href: '/calendar', label: '캘린더', icon: '' },
          ],
        }] : []),
        ...((isAdminOrLeader || has('info') || has('wiki')) ? [{
          key: 'collab', label: '프로젝트·협업', icon: '🤝', items: [
            ...(isAdminOrLeader ? [{ href: '/projects', label: '프로젝트', icon: '' }] : []),
            { href: '/meetings', label: '회의록', icon: '' },
            { href: '/weekly-reports', label: '주간보고', icon: '' },
            ...(has('wiki') ? [{ href: '/wiki', label: '지식베이스', icon: '' }] : []),
            ...(has('info') ? [{ href: '/info', label: '지식베이스', icon: '' }] : []),
          ],
        }] : []),
        ...((has('requests') || isAdminOrLeader || canManageCardExpense || canManageLedger) ? [{
          key: 'org', label: '조직 운영', icon: '🗂️', items: [
            ...(has('requests') ? [{ href: '/requests', label: '신청·결재', icon: '' }] : []),
            ...(isAdminOrLeader ? [{ href: '/inquiries', label: '문의', icon: '' }] : []),
            ...(isAdminOrLeader || canManageCardExpense || canManageLedger ? [{ href: '/expenses', label: '비용관리', icon: '' }] : []),
            { href: '/announcements', label: '공지사항', icon: '' },
          ],
        }] : []),
        ...(isAdminOrLeader && has('stats') ? [{
          key: 'analytics', label: '분석', icon: '📊', items: [
            { href: '/stats', label: '통계', icon: '' },
          ],
        }] : []),
        ...(user?.role === 'ADMIN' ? [{
          key: 'settings', label: '관리자 설정', icon: '⚙️', items: [
            { href: '/users', label: '팀원관리', icon: '' },
            { href: '/settings/organization', label: '조직 설정', icon: '' },
            { href: '/settings/approval-line', label: '결재선 설정', icon: '' },
            { href: '/settings/ai', label: 'AI 설정', icon: '' },
            ...(has('integrations') ? [{ href: '/settings/integrations', label: '외부연동', icon: '' }] : []),
            { href: '/settings/audit', label: '감사 로그', icon: '' },
          ],
        }] : []),
      ];

  const isGroupActive = (group: NavGroup) => group.items.some((i) => pathname.startsWith(i.href));

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (key: string) => setCollapsedGroups((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

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

        {!isSuperAdmin && isAdminOrLeader && has('tasks') && (
          <Link href="/tasks/create" className={styles.newTaskBtn} onClick={closeMobile}>
            <span>＋</span>새 업무
          </Link>
        )}

        <nav className={styles.nav}>
          <Link href="/dashboard" className={pathname === '/dashboard' ? styles.navItemActive : styles.navItem} onClick={closeMobile}>
            <span className={styles.navIcon}>🏠</span>대시보드
          </Link>

          {!isSuperAdmin && (
            <Link href="/manual" className={pathname.startsWith('/manual') ? styles.navItemActive : styles.navItem} onClick={closeMobile}>
              <span className={styles.navIcon}>📖</span>매뉴얼·도움말
            </Link>
          )}

          {isSuperAdmin && (
            <Link href="/announcements" className={pathname.startsWith('/announcements') ? styles.navItemActive : styles.navItem} onClick={closeMobile}>
              <span className={styles.navIcon}>📢</span>공지사항
            </Link>
          )}

          {groups.map((g) => {
            const collapsed = collapsedGroups.has(g.key);
            return (
              <div key={g.key} className={styles.navGroup}>
                <button
                  type="button"
                  className={`${styles.navGroupLabel} ${isGroupActive(g) ? styles.navGroupLabelActive : ''}`}
                  onClick={() => toggleGroup(g.key)}
                >
                  <span className={styles.navIcon}>{g.icon}</span>{g.label}
                  <span className={styles.navGroupChevron}>{collapsed ? '▶' : '▼'}</span>
                </button>
                {!collapsed && g.items.map((item) => (
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
            );
          })}
        </nav>

      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          {!isSuperAdmin && has('search') ? <TopSearch /> : <div />}

          <div className={styles.topbarRight}>
            {user && <NotificationBell />}
            <div className={styles.userMenu} ref={userMenuRef}>
              <button type="button" className={styles.userMenuTrigger} onClick={() => setUserMenuOpen((v) => !v)}>
                <span className={styles.userName}>{user?.name}</span>
                <span className={styles.userMenuChevron}>{userMenuOpen ? '▲' : '▼'}</span>
              </button>
              {userMenuOpen && (
                <div className={styles.userMenuDropdown}>
                  {!isSuperAdmin && (
                    <>
                      <Link href="/profile" className={styles.userMenuItem} onClick={() => setUserMenuOpen(false)}>내 프로필</Link>
                      <Link href="/my-notes" className={styles.userMenuItem} onClick={() => setUserMenuOpen(false)}>내 자료</Link>
                      <Link href="/settings/calendar-sync" className={styles.userMenuItem} onClick={() => setUserMenuOpen(false)}>캘린더 연동</Link>
                      <Link href="/profile/password" className={styles.userMenuItem} onClick={() => setUserMenuOpen(false)}>비밀번호 변경</Link>
                      <Link href="/settings/security" className={styles.userMenuItem} onClick={() => setUserMenuOpen(false)}>보안 설정</Link>
                      <div className={styles.userMenuDivider} />
                    </>
                  )}
                  <button type="button" className={styles.userMenuItem} onClick={handleLogout}>로그아웃</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
