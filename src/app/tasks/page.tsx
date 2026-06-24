'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTask';
import axios from 'axios';
import styles from './tasks.module.css';

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
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

  const toggleNotes = (id: number) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
    return <div className={styles.loadingPage}>로딩 중...</div>;
  }

  // statusChipStyle kept inline — dynamic per status + active
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

  // badgeStyle kept inline — dynamic per status
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
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>업무 목록</h1>
        <span className={styles.pageCount}>
          총 {filteredTasks.length}건
        </span>
      </div>

      {/* 필터 바 */}
      <div className={styles.filterBar}>
        <span className={styles.filterLabel}>
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
          className={styles.workerSelect}
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
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={`${styles.th} ${styles.thId}`}>ID</th>
              <th className={styles.th}>제목</th>
              <th className={`${styles.th} ${styles.thAssignee}`}>담당자</th>
              <th className={`${styles.th} ${styles.thStatus}`}>상태</th>
              <th className={`${styles.th} ${styles.thCreatedAt}`}>등록일자</th>
              <th className={`${styles.th} ${styles.thTarget}`}>목표일</th>
              <th className={styles.th}>비고</th>
              <th className={`${styles.th} ${styles.thHours}`}>작업시간</th>
              <th className={`${styles.th} ${styles.thChange}`}>상태변경</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className={styles.tdCenter}>
                  로딩 중...
                </td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.tdCenter}>
                  {tasks.length === 0 ? '등록된 업무가 없습니다.' : '필터 조건에 맞는 업무가 없습니다.'}
                </td>
              </tr>
            ) : (
              filteredTasks.flatMap((task) => {
                const hasNotes = !!task.notes && task.notes.trim() !== '' && task.notes.trim() !== '<p><br></p>';
                const isExpanded = expandedNotes.has(task.id);
                return [
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
                  <td className={styles.tdId}>#{task.id}</td>
                  <td className={styles.td}>
                    <div className={styles.titleCell}>
                      <span>{task.title}</span>
                      {hasNotes && (
                        <button
                          className={`${styles.notesToggleBtn} ${isExpanded ? styles.notesToggleBtnActive : ''}`}
                          onClick={(e) => { e.stopPropagation(); toggleNotes(task.id); }}
                        >
                          {isExpanded ? '접기 ▲' : '상세보기 ▼'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className={styles.td}>{task.worker?.name || '-'}</td>
                  <td className={styles.td}>
                    <span style={badgeStyle(task.status)}>
                      {statusLabels[task.status]}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {task.createdAt
                      ? new Date(task.createdAt).toLocaleDateString('ko-KR')
                      : '-'}
                  </td>
                  <td className={styles.td}>
                    {task.targetDate
                      ? new Date(task.targetDate).toLocaleDateString('ko-KR')
                      : '-'}
                  </td>
                  <td className={styles.tdNotes}>
                    {hasNotes ? '✓' : '-'}
                  </td>
                  <td className={styles.tdHours}>
                    {calculateWorkHours(task.timeLogs || [])}
                  </td>
                  <td className={styles.td}>
                    <select
                      value={task.status}
                      onChange={(e) => updateStatus(task.id, e.target.value)}
                      className={styles.statusSelect}
                    >
                      <option value="ASSIGNED">배정됨</option>
                      <option value="PROGRESS">진행중</option>
                      <option value="REVIEW">검수</option>
                      <option value="QA">QA</option>
                      <option value="DONE">완료</option>
                    </select>
                  </td>
                </tr>,
                isExpanded && hasNotes && (
                  <tr key={`notes-${task.id}`} className={styles.notesRow}>
                    <td colSpan={9} className={styles.notesCell}>
                      <div
                        className={styles.notesContent}
                        dangerouslySetInnerHTML={{ __html: task.notes ?? '' }}
                      />
                    </td>
                  </tr>
                ),
              ];
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
