'use client';

import { useState, useEffect } from 'react';
import { Task, TaskStatus } from '@/types';
import KanbanColumn from './KanbanColumn';
import apiClient from '@/lib/api-client';
import styles from './KanbanBoard.module.css';

const statuses = ['ASSIGNED', 'PROGRESS', 'REVIEW', 'QA', 'DONE'];
const statusLabels: { [key: string]: string } = {
  ASSIGNED: '배정됨',
  PROGRESS: '진행중',
  REVIEW: '검수',
  QA: 'QA',
  DONE: '완료',
};

interface KanbanBoardProps {
  onTaskClick?: (task: Task) => void;
}

export default function KanbanBoard({ onTaskClick }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllTasks = async () => {
      try {
        const response = await apiClient.get<{ data: { data: Task[] } }>('/tasks?limit=1000');
        setTasks(response.data.data.data);
      } catch (err) {
        console.error('Failed to load tasks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllTasks();
  }, []);

  const groupIds = new Set<number>();
  tasks.forEach((t) => {
    if (t.parentTaskId) groupIds.add(t.parentTaskId);
  });
  const isStandaloneGroup = (t: Task) => t.isGroup || groupIds.has(t.id);

  const groupedTasks = statuses.reduce(
    (acc, status) => {
      acc[status] = tasks.filter((task) => !isStandaloneGroup(task) && task.status === status);
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
    const taskId = parseInt(e.dataTransfer.getData('taskId'));
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    setTasks(tasks.map((t) => t.id === taskId ? { ...t, status: targetStatus as TaskStatus } : t));

    try {
      await apiClient.patch(`/tasks/${taskId}/status`, { status: targetStatus });
    } catch (err) {
      console.error('Failed to update task status:', err);
      setTasks(tasks.map((t) => t.id === taskId ? { ...t, status: task.status } : t));
    }
  };

  if (loading) {
    return <div className={`${styles.container} ${styles.loading}`}>로딩 중...</div>;
  }

  return (
    <div className={styles.container}>
      {statuses.map((status) => (
        <KanbanColumn
          key={status}
          title={statusLabels[status]}
          status={status}
          tasks={groupedTasks[status]}
          parentMap={parentMap}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onTaskClick={onTaskClick || (() => {})}
        />
      ))}
    </div>
  );
}
