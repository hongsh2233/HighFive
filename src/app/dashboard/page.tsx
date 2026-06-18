'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--space-16)', textAlign: 'center', color: 'var(--color-gray-500)', fontSize: '14px', fontWeight: '500' }}>
        로딩 중...
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-8)',
    maxWidth: '1400px',
    margin: '0 auto',
    animation: 'fadeIn 0.3s ease-out',
  };

  const welcomeBannerStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
    color: 'white',
    padding: 'var(--space-6) var(--space-8)',
    borderRadius: '16px',
    marginBottom: 'var(--space-8)',
    boxShadow: 'var(--shadow-lg)',
    position: 'relative',
    overflow: 'hidden',
  };

  const welcomeTitleStyle: React.CSSProperties = {
    fontSize: '26px',
    fontWeight: '800',
    marginBottom: 'var(--space-2)',
    color: 'white',
    letterSpacing: '-0.02em',
  };

  const welcomeSubtitleStyle: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '14px',
    fontWeight: '500',
    margin: 0,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--color-gray-900)',
    marginBottom: 'var(--space-4)',
    letterSpacing: '-0.01em',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const cardGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-8)',
  };

  const getActionCardStyle = (name: string): React.CSSProperties => {
    const isHovered = hoveredCard === name;
    return {
      display: 'flex',
      flexDirection: 'column',
      padding: 'var(--space-5)',
      backgroundColor: 'var(--color-white)',
      border: isHovered ? '1px solid var(--color-primary)' : '1px solid var(--color-gray-200)',
      borderRadius: '12px',
      textDecoration: 'none',
      color: 'inherit',
      boxShadow: isHovered ? 'var(--shadow-lg), var(--shadow-glow)' : 'var(--shadow-sm)',
      transform: isHovered ? 'translateY(-2px)' : 'none',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  const emptyStateStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: 'var(--space-12) var(--space-6)',
    backgroundColor: 'var(--color-white)',
    borderRadius: '16px',
    border: '1px solid var(--color-gray-200)',
    boxShadow: 'var(--shadow-sm)',
    marginBottom: 'var(--space-8)',
  };

  return (
    <div style={containerStyle}>
      {/* 웰컴 배너 */}
      <div style={welcomeBannerStyle}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={welcomeTitleStyle}>안녕하세요, {user?.name}님 👋</h1>
          <p style={welcomeSubtitleStyle}>
            {user?.role === 'ADMIN' && '👑 최고 관리자'}
            {user?.role === 'PLANNER' && '🎨 서비스 기획자'}
            {user?.role === 'WORKER' && '💻 작업 담당자'}
            {' '}계정으로 로그인되었습니다. 오늘 배정된 업무를 확인해보세요.
          </p>
        </div>
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* 관리자 퀵링크 */}
      {user?.role === 'ADMIN' && (
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={sectionTitleStyle}>👥 관리 기능</h2>
          <div style={cardGridStyle}>
            <Link
              href="/users"
              style={getActionCardStyle('admin_users')}
              onMouseEnter={() => setHoveredCard('admin_users')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <span style={{ fontSize: '24px', marginBottom: '8px' }}>👥</span>
              <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--color-gray-900)' }}>팀 사용자 관리</span>
              <span style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>사용자 초대 및 역할 수정</span>
            </Link>
          </div>
        </div>
      )}

      {/* 기획자/관리자 퀵링크 */}
      {['ADMIN', 'PLANNER'].includes(user?.role || '') && (
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={sectionTitleStyle}>⚙️ 주요 기획 관리</h2>
          <div style={cardGridStyle}>
            <Link
              href="/tasks"
              style={getActionCardStyle('planner_tasks')}
              onMouseEnter={() => setHoveredCard('planner_tasks')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <span style={{ fontSize: '24px', marginBottom: '8px' }}>📋</span>
              <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--color-gray-900)' }}>업무 목록 관리</span>
              <span style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>업무 배정 및 현황 조회</span>
            </Link>
            <Link
              href="/tasks/kanban"
              style={getActionCardStyle('planner_kanban')}
              onMouseEnter={() => setHoveredCard('planner_kanban')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <span style={{ fontSize: '24px', marginBottom: '8px' }}>📈</span>
              <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--color-gray-900)' }}>칸반 보드</span>
              <span style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>드래그앤드롭 업무 흐름 관리</span>
            </Link>
            <Link
              href="/calendar"
              style={getActionCardStyle('planner_calendar')}
              onMouseEnter={() => setHoveredCard('planner_calendar')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <span style={{ fontSize: '24px', marginBottom: '8px' }}>📅</span>
              <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--color-gray-900)' }}>배포 캘린더</span>
              <span style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>목표 배포 일정 및 마일스톤</span>
            </Link>
            <Link
              href="/stats"
              style={getActionCardStyle('planner_stats')}
              onMouseEnter={() => setHoveredCard('planner_stats')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <span style={{ fontSize: '24px', marginBottom: '8px' }}>📊</span>
              <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--color-gray-900)' }}>생산성 통계</span>
              <span style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>작업자 부하량 및 통계 리포트</span>
            </Link>
          </div>
        </div>
      )}

      {/* 나의 업무 섹션 */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ ...sectionTitleStyle, margin: 0 }}>📋 나의 배정 업무</h2>
          <Link
            href="/tasks/create"
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '13px',
              boxShadow: 'var(--shadow-sm)',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; }}
          >
            ➕ 새 업무 등록
          </Link>
        </div>
        
        <div style={emptyStateStyle}>
          <div style={{ fontSize: '40px', marginBottom: 'var(--space-3)' }}>✨</div>
          <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-gray-900)', marginBottom: 'var(--space-1)' }}>
            현재 활성화된 업무가 없습니다.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', margin: 0 }}>
            상단 메뉴를 통해 새 업무를 등록하거나, 배정된 업무를 칸반 보드에서 확인해 보세요.
          </p>
        </div>
      </div>

      {/* 최근 활동 기록 */}
      <div>
        <h2 style={sectionTitleStyle}>🔔 최근 동향</h2>
        <div style={{ ...emptyStateStyle, padding: 'var(--space-8) var(--space-6)' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', margin: 0 }}>
            현재 표시할 신규 알림이나 활동 로그가 없습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
