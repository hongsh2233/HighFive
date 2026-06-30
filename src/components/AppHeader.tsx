'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import { useState, useRef } from 'react';
import styles from './AppHeader.module.css';

type MenuName = 'task' | 'admin' | 'account' | null;

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [openMenu, setOpenMenu] = useState<MenuName>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMenuEnter = (menu: MenuName) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setOpenMenu(menu);
  };

  const handleMenuLeave = () => {
    closeTimeoutRef.current = setTimeout(() => setOpenMenu(null), 150);
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const closeAll = () => {
    setOpenMenu(null);
    setMobileOpen(false);
  };

  const navClass = (active: boolean) => active ? styles.navLinkActive : styles.navLink;
  const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(user?.role || '');

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/dashboard" className={styles.logo}>High5</Link>

        <button
          className={styles.mobileToggle}
          aria-label="메뉴 열기"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span className={styles.mobileToggleBar} />
          <span className={styles.mobileToggleBar} />
          <span className={styles.mobileToggleBar} />
        </button>

        <nav className={`${styles.nav} ${mobileOpen ? styles.navOpen : ''}`}>
          <Link href="/info" className={navClass(pathname === '/info')} onClick={closeAll}>
            정보
          </Link>

          {/* 업무 메뉴 */}
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

          {/* 관리 메뉴 */}
          {isAdminOrManager && (
            <div
              className={styles.menuWrapper}
              onMouseEnter={() => handleMenuEnter('admin')}
              onMouseLeave={handleMenuLeave}
            >
              <button
                className={navClass(openMenu === 'admin' || pathname.startsWith('/users') || pathname.startsWith('/stats') || pathname.startsWith('/projects'))}
                onClick={() => setOpenMenu(openMenu === 'admin' ? null : 'admin')}
              >
                관리
              </button>
              {openMenu === 'admin' && (
                <div className={`${styles.dropdown} ${styles.dropdownRight}`}>
                  <Link href="/projects" className={styles.dropdownItem} onClick={closeAll}>프로젝트</Link>
                  {user?.role === 'ADMIN' && (
                    <Link href="/users" className={styles.dropdownItem} onClick={closeAll}>팀원관리</Link>
                  )}
                  <Link href="/stats" className={styles.dropdownItem} onClick={closeAll}>통계</Link>
                </div>
              )}
            </div>
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
              {user?.name}
            </button>
            {openMenu === 'account' && (
              <div className={`${styles.dropdown} ${styles.dropdownRight}`}>
                <div className={styles.accountHeader}>
                  <div className={styles.accountName}>{user?.name}</div>
                  <div className={styles.accountEmail}>{user?.email}</div>
                </div>
                <Link href="/profile/password" className={styles.dropdownItem} onClick={closeAll}>비밀번호 변경</Link>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/calendar/ical-url');
                      const json = await res.json();
                      await navigator.clipboard.writeText(json.data.url);
                      alert('캘린더 구독 URL이 복사되었습니다.\nGoogle Calendar → 다른 캘린더 → URL로 추가에 붙여넣기 하세요.');
                    } catch {
                      alert('복사에 실패했습니다.');
                    }
                    closeAll();
                  }}
                  className={styles.dropdownItem}
                >
                  캘린더 구독 URL 복사
                </button>
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
