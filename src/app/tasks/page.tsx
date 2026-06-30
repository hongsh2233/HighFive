'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTask';
import styles from './tasks.module.css';

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
  const { user, isLoading: authLoading } = useAuth();
  const { tasks, loading, error, updateStatus, updateTask } = useTasks({ limit: 1000 });
  const canEditTitle = ['ADMIN', 'PLANNER'].includes((user as any)?.role ?? '');

  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
  const [titleDraft, setTitleDraft] = useState('');

  const startTitleEdit = (task: any) => {
    if (!canEditTitle) return;
    setEditingTitleId(task.id);
    setTitleDraft(task.title);
  };

  const cancelTitleEdit = () => {
    setEditingTitleId(null);
    setTitleDraft('');
  };

  const saveTitleEdit = async (id: number) => {
    const trimmed = titleDraft.trim();
    if (!trimmed) { cancelTitleEdit(); return; }
    try {
      await updateTask(id, { title: trimmed });
    } catch (err) {
      console.error(err);
    } finally {
      cancelTitleEdit();
    }
  };

  const toggleNotes = (id: number) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (id: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // 담당자 필터 목록: role=WORKER로 한정하지 않고, 실제로 업무에 배정된 담당자를 모두 노출
  const workers = Array.from(
    new Map(tasks.filter((t) => t.worker).map((t: any) => [t.worker.id, t.worker])).values()
  ).sort((a: any, b: any) => a.name.localeCompare(b.name));

  if (authLoading) {
    return <div className={styles.loadingPage}>로딩 중...</div>;
  }

  // 필터링
  let filteredTasks = tasks;
  if (selectedStatus) {
    filteredTasks = filteredTasks.filter((task) => task.status === selectedStatus);
  }
  if (selectedWorker) {
    filteredTasks = filteredTasks.filter((task) => task.workerId === parseInt(selectedWorker));
  }

  // 그룹/하위 업무 트리 구성: 최상위(부모 없는) 업무만 1차 행으로 노출, 하위 업무는 펼쳤을 때만 표시
  const childrenMap = new Map<number, any[]>();
  filteredTasks.forEach((task) => {
    if (task.parentTaskId) {
      const list = childrenMap.get(task.parentTaskId) || [];
      list.push(task);
      childrenMap.set(task.parentTaskId, list);
    }
  });
  const topLevelTasks = filteredTasks.filter((task) => !task.parentTaskId);

  const renderTaskRow = (
    task: any,
    opts: { isChild: boolean; isGroupRow: boolean; isGroupExpanded: boolean }
  ): React.ReactElement[] => {
    const { isChild, isGroupRow, isGroupExpanded } = opts;
    const hasNotes = !!task.notes && task.notes.trim() !== '' && task.notes.trim() !== '<p><br></p>';
    const isExpanded = expandedNotes.has(task.id);
    const rows: React.ReactElement[] = [
      <tr
        key={task.id}
        style={{
          backgroundColor: task.status === 'DONE' ? '#F9FAFB' : 'white',
        }}
      >
        <td className={styles.tdId}>#{task.id}</td>
        <td className={styles.td}>
          <div className={styles.titleCell} style={isChild ? { paddingLeft: '24px' } : undefined}>
            {isGroupRow && (
              <button
                type="button"
                className={styles.groupToggleBtn}
                onClick={(e) => { e.stopPropagation(); toggleGroup(task.id); }}
                aria-label={isGroupExpanded ? '하위 업무 접기' : '하위 업무 펼치기'}
              >
                {isGroupExpanded ? '−' : '+'}
              </button>
            )}
            {isChild && <span className={styles.childArrow}>↳</span>}
            {editingTitleId === task.id ? (
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => saveTitleEdit(task.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitleEdit(task.id);
                  if (e.key === 'Escape') cancelTitleEdit();
                }}
                onClick={(e) => e.stopPropagation()}
                className={styles.titleInput}
                autoFocus
              />
            ) : (
              <span
                className={styles.titleText}
                onDoubleClick={(e) => { e.stopPropagation(); startTitleEdit(task); }}
              >
                {task.title}
              </span>
            )}
          </div>
        </td>
        <td className={styles.td}>{task.worker?.name || '-'}</td>
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
          <div className={styles.notesBtns}>
            {isGroupRow ? (
              <button
                className={`${styles.notesToggleBtn} ${isGroupExpanded ? styles.notesToggleBtnActive : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleGroup(task.id); }}
              >
                {isGroupExpanded ? '하위업무 접기' : '하위업무 보기'}
              </button>
            ) : (
              hasNotes && (
                <button
                  className={`${styles.notesToggleBtn} ${isExpanded ? styles.notesToggleBtnActive : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleNotes(task.id); }}
                >
                  {isExpanded ? '접기' : '요약보기'}
                </button>
              )
            )}
            {!isGroupRow && (
              <Link href={`/tasks/${task.id}`} className={styles.detailBtn}>
                상세보기
              </Link>
            )}
            {!isChild && (
              <Link href={`/tasks/create?parentTaskId=${task.id}`} className={styles.addSubBtnSmall}>
                + 하위 업무
              </Link>
            )}
          </div>
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
    ];
    if (!isGroupRow && isExpanded && hasNotes) {
      rows.push(
        <tr key={`notes-${task.id}`} className={styles.notesRow}>
          <td colSpan={8} className={styles.notesCell}>
            <div
              className={styles.notesContent}
              dangerouslySetInnerHTML={{ __html: task.notes ?? '' }}
            />
          </td>
        </tr>
      );
    }
    return rows;
  };

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
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className={styles.statusFilterSelect}
        >
          <option value="">전체 상태</option>
          {ALL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>

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
              <th className={`${styles.th} ${styles.thCreatedAt}`}>등록일자</th>
              <th className={`${styles.th} ${styles.thTarget}`}>목표일</th>
              <th className={styles.th}>비고</th>
              <th className={`${styles.th} ${styles.thHours}`}>작업시간</th>
              <th className={`${styles.th} ${styles.thStatus}`}>상태</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className={styles.tdCenter}>
                  로딩 중...
                </td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.tdCenter}>
                  {tasks.length === 0 ? '등록된 업무가 없습니다.' : '필터 조건에 맞는 업무가 없습니다.'}
                </td>
              </tr>
            ) : (
              topLevelTasks.flatMap((task) => {
                const children = childrenMap.get(task.id) || [];
                const isGroupRow = task.isGroup || children.length > 0;
                const isGroupExpanded = expandedGroups.has(task.id);
                const rows = renderTaskRow(task, {
                  isChild: false,
                  isGroupRow,
                  isGroupExpanded,
                });
                if (isGroupRow && isGroupExpanded) {
                  children.forEach((child) => {
                    rows.push(...renderTaskRow(child, { isChild: true, isGroupRow: false, isGroupExpanded: false }));
                  });
                }
                return rows;
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
