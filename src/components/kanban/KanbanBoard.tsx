'use client';

import { useState, useEffect, useRef } from 'react';
import { Task } from '@/types';
import { useProjectStatuses } from '@/hooks/useProjectStatuses';
import KanbanColumn from './KanbanColumn';
import apiClient from '@/lib/api-client';
import styles from './KanbanBoard.module.css';
import Spinner from '@/components/common/Spinner';
import { loadHubTasks } from '@/hooks/useWorkHub';

interface Project {
  id: number;
  name: string;
  status: string;
}

interface KanbanBoardProps {
  onTaskClick?: (task: Task) => void;
  projectId?: number;
  onChanged?: () => void;
  hideProjectSelect?: boolean;
}

export default function KanbanBoard({ onTaskClick, projectId, onChanged, hideProjectSelect }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ? String(projectId) : '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const pending = useRef(new Set<number>());
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const { getStatuses, loading: statusesLoading, error: statusError } = useProjectStatuses(revision);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    setSelectedProjectId(projectId ? String(projectId) : '');
    const fetchAll = async () => {
      try {
        const [tasksRes, projectsRes] = await Promise.all([
          loadHubTasks(projectId, controller.signal),
          apiClient.get<{ data: Project[] }>('/projects', { signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        setTasks(tasksRes);
        setProjects(projectsRes.data.data.filter((p) => p.status === 'ACTIVE'));
      } catch (err) {
        if (controller.signal.aborted) return;
        setError('업무 보드를 불러오지 못했습니다.');
        console.error('Failed to load tasks:', err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchAll();
    return () => controller.abort();
  }, [projectId, revision]);

  const groupIds = new Set<number>();
  tasks.forEach((t) => {
    if (t.parentTaskId) groupIds.add(t.parentTaskId);
  });
  const isStandaloneGroup = (t: Task) => t.isGroup || groupIds.has(t.id);

  const selectedProjectIdNum = selectedProjectId ? parseInt(selectedProjectId) : null;
  const visibleTasks = tasks.filter((t) =>
    !isStandaloneGroup(t) && (selectedProjectIdNum === null || t.projectId === selectedProjectIdNum)
  );

  // 컬럼 구성: 프로젝트를 선택했으면 그 프로젝트의 상태 순서 그대로, 아니면 실제 사용 중인 상태를 모아 정렬
  type Column = { code: string; label: string; color: string | null };
  let columns: Column[];
  if (selectedProjectIdNum !== null) {
    columns = getStatuses(selectedProjectIdNum).map((s) => ({ code: s.code, label: s.label, color: s.color }));
  } else {
    const seen = new Map<string, Column & { order: number }>();
    visibleTasks.forEach((t) => {
      if (seen.has(t.status)) return;
      const def = getStatuses(t.projectId).find((s) => s.code === t.status);
      seen.set(t.status, {
        code: t.status,
        label: def?.label ?? t.status,
        color: def?.color ?? null,
        order: def?.order ?? 999,
      });
    });
    columns = Array.from(seen.values()).sort((a, b) => a.order - b.order || a.code.localeCompare(b.code));
  }

  // 컬럼 목록에 없는 상태값을 가진 업무(단계 삭제 등)는 "기타"로 모아 표시
  const knownCodes = new Set(columns.map((c) => c.code));
  const orphanTasks = visibleTasks.filter((t) => !knownCodes.has(t.status));
  if (orphanTasks.length > 0) {
    columns = [...columns, { code: '__OTHER__', label: '기타', color: null }];
  }

  const groupedTasks = columns.reduce(
    (acc, col) => {
      acc[col.code] = col.code === '__OTHER__'
        ? orphanTasks
        : visibleTasks.filter((task) => task.status === col.code);
      return acc;
    },
    {} as { [key: string]: Task[] }
  );

  const parentMap = new Map<number, Task>(tasks.map((t) => [t.id, t]));

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (targetStatus === '__OTHER__') return;
    const taskId = parseInt(e.dataTransfer.getData('taskId'));
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus || pending.current.has(taskId)) return;

    const targetDef = getStatuses(task.projectId).find((s) => s.code === targetStatus);
    if (!targetDef) { setError('이 업무의 프로젝트에는 해당 상태가 없습니다. 프로젝트를 선택한 후 변경하세요.'); return; }
    if (targetDef?.isProgress && task.hasIncompleteBlockers) {
      setError('선행 업무가 완료되지 않아 시작할 수 없습니다.');
      return;
    }

    pending.current.add(taskId); setPendingIds(new Set(pending.current));
    setTasks(current => current.map((t) => t.id === taskId ? { ...t, status: targetStatus } : t));

    try {
      await apiClient.patch(`/tasks/${taskId}/status`, { status: targetStatus });
      setError('');
      onChanged?.();
    } catch (err) {
      console.error('Failed to update task status:', err);
      setError('상태 변경에 실패하여 이전 상태로 되돌렸습니다. 권한과 승인 조건을 확인하세요.');
      setTasks(current => current.map((t) => t.id === taskId ? { ...t, status: task.status } : t));
    } finally {
      pending.current.delete(taskId); setPendingIds(new Set(pending.current));
    }
  };

  if (loading || statusesLoading) {
    return <div className={`${styles.container} ${styles.loading}`}><Spinner /></div>;
  }

  return (
    <div>
      {(error || statusError) && <p role="alert">{error || statusError} <button onClick={() => setRevision(n => n + 1)}>다시 불러오기</button></p>}
      {!hideProjectSelect && <div className={styles.toolbar}>
        <select
          aria-label="칸반 프로젝트"
          disabled={projectId !== undefined}
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className={styles.projectSelect}
        >
          <option value="">전체 프로젝트</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>}
      <div className={styles.container}>
        {columns.map((col) => (
          <KanbanColumn
            key={col.code}
            title={col.label}
            status={col.code}
            color={col.color}
            tasks={groupedTasks[col.code]}
            pendingIds={pendingIds}
            parentMap={parentMap}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onTaskClick={onTaskClick || (() => {})}
          />
        ))}
      </div>
    </div>
  );
}
