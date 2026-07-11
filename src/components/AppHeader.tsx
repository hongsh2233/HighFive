'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { markManualLogout } from '@/lib/logout-flag';
import GlobalSearchModal from './GlobalSearchModal';
import styles from './AppHeader.module.css';

type MenuName = 'task' | 'settings' | 'account' | null;

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [openMenu, setOpenMenu] = useState<MenuName>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([
    'info', 'requests', 'wiki', 'tasks', 'search', 'stats', 'calendar_sync', 'integrations',
  ]);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!user) return;
    const role = (user as any)?.role;
    if (role === 'SUPERADMIN') return; // 시스템관리자는 모든 메뉴 항상 표시
    fetch('/api/plan-config')
      .then((r) => r.json())
      .then((d) => { if (d.success && d.data?.features) setEnabledFeatures(d.data.features); })
      .catch(() => {}); // 실패 시 기본값(전체 허용) 유지
  }, [user]);

  const has = (key: string) => enabledFeatures.includes(key);

  const handleMenuEnter = (menu: MenuName) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setOpenMenu(menu);
  };

  const handleMenuLeave = () => {
    closeTimeoutRef.current = setTimeout(() => setOpenMenu(null), 150);
  };

  const handleLogout = async () => {
    markManualLogout();
    await signOut({ redirect: false });
    router.push('/login');
  };

  const closeAll = () => {
    setOpenMenu(null);
    setMobileOpen(false);
  };

  const [orgName, setOrgName] = useState<string>('High5');
  const [orgLogo, setOrgLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!user || (user as any).role === 'SUPERADMIN') return;
    fetch('/api/settings/organization')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setOrgName(d.data.displayName || d.data.name || 'High5');
          setOrgLogo(d.data.logoUrl || null);
        }
      })
      .catch(() => {});
  }, [user]);

  const navClass = (active: boolean) => active ? styles.navLinkActive : styles.navLink;
  const isAdminOrLeader = ['ADMIN', 'LEADER'].includes(user?.role || '');
  const isSuperAdmin = (user as any)?.role === 'SUPERADMIN';

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/dashboard" className={styles.logo}>
          {orgLogo
            ? <img src={orgLogo} alt={orgName} className={styles.logoImg} />
            : <span>{isSuperAdmin ? 'High5' : orgName}</span>
          }
        </Link>

        <button
          className={styles.mobileToggle}
          aria-label="메뉴 열기"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span className={styles.mobileToggleBar} />
          <span className={styles.mobileToggleBar} />
          <span className={styles.mobileToggleBar} />
        </button>

        {searchOpen && <GlobalSearchModal onClose={() => setSearchOpen(false)} />}

        <nav className={`${styles.nav} ${mobileOpen ? styles.navOpen : ''}`}>
          {isSuperAdmin ? (
            <>
              <div
                className={styles.menuWrapper}
                onMouseEnter={() => handleMenuEnter('settings')}
                onMouseLeave={handleMenuLeave}
              >
                <button
                  className={navClass(openMenu === 'settings' || pathname.startsWith('/superadmin'))}
                  onClick={() => setOpenMenu(openMenu === 'settings' ? null : 'settings')}
                >
                  시스템관리자
                </button>
                {openMenu === 'settings' && (
                  <div className={`${styles.dropdown} ${styles.dropdownRight}`}>
                    <Link href="/superadmin" className={styles.dropdownItem} onClick={closeAll}>가입 현황</Link>
                    <Link href="/superadmin/plan-config" className={styles.dropdownItem} onClick={closeAll}>플랜 설정</Link>
                  </div>
                )}
              </div>
              <Link href="/announcements" className={navClass(pathname.startsWith('/announcements'))} onClick={closeAll}>
                공지사항
              </Link>
            </>
          ) : (
            <>
              {has('search') && (
                <button
                  className={styles.navLink}
                  onClick={() => setSearchOpen(true)}
                  title="전역 검색 (Ctrl+K)"
                >
                  검색
                </button>
              )}

              {has('tasks') && (
                <div
                  className={styles.menuWrapper}
                  onMouseEnter={() => handleMenuEnter('task')}
                  onMouseLeave={handleMenuLeave}
                >
                  <button
                    className={navClass(openMenu === 'task' || pathname.startsWith('/tasks') || pathname.startsWith('/calendar'))}
                    onClick={() => setOpenMenu(openMenu === 'task' ? null : 'task')}
                  >
                    업무
                  </button>
                  {openMenu === 'task' && (
                    <div className={`${styles.dropdown} ${styles.dropdownRight}`}>
                      {[
                        { href: '/tasks/create', label: '업무 등록' },
                        { href: '/tasks', label: '업무 목록' },
                        { href: '/tasks/kanban', label: '칸반 보드' },
                        { href: '/calendar', label: '캘린더' },
                      ].map((item) => (
                        <Link key={item.href} href={item.href} className={styles.dropdownItem} onClick={closeAll}>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {has('requests') && (
                <Link href="/requests" className={navClass(pathname.startsWith('/requests'))} onClick={closeAll}>
                  신청
                </Link>
              )}

              {has('info') && (
                <Link href="/info" className={navClass(pathname === '/info')} onClick={closeAll}>
                  정보
                </Link>
              )}

              {has('wiki') && (
                <Link href="/wiki" className={navClass(pathname === '/wiki' || pathname.startsWith('/projects/'))} onClick={closeAll}>
                  위키
                </Link>
              )}

              {isAdminOrLeader && (
                <div
                  className={styles.menuWrapper}
                  onMouseEnter={() => handleMenuEnter('settings')}
                  onMouseLeave={handleMenuLeave}
                >
                  <button
                    className={navClass(openMenu === 'settings' || pathname.startsWith('/users') || pathname.startsWith('/stats') || pathname.startsWith('/projects') || pathname.startsWith('/announcements') || pathname.startsWith('/settings'))}
                    onClick={() => setOpenMenu(openMenu === 'settings' ? null : 'settings')}
                  >
                    설정
                  </button>
                  {openMenu === 'settings' && (
                    <div className={`${styles.dropdown} ${styles.dropdownRight}`}>
                      {user?.role === 'ADMIN' && (
                        <Link href="/settings/organization" className={styles.dropdownItem} onClick={closeAll}>조직 설정</Link>
                      )}
                      <Link href="/projects" className={styles.dropdownItem} onClick={closeAll}>프로젝트</Link>
                      <Link href="/announcements" className={styles.dropdownItem} onClick={closeAll}>공지사항</Link>
                      {user?.role === 'ADMIN' && (
                        <Link href="/users" className={styles.dropdownItem} onClick={closeAll}>팀원관리</Link>
                      )}
                      {has('stats') && (
                        <Link href="/stats" className={styles.dropdownItem} onClick={closeAll}>통계</Link>
                      )}
                      {has('calendar_sync') && (
                        <Link href="/settings/calendar-sync" className={styles.dropdownItem} onClick={closeAll}>구글 캘린더 연동</Link>
                      )}
                      {user?.role === 'ADMIN' && has('integrations') && (
                        <Link href="/settings/integrations" className={styles.dropdownItem} onClick={closeAll}>외부연동</Link>
                      )}
                      {user?.role === 'ADMIN' && (
                        <Link href="/settings/audit" className={styles.dropdownItem} onClick={closeAll}>감사 로그</Link>
                      )}
                      <Link href="/settings/security" className={styles.dropdownItem} onClick={closeAll}>보안 설정</Link>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* 계정 메뉴 */}
          <div
            className={styles.menuWrapper}
            onMouseEnter={() => handleMenuEnter('account')}
            onMouseLeave={handleMenuLeave}
          >
            <button
              className={navClass(openMenu === 'account')}
              onClick={() => setOpenMenu(openMenu === 'account' ? null : 'account')}
            >
              마이페이지
            </button>
            {openMenu === 'account' && (
              <div className={`${styles.dropdown} ${styles.dropdownRight}`}>
                <div className={styles.accountHeader}>
                  <div className={styles.accountName}>{user?.name}</div>
                  <div className={styles.accountEmail}>{user?.email}</div>
                </div>
                <Link href="/my-notes" className={styles.dropdownItem} onClick={closeAll}>내 자료</Link>
                <Link href="/profile/password" className={styles.dropdownItem} onClick={closeAll}>비밀번호 변경</Link>
                <button
                  onClick={handleLogout}
                  className={`${styles.dropdownItem} ${styles.dropdownDanger}`}
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
