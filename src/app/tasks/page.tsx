'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTask';
import axios from 'axios';

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

const ALL_STATUSES = ['ASSIGNED', 'PROGRESS', 'REVIEW', 'QA', 'DONE'];

export default function TaskListPage() {
  const { isLoading: authLoading } = useAuth();
  const { tasks, loading, error, updateStatus } = useTasks({ limit: 1000 });

  // 기본값: 완료 제외한 모든 상태 선택
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    ALL_STATUSES.filter((s) => s !== 'DONE')
  );
  const [selectedWorker, setSelectedWorker] = useState('');
  const [workers, setWorkers] = useState<any[]>([]);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const res = await axios.get('/api/users?role=WORKER');
      setWorkers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch workers:', err);
    }
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  if (authLoading) {
    return <div style={{ padding: 'var(--space-8)' }}>로딩 중...</div>;
  }

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-8)',
    maxWidth: '1440px',
    margin: '0 auto',
  };

  const filterBarStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-6)',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-white)',
    borderRadius: '8px',
    border: '1px solid var(--color-gray-300)',
    alignItems: 'center',
  };

  const statusChipStyle = (active: boolean, status: string): React.CSSProperties => ({
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    border: '2px solid',
    borderColor: active ? statusColors[status]?.text || '#374151' : 'var(--color-gray-300)',
    backgroundColor: active ? statusColors[status]?.bg || '#E5E7EB' : 'white',
    color: active ? statusColors[status]?.text || '#374151' : 'var(--color-gray-500)',
    transition: 'all 0.15s',
  });

  const selectStyle: React.CSSProperties = {
    padding: 'var(--space-2) var(--space-3)',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '6px',
    fontSize: '14px',
    marginLeft: 'auto',
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
  };

  const tdStyle: React.CSSProperties = {
    padding: 'var(--space-3)',
    borderBottom: '1px solid var(--color-gray-100)',
    fontSize: '14px',
  };

  const badgeStyle = (status: string): React.CSSProperties => {
    const color = statusColors[status] || { bg: '#E5E7EB', text: '#374151' };
    return {
      display: 'inline-block',
      padding: '2px 8px',
      backgroundColor: color.bg,
      color: color.text,
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
    };
  };

  // 필터링
  let filteredTasks = tasks;
  if (selectedStatuses.length > 0) {
    filteredTasks = filteredTasks.filter((task) => selectedStatuses.includes(task.status));
  }
  if (selectedWorker) {
    filteredTasks = filteredTasks.filter((task) => task.workerId === parseInt(selectedWorker));
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>업무 목록</h1>
        <span style={{ fontSize: '13px', color: 'var(--color-gray-600)' }}>
          총 {filteredTasks.length}건
        </span>
      </div>

      {/* 필터 바 */}
      <div style={filterBarStyle}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-gray-700)', marginRight: 'var(--space-2)' }}>
          상태:
        </span>
        {ALL_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => toggleStatus(status)}
            style={statusChipStyle(selectedStatuses.includes(status), status)}
          >
            {statusLabels[status]}
          </button>
        ))}

        <select
          value={selectedWorker}
          onChange={(e) => setSelectedWorker(e.target.value)}
          style={selectStyle}
        >
          <option value="">모든 담당자</option>
          {workers.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{
          padding: 'var(--space-3)',
          backgroundColor: '#FEF2F2',
          border: '1px solid var(--color-danger)',
          borderRadius: '6px',
          color: '#7F1D1D',
          marginBottom: 'var(--space-4)',
        }}>
          {error}
        </div>
      )}

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '60px' }}>ID</th>
            <th style={thStyle}>제목</th>
            <th style={{ ...thStyle, width: '100px' }}>담당자</th>
            <th style={{ ...thStyle, width: '90px' }}>상태</th>
            <th style={{ ...thStyle, width: '100px' }}>목표일</th>
            <th style={thStyle}>비고</th>
            <th style={{ ...thStyle, width: '110px' }}>상태변경</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: 'var(--space-8)' }}>
                로딩 중...
              </td>
            </tr>
          ) : filteredTasks.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: 'var(--space-8)' }}>
                {tasks.length === 0 ? '등록된 업무가 없습니다.' : '필터 조건에 맞는 업무가 없습니다.'}
              </td>
            </tr>
          ) : (
            filteredTasks.map((task) => (
              <tr key={task.id} style={{ backgroundColor: task.status === 'DONE' ? '#F9FAFB' : 'white' }}>
                <td style={{ ...tdStyle, color: 'var(--color-gray-500)' }}>#{task.id}</td>
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
                <td style={{ ...tdStyle, color: 'var(--color-gray-600)', fontSize: '13px' }}>
                  {task.notes || '-'}
                </td>
                <td style={tdStyle}>
                  <select
                    value={task.status}
                    onChange={(e) => updateStatus(task.id, e.target.value)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      border: '1px solid var(--color-gray-300)',
                      borderRadius: '4px',
                      width: '100%',
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
    </div>
  );
}
