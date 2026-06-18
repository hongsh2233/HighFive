'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import { useState, useRef } from 'react';

type MenuName = 'task' | 'admin' | 'profile' | null;

export default function AppHeader() {
  const router = useRouter();
  const { user } = useAuth();
  const [openMenu, setOpenMenu] = useState<MenuName>(null);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMenuEnter = (menu: MenuName) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    setOpenMenu(menu);
  };

  const handleMenuLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setOpenMenu(null);
    }, 150);
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: 'white',
    padding: '14px var(--space-6)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), inset 0 -1px 0 rgba(255, 255, 255, 0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const logoStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: '800',
    textDecoration: 'none',
    color: 'white',
    fontFamily: 'var(--font-display)',
    letterSpacing: '-0.03em',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'linear-gradient(to right, #818CF8, #C7D2FE)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };

  const navStyle: React.CSSProperties = {
    display: 'flex',
    gap: 'var(--space-2)',
    alignItems: 'center',
  };

  const menuGroupStyle: React.CSSProperties = {
    position: 'relative',
  };

  const getMenuButtonStyle = (name: string, isOpen: boolean): React.CSSProperties => {
    const isHovered = hoveredButton === name || isOpen;
    return {
      background: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'none',
      border: 'none',
      color: isHovered ? 'white' : 'rgba(255, 255, 255, 0.8)',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      padding: '8px 16px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  const submenuStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: 'white',
    border: '1px solid var(--color-gray-200)',
    borderRadius: '12px',
    marginTop: '10px',
    minWidth: '200px',
    boxShadow: 'var(--shadow-xl)',
    zIndex: 1000,
    animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    padding: '6px',
  };

  const getSubmenuItemStyle = (itemId: string): React.CSSProperties => {
    const isHovered = hoveredItem === itemId;
    return {
      display: 'block',
      padding: '10px 14px',
      color: isHovered ? 'var(--color-primary)' : 'var(--color-gray-700)',
      backgroundColor: isHovered ? 'var(--color-primary-light)' : 'transparent',
      textDecoration: 'none',
      fontSize: '13px',
      fontWeight: '500',
      borderRadius: '8px',
      transition: 'all 0.15s ease',
      border: 'none',
      width: '100%',
      textAlign: 'left',
      cursor: 'pointer',
    };
  };

  return (
    <header style={headerStyle}>
      <div style={containerStyle}>
        <Link href="/dashboard" style={logoStyle}>
          📊 TMS
        </Link>

        <nav style={navStyle}>
          {/* 업무 메뉴 */}
          <div
            style={menuGroupStyle}
            onMouseEnter={() => handleMenuEnter('task')}
            onMouseLeave={handleMenuLeave}
          >
            <button
              style={getMenuButtonStyle('task', openMenu === 'task')}
              onMouseEnter={() => setHoveredButton('task')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              📋 업무 <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
            </button>
            {openMenu === 'task' && (
              <div style={submenuStyle}>
                <Link
                  href="/tasks/create"
                  style={getSubmenuItemStyle('task_create')}
                  onMouseEnter={() => setHoveredItem('task_create')}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  ➕ 업무 등록
                </Link>
                <Link
                  href="/tasks"
                  style={getSubmenuItemStyle('task_list')}
                  onMouseEnter={() => setHoveredItem('task_list')}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  📊 업무 목록
                </Link>
                <Link
                  href="/tasks/kanban"
                  style={getSubmenuItemStyle('task_kanban')}
                  onMouseEnter={() => setHoveredItem('task_kanban')}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  📈 칸반 보드
                </Link>
                <Link
                  href="/calendar"
                  style={getSubmenuItemStyle('task_calendar')}
                  onMouseEnter={() => setHoveredItem('task_calendar')}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  📅 캘린더
                </Link>
              </div>
            )}
          </div>

          {/* 관리 메뉴 */}
          {['ADMIN', 'PLANNER'].includes(user?.role || '') && (
            <div
              style={menuGroupStyle}
              onMouseEnter={() => handleMenuEnter('admin')}
              onMouseLeave={handleMenuLeave}
            >
              <button
                style={getMenuButtonStyle('admin', openMenu === 'admin')}
                onMouseEnter={() => setHoveredButton('admin')}
                onMouseLeave={() => setHoveredButton(null)}
              >
                ⚙️ 관리 <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
              </button>
              {openMenu === 'admin' && (
                <div style={submenuStyle}>
                  {user?.role === 'ADMIN' && (
                    <Link
                      href="/users"
                      style={getSubmenuItemStyle('admin_users')}
                      onMouseEnter={() => setHoveredItem('admin_users')}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      👥 사용자 관리
                    </Link>
                  )}
                  <Link
                    href="/stats"
                    style={getSubmenuItemStyle('admin_stats')}
                    onMouseEnter={() => setHoveredItem('admin_stats')}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    📊 통계
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 프로필/로그아웃 */}
          <div
            style={menuGroupStyle}
            onMouseEnter={() => handleMenuEnter('profile')}
            onMouseLeave={handleMenuLeave}
          >
            <button
              style={getMenuButtonStyle('profile', openMenu === 'profile')}
              onMouseEnter={() => setHoveredButton('profile')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              👤 {user?.name} <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
            </button>
            {openMenu === 'profile' && (
              <div style={submenuStyle}>
                <Link
                  href="/profile/password"
                  style={getSubmenuItemStyle('profile_pw')}
                  onMouseEnter={() => setHoveredItem('profile_pw')}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  🔐 비밀번호 변경
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    ...getSubmenuItemStyle('profile_logout'),
                    color: 'var(--color-danger)',
                  }}
                  onMouseEnter={() => setHoveredItem('profile_logout')}
                  onMouseLeave={() => setHoveredItem(null)}
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
