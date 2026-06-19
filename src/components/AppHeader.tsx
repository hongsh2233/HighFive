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
        maxWidth: '1440px',
        width: '100%',
        margin: '0 auto',
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
        }}>
          TMS
        </Link>

        <nav style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {/* 업무 메뉴 */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => handleMenuEnter('task')}
            onMouseLeave={handleMenuLeave}
          >
            <button style={{
              background: 'none',
              color: openMenu === 'task' ? '#FFFFFF' : 'rgba(250,250,250,0.65)',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '5px',
              border: 'none',
              transition: 'color 0.15s',
            }}>
              업무
            </button>
            {openMenu === 'task' && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '7px',
                minWidth: '180px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                zIndex: 1000,
                animation: 'fadeIn 0.1s ease-out',
                padding: '4px',
              }}>
                {[
                  { href: '/tasks/create', label: '업무 등록' },
                  { href: '/tasks', label: '업무 목록' },
                  { href: '/tasks/kanban', label: '칸반 보드' },
                  { href: '/calendar', label: '캘린더' },
                ].map((item) => (
                  <Link key={item.href} href={item.href} style={{
                    display: 'block',
                    padding: '7px 10px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    borderRadius: '5px',
                    transition: 'background 0.1s',
                  }}
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
          {['ADMIN', 'PLANNER'].includes(user?.role || '') && (
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => handleMenuEnter('admin')}
              onMouseLeave={handleMenuLeave}
            >
              <button style={{
                background: 'none',
                color: openMenu === 'admin' ? '#FFFFFF' : 'rgba(250,250,250,0.65)',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '5px',
                border: 'none',
                transition: 'color 0.15s',
              }}>
                관리
              </button>
              {openMenu === 'admin' && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '7px',
                  minWidth: '160px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  zIndex: 1000,
                  animation: 'fadeIn 0.1s ease-out',
                  padding: '4px',
                }}>
                  {user?.role === 'ADMIN' && (
                    <Link href="/users" style={{
                      display: 'block',
                      padding: '7px 10px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      borderRadius: '5px',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      사용자 관리
                    </Link>
                  )}
                  <Link href="/stats" style={{
                    display: 'block',
                    padding: '7px 10px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    borderRadius: '5px',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    통계
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 프로필 */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => handleMenuEnter('profile')}
            onMouseLeave={handleMenuLeave}
          >
            <button style={{
              background: 'none',
              color: openMenu === 'profile' ? '#FFFFFF' : 'rgba(250,250,250,0.65)',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '5px',
              border: 'none',
              transition: 'color 0.15s',
            }}>
              {user?.name}
            </button>
            {openMenu === 'profile' && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '7px',
                minWidth: '160px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                zIndex: 1000,
                animation: 'fadeIn 0.1s ease-out',
                padding: '4px',
              }}>
                <Link href="/profile/password" style={{
                  display: 'block',
                  padding: '7px 10px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  borderRadius: '5px',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  비밀번호 변경
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 10px',
                    color: 'var(--danger)',
                    fontSize: '13px',
                    borderRadius: '5px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
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
