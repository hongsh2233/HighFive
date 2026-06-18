'use client';

import { useState, useEffect } from 'react';
import { Task, TaskStatus } from '@/types';
import KanbanColumn from './KanbanColumn';
import apiClient from '@/lib/api-client';

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

  // 업무 목록 로드
  useEffect(() => {
    const fetchAllTasks = async () => {
      try {
        const response = await apiClient.get<{ data: { data: Task[] } }>(
          '/tasks?limit=1000'
        );
        setTasks(response.data.data.data);
      } catch (err) {
        console.error('Failed to load tasks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllTasks();
  }, []);

  // 상태별로 업무 그룹화
  const groupedTasks = statuses.reduce(
    (acc, status) => {
      acc[status] = tasks.filter((task) => task.status === status);
      return acc;
    },
    {} as { [key: string]: Task[] }
  );

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

    // 낙관적 업데이트
    setTasks(
      tasks.map((t) =>
        t.id === taskId ? { ...t, status: targetStatus as TaskStatus } : t
      )
    );

    // 서버 업데이트
    try {
      await apiClient.patch(`/tasks/${taskId}/status`, {
        status: targetStatus,
      });
    } catch (err) {
      console.error('Failed to update task status:', err);
      // 실패 시 원래 상태로 복원
      setTasks(
        tasks.map((t) =>
          t.id === taskId ? { ...t, status: task.status } : t
        )
      );
    }
  };

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-6) var(--space-8)',
    display: 'flex',
    gap: 'var(--space-4)',
    overflowX: 'auto',
    backgroundColor: 'var(--color-bg-base)',
    minHeight: 'calc(100vh - 120px)',
    alignItems: 'flex-start',
    animation: 'fadeIn 0.3s ease-out',
  };

  if (loading) {
    return (
      <div style={{ ...containerStyle, justifyContent: 'center', alignItems: 'center', color: 'var(--color-gray-500)', fontSize: '14px', fontWeight: '500' }}>
        칸반 보드를 구성하고 있습니다...
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {statuses.map((status) => (
        <KanbanColumn
          key={status}
          title={statusLabels[status]}
          status={status}
          tasks={groupedTasks[status]}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onTaskClick={onTaskClick || (() => {})}
        />
      ))}
    </div>
  );
}
