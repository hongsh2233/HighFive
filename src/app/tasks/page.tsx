'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTask';
import axios from 'axios';

const statusColors: { [key: string]: { bg: string; text: string; border: string } } = {
  ASSIGNED: { bg: 'transparent', text: '#1D4ED8', border: '#93C5FD' },
  PROGRESS: { bg: 'transparent', text: '#92400E', border: '#FCD34D' },
  REVIEW:   { bg: 'transparent', text: '#5B21B6', border: '#C4B5FD' },
  QA:       { bg: 'transparent', text: '#155E75', border: '#67E8F9' },
  DONE:     { bg: 'transparent', text: '#065F46', border: '#6EE7B7' },
};

const statusLabels: { [key: string]: string } = {
  ASSIGNED: '배정됨',
  PROGRESS: '진행중',
  REVIEW: '검수',
  QA: 'QA',
  DONE: '완료',
};

const ALL_STATUSES = ['ASSIGNED', 'PROGRESS', 'REVIEW', 'QA', 'DONE'];

// 작업시간 계산 함수
const calculateWorkHours = (timeLogs: any[]): string => {
  if (!timeLogs || timeLogs.length === 0) return '-';

  let totalMinutes = 0;

  timeLogs.forEach((log) => {
    if (!log.startTime) return;

    const start = new Date(log.startTime);
    const end = log.endTime ? new Date(log.endTime) : new Date();

    let startHour = start.getHours();
    let endHour = end.getHours();
    const startMin = start.getMinutes();
    const endMin = end.getMinutes();

    // 9시-18시 범위만 카운트
    startHour = Math.max(9, Math.min(startHour, 18));
    endHour = Math.max(9, Math.min(endHour, 18));

    if (startHour < endHour || (startHour === endHour && startMin < endMin)) {
      const minutes = (endHour - startHour) * 60 + (endMin - startMin);
      totalMinutes += minutes;
    }
  });

  // 최소 1시간
  if (totalMinutes < 60 && totalMinutes > 0) totalMinutes = 60;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return '-';
  return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
};

export default function TaskListPage() {
  const { isLoading: authLoading } = useAuth();
  const { tasks, loading, error, updateStatus } = useTasks({ limit: 1000 });

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    ALL_STATUSES.filter((s) => s !== 'DONE')
  );
  const [selectedWorker, setSelectedWorker] = useState('');
  const [workers, setWorkers] = useState<any[]>([]);
  const [draggedTask, setDraggedTask] = useState<any>(null);

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

  const handleDragStart = (e: React.DragEvent, task: any) => {
    setDraggedTask(task);
    e.dataTransfer!.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      updateStatus(draggedTask.id, newStatus);
      setDraggedTask(null);
    }
  };

  if (authLoading) {
    return <div style={{ padding: 'var(--space-8)' }}>로딩 중...</div>;
  }

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-8)',
    maxWidth: '100%',
    margin: '0 auto',
  };

  const filterBarStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-6)',
    padding: 'var(--space-3) var(--space-4)',
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    alignItems: 'center',
  };

  const statusChipStyle = (active: boolean, status: string): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    border: '2px solid',
    borderColor: active ? statusColors[status]?.text || '#374151' : 'var(--color-gray-300)',
    backgroundColor: active ? statusColors[status]?.bg || '#E5E7EB' : 'white',
    color: active ? statusColors[status]?.text || '#374151' : 'var(--color-gray-500)',
    transition: 'all 0.15s ease',
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
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    overflow: 'hidden',
  };

  const thStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-subtle)',
    color: 'var(--text-secondary)',
    padding: 'var(--space-2) var(--space-3)',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    borderBottom: '1px solid var(--border)',
  };

  const tdStyle: React.CSSProperties = {
    padding: 'var(--space-3)',
    borderBottom: '1px solid var(--color-gray-100)',
    fontSize: '14px',
  };

  const badgeStyle = (status: string): React.CSSProperties => {
    const color = statusColors[status] || { bg: 'transparent', text: '#374151', border: '#D4D4D8' };
    return {
      display: 'inline-block',
      padding: '3px 8px',
      backgroundColor: color.bg,
      color: color.text,
      border: `1px solid ${color.border}`,
      borderRadius: '4px',
      fontSize: '11px',
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

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '60px' }}>ID</th>
              <th style={thStyle}>제목</th>
              <th style={{ ...thStyle, width: '100px' }}>담당자</th>
              <th style={{ ...thStyle, width: '90px' }}>상태</th>
              <th style={{ ...thStyle, width: '110px' }}>등록일자</th>
              <th style={{ ...thStyle, width: '100px' }}>목표일</th>
              <th style={thStyle}>비고</th>
              <th style={{ ...thStyle, width: '120px' }}>작업시간</th>
              <th style={{ ...thStyle, width: '110px' }}>상태변경</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: 'var(--space-8)' }}>
                  로딩 중...
                </td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: 'var(--space-8)' }}>
                  {tasks.length === 0 ? '등록된 업무가 없습니다.' : '필터 조건에 맞는 업무가 없습니다.'}
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => (
                <tr
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, task.status)}
                  style={{
                    backgroundColor: task.status === 'DONE' ? '#F9FAFB' : draggedTask?.id === task.id ? '#F0F9FF' : 'white',
                    cursor: 'grab',
                    opacity: draggedTask?.id === task.id ? 0.6 : 1,
                    transition: 'background-color 0.2s',
                  }}
                >
                  <td style={{ ...tdStyle, color: 'var(--color-gray-500)' }}>#{task.id}</td>
                  <td style={tdStyle}>{task.title}</td>
                  <td style={tdStyle}>{task.worker?.name || '-'}</td>
                  <td style={tdStyle}>
                    <span style={badgeStyle(task.status)}>
                      {statusLabels[task.status]}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {task.createdAt
                      ? new Date(task.createdAt).toLocaleDateString('ko-KR')
                      : '-'}
                  </td>
                  <td style={tdStyle}>
                    {task.targetDate
                      ? new Date(task.targetDate).toLocaleDateString('ko-KR')
                      : '-'}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--color-gray-600)', fontSize: '13px' }}>
                    {task.notes || '-'}
                  </td>
                  <td style={{ ...tdStyle, fontSize: '13px', fontWeight: '600', color: 'var(--color-primary)' }}>
                    {calculateWorkHours(task.timeLogs || [])}
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={task.status}
                      onChange={(e) => updateStatus(task.id, e.target.value)}
                      style={{
                        padding: '6px 8px',
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
    </div>
  );
}
