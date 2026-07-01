'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/types';
import { useProjectStatuses } from '@/hooks/useProjectStatuses';
import KanbanColumn from './KanbanColumn';
import apiClient from '@/lib/api-client';
import styles from './KanbanBoard.module.css';

interface Project {
  id: number;
  name: string;
  status: string;
}

interface KanbanBoardProps {
  onTaskClick?: (task: Task) => void;
}

export default function KanbanBoard({ onTaskClick }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const { getStatuses, loading: statusesLoading } = useProjectStatuses();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [tasksRes, projectsRes] = await Promise.all([
          apiClient.get<{ data: { data: Task[] } }>('/tasks?limit=1000'),
          apiClient.get<{ data: Project[] }>('/projects'),
        ]);
        setTasks(tasksRes.data.data.data);
        setProjects(projectsRes.data.data.filter((p) => p.status === 'ACTIVE'));
      } catch (err) {
        console.error('Failed to load tasks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

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
    if (!task || task.status === targetStatus) return;

    setTasks(tasks.map((t) => t.id === taskId ? { ...t, status: targetStatus } : t));

    try {
      await apiClient.patch(`/tasks/${taskId}/status`, { status: targetStatus });
    } catch (err) {
      console.error('Failed to update task status:', err);
      setTasks(tasks.map((t) => t.id === taskId ? { ...t, status: task.status } : t));
    }
  };

  if (loading || statusesLoading) {
    return <div className={`${styles.container} ${styles.loading}`}>로딩 중...</div>;
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className={styles.projectSelect}
        >
          <option value="">전체 프로젝트</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className={styles.container}>
        {columns.map((col) => (
          <KanbanColumn
            key={col.code}
            title={col.label}
            status={col.code}
            color={col.color}
            tasks={groupedTasks[col.code]}
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
