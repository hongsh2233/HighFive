'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTask';

const statusColors: { [key: string]: { bg: string; text: string } } = {
  ASSIGNED: { bg: '#DBEAFE', text: '#1E40AF' },
  PROGRESS: { bg: '#FEF3C7', text: '#92400E' },
  REVIEW: { bg: '#EDE9FE', text: '#5B21B6' },
  QA: { bg: '#CFFAFE', text: '#155E75' },
  DONE: { bg: '#D1FAE5', text: '#065F46' },
};

const statusLabels: { [key: string]: string } = {
  ASSIGNED: '배정됨',
  PROGRESS: '진행중',
  REVIEW: '검수',
  QA: 'QA',
  DONE: '완료',
};

export default function TaskListPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { tasks, total, page, setPage, limit, loading, error, updateStatus } =
    useTasks();
  const [selectedStatus, setSelectedStatus] = useState('');

  if (authLoading) {
    return <div style={{ padding: 'var(--space-8)' }}>로딩 중...</div>;
  }

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-8)',
    maxWidth: '1440px',
    margin: '0 auto',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-8)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '700',
  };

  const filterBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-6)',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-white)',
    borderRadius: '8px',
    border: '1px solid var(--color-gray-300)',
  };

  const selectStyle: React.CSSProperties = {
    padding: 'var(--space-2) var(--space-3)',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '6px',
    fontSize: '14px',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'var(--color-white)',
    borderRadius: '8px',
    border: '1px solid var(--color-gray-300)',
    overflow: 'hidden',
  };

  const thStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-primary-dark)',
    color: 'white',
    padding: 'var(--space-3)',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  };

  const tdStyle: React.CSSProperties = {
    padding: 'var(--space-3)',
    borderBottom: '1px solid var(--color-gray-100)',
  };

  const badgeStyle = (status: string): React.CSSProperties => {
    const color = statusColors[status] || { bg: '#E5E7EB', text: '#374151' };
    return {
      display: 'inline-block',
      padding: 'var(--space-1) var(--space-2)',
      backgroundColor: color.bg,
      color: color.text,
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
    };
  };

  const paginationStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    marginTop: 'var(--space-8)',
  };

  const buttonStyle: React.CSSProperties = {
    padding: 'var(--space-2) var(--space-3)',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>업무 목록</h1>
      </div>

      <div style={filterBarStyle}>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={selectStyle}
        >
          <option value="">모든 상태</option>
          <option value="ASSIGNED">배정됨</option>
          <option value="PROGRESS">진행중</option>
          <option value="REVIEW">검수</option>
          <option value="QA">QA</option>
          <option value="DONE">완료</option>
        </select>
      </div>

      {error && (
        <div
          style={{
            padding: 'var(--space-3)',
            backgroundColor: '#FEF2F2',
            border: '1px solid var(--color-danger)',
            borderRadius: '6px',
            color: '#7F1D1D',
            marginBottom: 'var(--space-4)',
          }}
        >
          {error}
        </div>
      )}

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>제목</th>
            <th style={thStyle}>담당자</th>
            <th style={thStyle}>상태</th>
            <th style={thStyle}>목표일</th>
            <th style={thStyle}>작업</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} style={{ ...tdStyle, textAlign: 'center' }}>
                로딩 중...
              </td>
            </tr>
          ) : tasks.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ ...tdStyle, textAlign: 'center' }}>
                업무가 없습니다.
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr key={task.id} style={{ ':hover': { backgroundColor: 'var(--color-primary-light)' } }}>
                <td style={tdStyle}>#{task.id}</td>
                <td style={tdStyle}>{task.title}</td>
                <td style={tdStyle}>{task.worker?.name || '-'}</td>
                <td style={tdStyle}>
                  <span style={badgeStyle(task.status)}>
                    {statusLabels[task.status]}
                  </span>
                </td>
                <td style={tdStyle}>
                  {task.targetDate
                    ? new Date(task.targetDate).toLocaleDateString('ko-KR')
                    : '-'}
                </td>
                <td style={tdStyle}>
                  <select
                    value={task.status}
                    onChange={(e) => updateStatus(task.id, e.target.value)}
                    style={{
                      padding: 'var(--space-1) var(--space-2)',
                      fontSize: '12px',
                      border: '1px solid var(--color-gray-300)',
                      borderRadius: '4px',
                    }}
                  >
                    <option value="ASSIGNED">배정됨</option>
                    <option value="PROGRESS">진행중</option>
                    <option value="REVIEW">검수</option>
                    <option value="QA">QA</option>
                    <option value="DONE">완료</option>
                  </select>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {!loading && totalPages > 1 && (
        <div style={paginationStyle}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            style={{ ...buttonStyle, opacity: page === 1 ? 0.5 : 1 }}
          >
            이전
          </button>
          <span style={{ padding: 'var(--space-2) var(--space-3)' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            style={{ ...buttonStyle, opacity: page === totalPages ? 0.5 : 1 }}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
