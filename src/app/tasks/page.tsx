'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTask';
import Link from 'next/link';
import axios from 'axios';

const statusColors: { [key: string]: { bg: string; text: string; border: string } } = {
  ASSIGNED: { bg: 'var(--color-primary-light)', text: 'var(--color-primary)', border: 'rgba(88, 80, 236, 0.2)' },
  PROGRESS: { bg: 'var(--color-warning-light)', text: 'var(--color-warning-dark)', border: 'rgba(245, 158, 11, 0.2)' },
  REVIEW: { bg: 'var(--color-info-light)', text: 'var(--color-info-dark)', border: 'rgba(6, 182, 212, 0.2)' },
  QA: { bg: 'var(--color-danger-light)', text: 'var(--color-danger-dark)', border: 'rgba(239, 68, 68, 0.2)' },
  DONE: { bg: 'var(--color-success-light)', text: 'var(--color-success-dark)', border: 'rgba(16, 185, 129, 0.2)' },
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
    return (
      <div style={{ padding: 'var(--space-16)', textAlign: 'center', color: 'var(--color-gray-500)' }}>
        로딩 중...
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-8)',
    maxWidth: '100%',
    margin: '0 auto',
    animation: 'fadeIn 0.3s ease-out',
  };

  const filterBarStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-6)',
    padding: 'var(--space-4) var(--space-5)',
    backgroundColor: 'var(--color-white)',
    borderRadius: '12px',
    border: '1px solid var(--color-gray-200)',
    boxShadow: 'var(--shadow-sm)',
    alignItems: 'center',
  };

  const statusChipStyle = (active: boolean, status: string): React.CSSProperties => {
    const activeColor = statusColors[status];
    return {
      padding: '6px 14px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      border: '1px solid',
      borderColor: active ? activeColor.text : 'var(--color-gray-300)',
      backgroundColor: active ? activeColor.bg : 'white',
      color: active ? activeColor.text : 'var(--color-gray-500)',
      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
      outline: 'none',
    };
  };

  const selectStyle: React.CSSProperties = {
    padding: '8px 14px',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    marginLeft: 'auto',
    backgroundColor: 'white',
    outline: 'none',
    cursor: 'pointer',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'var(--color-white)',
  };

  const thStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-gray-50)',
    color: 'var(--color-gray-600)',
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    borderBottom: '2px solid var(--color-gray-200)',
  };

  const tdStyle: React.CSSProperties = {
    padding: '14px 16px',
    borderBottom: '1px solid var(--color-gray-100)',
    fontSize: '14px',
  };

  const badgeStyle = (status: string): React.CSSProperties => {
    const color = statusColors[status] || { bg: '#E5E7EB', text: '#374151', border: 'transparent' };
    return {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      backgroundColor: color.bg,
      color: color.text,
      border: `1px solid ${color.border}`,
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '700',
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
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>업무 목록</h1>
        </div>
        <span style={{ fontSize: '13px', color: 'var(--color-gray-500)', fontWeight: 600 }}>
          총 {filteredTasks.length}건
        </span>
      </div>

      {/* 필터 바 */}
      <div style={filterBarStyle}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-gray-700)', marginRight: 'var(--space-2)' }}>
          상태 필터:
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {ALL_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              style={statusChipStyle(selectedStatuses.includes(status), status)}
            >
              {statusLabels[status]}
            </button>
          ))}
        </div>

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
          padding: '12px 16px',
          backgroundColor: 'var(--color-danger-light)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          color: 'var(--color-danger-dark)',
          marginBottom: 'var(--space-4)',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--color-gray-200)', boxShadow: 'var(--shadow-sm)' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '70px' }}>ID</th>
              <th style={thStyle}>제목</th>
              <th style={{ ...thStyle, width: '120px' }}>담당자</th>
              <th style={{ ...thStyle, width: '100px' }}>상태</th>
              <th style={{ ...thStyle, width: '120px' }}>등록일자</th>
              <th style={{ ...thStyle, width: '120px' }}>목표일</th>
              <th style={thStyle}>비고</th>
              <th style={{ ...thStyle, width: '130px' }}>작업시간</th>
              <th style={{ ...thStyle, width: '120px' }}>상태변경</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-gray-500)' }}>
                  업무 정보를 로딩하고 있습니다...
                </td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-gray-500)' }}>
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
                    backgroundColor: task.status === 'DONE' ? 'var(--color-gray-50)' : draggedTask?.id === task.id ? 'var(--color-primary-light)' : 'white',
                    cursor: 'grab',
                    opacity: draggedTask?.id === task.id ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (draggedTask?.id !== task.id) {
                      e.currentTarget.style.backgroundColor = 'rgba(88, 80, 236, 0.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (draggedTask?.id !== task.id) {
                      e.currentTarget.style.backgroundColor = task.status === 'DONE' ? 'var(--color-gray-50)' : 'white';
                    }
                  }}
                >
                  <td style={{ ...tdStyle, color: 'var(--color-gray-400)', fontWeight: '600' }}>#{task.id}</td>
                  <td style={tdStyle}>
                    <Link
                      href={`/tasks/${task.id}`}
                      style={{
                        color: 'var(--color-primary)',
                        fontWeight: '600',
                        textDecoration: 'none',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary-dark)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-primary)'; }}
                    >
                      {task.title}
                    </Link>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: '500' }}>{task.worker?.name || '-'}</td>
                  <td style={tdStyle}>
                    <span style={badgeStyle(task.status)}>
                      {statusLabels[task.status]}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--color-gray-500)' }}>
                    {task.createdAt
                      ? new Date(task.createdAt).toLocaleDateString('ko-KR')
                      : '-'}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--color-gray-500)' }}>
                    {task.targetDate
                      ? new Date(task.targetDate).toLocaleDateString('ko-KR')
                      : '-'}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--color-gray-600)', fontSize: '13px' }}>
                    {task.notes || '-'}
                  </td>
                  <td style={{ ...tdStyle, fontSize: '13px', fontWeight: '700', color: 'var(--color-primary)' }}>
                    {calculateWorkHours(task.timeLogs || [])}
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={task.status}
                      onChange={(e) => updateStatus(task.id, e.target.value)}
                      style={{
                        padding: '6px 8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        border: '1px solid var(--color-gray-300)',
                        borderRadius: '6px',
                        width: '100%',
                        backgroundColor: 'white',
                        outline: 'none',
                        cursor: 'pointer',
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
