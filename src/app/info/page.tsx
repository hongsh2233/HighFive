'use client';

import React from 'react';

export default function InfoPage() {
  const features = [
    {
      icon: '📋',
      title: '업무 관리',
      desc: '업무 생성, 배정, 상태 변경을 원클릭으로 처리합니다. RMS 번호는 제목에서 자동으로 파싱됩니다.',
    },
    {
      icon: '⏱️',
      title: '타임 트래킹',
      desc: '업무별 타이머를 시작/종료하여 공수를 정확하게 측정합니다. 수동 보정도 지원합니다.',
    },
    {
      icon: '📈',
      title: '칸반 보드',
      desc: 'ASSIGNED → PROGRESS → REVIEW → QA → DONE 5단계 칸반으로 전체 흐름을 한눈에 확인합니다.',
    },
    {
      icon: '📅',
      title: '배포 캘린더',
      desc: '목표 완료일 기준으로 업무를 캘린더에 시각화합니다. 배포 프리징 구간도 표시됩니다.',
    },
    {
      icon: '📊',
      title: '통계 리포트',
      desc: '작업자별 부하량, 월간 업무 완료율을 차트로 제공합니다. CSV/Excel 다운로드도 가능합니다.',
    },
    {
      icon: '🔔',
      title: 'Slack · 잔디 알림',
      desc: '검수 요청(REVIEW) 전환 시 Slack/잔디 Webhook으로 기획자에게 자동 알림을 발송합니다.',
    },
  ];

  const roles = [
    { label: '관리자', color: '#DC2626', bg: '#FEF2F2', desc: '전체 모니터링, 사용자 초대·관리, 데이터 내보내기' },
    { label: '기획자', color: '#7C3AED', bg: '#EDE9FE', desc: '업무 생성·배정, 검수 승인, 배포 일정 제어' },
    { label: '작업자', color: '#1D4ED8', bg: '#DBEAFE', desc: '배정 업무 확인, 타이머 작동, 상태 변경' },
  ];

  const statuses = [
    { code: 'ASSIGNED', label: '배정됨', bg: '#DBEAFE', text: '#1E40AF' },
    { code: 'PROGRESS', label: '진행중', bg: '#FEF3C7', text: '#92400E' },
    { code: 'REVIEW',   label: '검수중', bg: '#EDE9FE', text: '#5B21B6' },
    { code: 'QA',       label: 'QA',    bg: '#CFFAFE', text: '#155E75' },
    { code: 'DONE',     label: '완료',  bg: '#D1FAE5', text: '#065F46' },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1A56DB 0%, #1E3A8A 100%)',
        borderRadius: 16,
        padding: '40px 48px',
        color: '#fff',
        marginBottom: 40,
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>TMS</h1>
        <p style={{ fontSize: 15, opacity: 0.85, lineHeight: 1.7 }}>
          Task Management System — AI 웹 개발 비즈니스에 최적화된 경량 업무 관리 플랫폼입니다.<br />
          복잡한 협업 툴의 설정 피로 없이, 즉시 사용 가능한 Zero-Configuration 방식으로 설계되었습니다.
        </p>
        <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {['Next.js 15', 'Prisma', 'PostgreSQL', 'NextAuth.js', 'Zustand', 'MUI'].map((tag) => (
            <span key={tag} style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
            }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* 핵심 기능 */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 20 }}>핵심 기능</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {features.map((f) => (
            <div key={f.title} style={{
              background: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 사용자 역할 */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 20 }}>사용자 역할</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {roles.map((r) => (
            <div key={r.label} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              background: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              padding: '16px 20px',
            }}>
              <span style={{
                background: r.bg,
                color: r.color,
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>{r.label}</span>
              <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.6, margin: 0 }}>{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 업무 상태 흐름 */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 20 }}>업무 상태 흐름</h2>
        <div style={{
          background: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: 10,
          padding: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {statuses.map((s, i) => (
              <React.Fragment key={s.code}>
                <span style={{
                  background: s.bg,
                  color: s.text,
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                }}>{s.label}</span>
                {i < statuses.length - 1 && (
                  <span style={{ color: '#9CA3AF', fontSize: 18 }}>→</span>
                )}
              </React.Fragment>
            ))}
          </div>
          <p style={{ marginTop: 14, fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
            <strong style={{ color: '#5B21B6' }}>검수중(REVIEW)</strong> 전환 시 Slack · 잔디로 기획자에게 자동 알림이 발송됩니다.
          </p>
        </div>
      </section>

      {/* 버전 정보 */}
      <section>
        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E5E7EB',
          borderRadius: 10,
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: 13,
          color: '#6B7280',
        }}>
          <span>버전 <strong style={{ color: '#111827' }}>v2.0</strong></span>
          <span>스택 <strong style={{ color: '#111827' }}>Next.js 15 · Prisma · PostgreSQL</strong></span>
          <span>라이선스 <strong style={{ color: '#111827' }}>Private</strong></span>
        </div>
      </section>
    </div>
  );
}
