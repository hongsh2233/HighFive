'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        로딩 중...
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-8)',
    maxWidth: '1440px',
    margin: '0 auto',
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: 'var(--space-8)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: 'var(--space-2)',
  };

  const subtitleStyle: React.CSSProperties = {
    color: 'var(--color-gray-600)',
    fontSize: '14px',
  };



  const emptyStateStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: 'var(--space-12)',
    backgroundColor: 'var(--color-white)',
    borderRadius: '8px',
    border: '1px solid var(--color-gray-300)',
  };

  const emptyIconStyle: React.CSSProperties = {
    fontSize: '48px',
    marginBottom: 'var(--space-4)',
  };

  const adminLinkStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: 'var(--space-3) var(--space-4)',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '14px',
    marginRight: 'var(--space-2)',
    marginBottom: 'var(--space-2)',
  };

  const plannerLinkStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: 'var(--space-3) var(--space-4)',
    backgroundColor: '#F59E0B',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '14px',
    marginRight: 'var(--space-2)',
    marginBottom: 'var(--space-2)',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          안녕하세요, {user?.name}님
        </h1>
        <p style={subtitleStyle}>
          {user?.role === 'ADMIN' && '관리자'}
          {user?.role === 'PLANNER' && '기획자'}
          {user?.role === 'WORKER' && '작업자'}
          {' '}계정입니다.
        </p>
      </div>

      {user?.role === 'ADMIN' && (
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: 'var(--space-4)' }}>
            관리 기능
          </h2>
          <div>
            <Link href="/users" style={adminLinkStyle}>
              👥 팀 사용자 관리
            </Link>
          </div>
        </div>
      )}

      {user?.role === 'PLANNER' && (
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: 'var(--space-4)' }}>
            기획자 기능
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <Link href="/tasks" style={plannerLinkStyle}>
              📋 업무 배정
            </Link>
            <Link href="/stats" style={plannerLinkStyle}>
              📊 통계 조회
            </Link>
            <Link href="/tasks/kanban" style={plannerLinkStyle}>
              📈 칸반 보드
            </Link>
            <Link href="/calendar" style={plannerLinkStyle}>
              📅 캘린더
            </Link>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: 'var(--space-4)' }}>
          나의 업무
        </h2>
        <div style={emptyStateStyle}>
          <div style={emptyIconStyle}>📋</div>
          <p style={{ fontSize: '16px', fontWeight: '600', marginBottom: 'var(--space-2)' }}>
            배정된 업무가 없습니다.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-gray-600)' }}>
            기획자에게 업무 배정을 요청하거나 새 업무를 만들어보세요.
          </p>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: 'var(--space-4)' }}>
          최근 활동
        </h2>
        <div style={emptyStateStyle}>
          <p style={{ fontSize: '13px', color: 'var(--color-gray-600)' }}>
            최근 활동 기록이 없습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
