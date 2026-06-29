'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './AppHeader.module.css';

type MenuName = 'task' | 'admin' | 'account' | 'bell' | null;

interface UserNotification {
  id: number;
  taskId: number | null;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [openMenu, setOpenMenu] = useState<MenuName>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const json = await res.json();
      setNotifications(json.data.notifications.slice(0, 10));
      setUnreadCount(json.data.unreadCount);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleReadAll = async () => {
    await fetch('/api/notifications/read-all', { method: 'PATCH' });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

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

  const navClass = (active: boolean) => active ? styles.navLinkActive : styles.navLink;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/dashboard" className={styles.logo}>TMS</Link>

        <nav className={styles.nav}>
          <Link href="/info" className={navClass(pathname === '/info')}>
            정보
          </Link>

          {/* 업무 메뉴 */}
          <div
            className={styles.menuWrapper}
            onMouseEnter={() => handleMenuEnter('task')}
            onMouseLeave={handleMenuLeave}
          >
            <button className={navClass(openMenu === 'task' || pathname.startsWith('/tasks') || pathname.startsWith('/calendar'))}>
              업무
            </button>
            {openMenu === 'task' && (
              <div className={`${styles.dropdown} ${styles.dropdownLeft}`}>
                {[
                  { href: '/tasks/create', label: '업무 등록' },
                  { href: '/tasks', label: '업무 목록' },
                  { href: '/tasks/kanban', label: '칸반 보드' },
                  { href: '/calendar', label: '캘린더' },
                ].map((item) => (
                  <Link key={item.href} href={item.href} className={styles.dropdownItem}>
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 관리 메뉴 */}
          {['ADMIN', 'MANAGER'].includes(user?.role || '') && (
            <div
              className={styles.menuWrapper}
              onMouseEnter={() => handleMenuEnter('admin')}
              onMouseLeave={handleMenuLeave}
            >
              <button className={navClass(openMenu === 'admin' || pathname.startsWith('/users') || pathname.startsWith('/stats') || pathname.startsWith('/projects'))}>
                관리
              </button>
              {openMenu === 'admin' && (
                <div className={`${styles.dropdown} ${styles.dropdownLeft}`}>
                  <Link href="/projects" className={styles.dropdownItem}>프로젝트</Link>
                  {user?.role === 'ADMIN' && (
                    <Link href="/users" className={styles.dropdownItem}>사용자 관리</Link>
                  )}
                  <Link href="/stats" className={styles.dropdownItem}>통계</Link>
                </div>
              )}
            </div>
          )}

          {/* 알림 벨 */}
          <div
            className={styles.menuWrapper}
            onMouseEnter={() => handleMenuEnter('bell')}
            onMouseLeave={handleMenuLeave}
          >
            <button className={`${styles.navLink} ${styles.bellBtn}`} aria-label="알림">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span className={styles.bellBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>
            {openMenu === 'bell' && (
              <div className={`${styles.dropdown} ${styles.dropdownRight} ${styles.bellDropdown}`}>
                <div className={styles.bellHeader}>
                  <span className={styles.accountName}>알림</span>
                  {unreadCount > 0 && (
                    <button onClick={handleReadAll} className={styles.readAllBtn}>모두 읽음</button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className={styles.bellEmpty}>알림이 없습니다.</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`${styles.bellItem} ${n.isRead ? '' : styles.bellItemUnread}`}
                      onClick={() => {
                        if (n.taskId) router.push(`/tasks/${n.taskId}`);
                        setOpenMenu(null);
                      }}
                    >
                      <div className={styles.bellMsg}>{n.message}</div>
                      <div className={styles.bellTime}>{new Date(n.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 계정 메뉴 */}
          <div
            className={styles.menuWrapper}
            onMouseEnter={() => handleMenuEnter('account')}
            onMouseLeave={handleMenuLeave}
          >
            <button className={navClass(openMenu === 'account')}>{user?.name}</button>
            {openMenu === 'account' && (
              <div className={`${styles.dropdown} ${styles.dropdownRight}`}>
                <div className={styles.accountHeader}>
                  <div className={styles.accountName}>{user?.name}</div>
                  <div className={styles.accountEmail}>{user?.email}</div>
                </div>
                <Link href="/profile/password" className={styles.dropdownItem}>비밀번호 변경</Link>
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
                    setOpenMenu(null);
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
