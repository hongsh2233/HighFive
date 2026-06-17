'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

export default function AppHeader() {
  const router = useRouter();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };


  const headerStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    padding: 'var(--space-4)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '1440px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const logoStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: '700',
    textDecoration: 'none',
    color: 'white',
  };

  const navStyle: React.CSSProperties = {
    display: 'flex',
    gap: 'var(--space-6)',
    alignItems: 'center',
  };

  const menuGroupStyle: React.CSSProperties = {
    position: 'relative',
  };

  const menuButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 'var(--space-2) var(--space-3)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  };

  const submenuStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    backgroundColor: 'white',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '6px',
    marginTop: 'var(--space-2)',
    minWidth: '200px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1000,
  };

  const submenuItemStyle: React.CSSProperties = {
    display: 'block',
    padding: 'var(--space-3)',
    color: 'var(--color-gray-900)',
    textDecoration: 'none',
    fontSize: '14px',
    borderBottom: '1px solid var(--color-gray-100)',
    transition: 'background-color 0.2s',
  };

  return (
    <header style={headerStyle}>
      <div style={containerStyle}>
        {/* Logo */}
        <Link href="/dashboard" style={logoStyle}>
          📊 TMS
        </Link>

        {/* Navigation */}
        <nav style={navStyle}>
          {/* 업무 메뉴 */}
          <div style={menuGroupStyle}>
            <button
              style={menuButtonStyle}
              onMouseEnter={() => setMenuOpen(true)}
              onMouseLeave={() => setMenuOpen(false)}
            >
              📋 업무 ▼
            </button>
            {menuOpen && (
              <div
                style={submenuStyle}
                onMouseEnter={() => setMenuOpen(true)}
                onMouseLeave={() => setMenuOpen(false)}
              >
                <Link href="/tasks/create" style={submenuItemStyle}>
                  ➕ 업무 등록
                </Link>
                <Link href="/tasks" style={submenuItemStyle}>
                  📊 업무 목록
                </Link>
                <Link href="/tasks/kanban" style={submenuItemStyle}>
                  📈 칸반 보드
                </Link>
                <Link href="/calendar" style={submenuItemStyle}>
                  📅 캘린더
                </Link>
              </div>
            )}
          </div>

          {/* 관리 메뉴 */}
          {['ADMIN', 'PLANNER'].includes(user?.role || '') && (
            <div style={menuGroupStyle}>
              <button
                style={menuButtonStyle}
                onMouseEnter={() => setMenuOpen(true)}
                onMouseLeave={() => setMenuOpen(false)}
              >
                ⚙️ 관리 ▼
              </button>
              {menuOpen && (
                <div
                  style={submenuStyle}
                  onMouseEnter={() => setMenuOpen(true)}
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  {user?.role === 'ADMIN' && (
                    <Link href="/users" style={submenuItemStyle}>
                      👥 사용자 관리
                    </Link>
                  )}
                  <Link href="/stats" style={submenuItemStyle}>
                    📊 통계
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 프로필/로그아웃 */}
          <div style={menuGroupStyle}>
            <button
              style={menuButtonStyle}
              onMouseEnter={() => setMenuOpen(true)}
              onMouseLeave={() => setMenuOpen(false)}
            >
              👤 {user?.name} ▼
            </button>
            {menuOpen && (
              <div
                style={submenuStyle}
                onMouseEnter={() => setMenuOpen(true)}
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  onClick={handleLogout}
                  style={{
                    ...submenuItemStyle,
                    background: 'none',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--color-danger)',
                  }}
                >
                  🚪 로그아웃
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
