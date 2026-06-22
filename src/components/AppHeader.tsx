'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import { useState, useRef } from 'react';

type MenuName = 'task' | 'admin' | 'account' | null;

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [openMenu, setOpenMenu] = useState<MenuName>(null);
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

  const navLinkStyle = (active: boolean): React.CSSProperties => ({
    color: active ? '#FFFFFF' : 'rgba(250,250,250,0.65)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: '5px',
    border: 'none',
    background: 'none',
    textDecoration: 'none',
    display: 'inline-block',
    transition: 'color 0.15s',
  });

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '7px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    zIndex: 1000,
    animation: 'fadeIn 0.1s ease-out',
    padding: '4px',
    minWidth: '160px',
  };

  const dropdownItemStyle: React.CSSProperties = {
    display: 'block',
    padding: '7px 10px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    borderRadius: '5px',
    textDecoration: 'none',
  };

  return (
    <header style={{
      backgroundColor: 'var(--header-bg)',
      color: 'var(--header-text)',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        width: '100%',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Link href="/dashboard" style={{
          fontSize: '15px',
          fontWeight: '700',
          color: 'var(--header-text)',
          letterSpacing: '-0.01em',
          textDecoration: 'none',
        }}>
          TMS
        </Link>

        <nav style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {/* 정보 — 직접 링크 */}
          <Link
            href="/info"
            style={navLinkStyle(pathname === '/info')}
          >
            정보
          </Link>

          {/* 업무 메뉴 */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => handleMenuEnter('task')}
            onMouseLeave={handleMenuLeave}
          >
            <button style={navLinkStyle(openMenu === 'task' || pathname.startsWith('/tasks') || pathname.startsWith('/calendar'))}>
              업무
            </button>
            {openMenu === 'task' && (
              <div style={{ ...dropdownStyle, left: 0 }}>
                {[
                  { href: '/tasks/create', label: '업무 등록' },
                  { href: '/tasks', label: '업무 목록' },
                  { href: '/tasks/kanban', label: '칸반 보드' },
                  { href: '/calendar', label: '캘린더' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={dropdownItemStyle}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 관리 메뉴 */}
          {['ADMIN', 'MANAGER'].includes(user?.role || '') && (
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => handleMenuEnter('admin')}
              onMouseLeave={handleMenuLeave}
            >
              <button style={navLinkStyle(openMenu === 'admin' || pathname.startsWith('/users') || pathname.startsWith('/stats') || pathname.startsWith('/projects'))}>
                관리
              </button>
              {openMenu === 'admin' && (
                <div style={{ ...dropdownStyle, left: 0 }}>
                  <Link
                    href="/projects"
                    style={dropdownItemStyle}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    프로젝트
                  </Link>
                  {user?.role === 'ADMIN' && (
                    <Link
                      href="/users"
                      style={dropdownItemStyle}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      팀원 관리
                    </Link>
                  )}
                  <Link
                    href="/stats"
                    style={dropdownItemStyle}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    통계
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 계정 메뉴 */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => handleMenuEnter('account')}
            onMouseLeave={handleMenuLeave}
          >
            <button style={navLinkStyle(openMenu === 'account')}>
              {user?.name}
            </button>
            {openMenu === 'account' && (
              <div style={{ ...dropdownStyle, right: 0 }}>
                <div style={{
                  padding: '8px 10px 6px',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: 4,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
                </div>
                <Link
                  href="/profile/password"
                  style={dropdownItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  비밀번호 변경
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    ...dropdownItemStyle,
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--danger)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
