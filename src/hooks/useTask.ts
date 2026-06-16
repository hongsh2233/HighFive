'use client';

import { useState, useCallback, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { Task, PaginatedResponse } from '@/types';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 업무 목록 조회
  const fetchTasks = useCallback(
    async (filters?: { status?: string; workerId?: number }) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (filters?.status) params.append('status', filters.status);
        if (filters?.workerId) params.append('workerId', filters.workerId.toString());

        const response = await apiClient.get<{ data: PaginatedResponse<Task> }>(
          `/tasks?${params.toString()}`
        );
        setTasks(response.data.data.data);
        setTotal(response.data.data.total);
      } catch (err: any) {
        setError(err.message || '업무 목록 조회 실패');
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [page, limit]
  );

  // 업무 생성
  const createTask = useCallback(
    async (data: {
      title: string;
      workerId: number;
      plannerId: number;
      targetDate?: string;
      notes?: string;
    }) => {
      try {
        const response = await apiClient.post<{ data: Task }>('/tasks', data);
        setTasks([response.data.data, ...tasks]);
        return response.data.data;
      } catch (err: any) {
        setError(err.message || '업무 생성 실패');
        throw err;
      }
    },
    [tasks]
  );

  // 업무 수정
  const updateTask = useCallback(
    async (id: number, data: Partial<Task>) => {
      try {
        const response = await apiClient.patch<{ data: Task }>(`/tasks/${id}`, data);
        setTasks(tasks.map((t) => (t.id === id ? response.data.data : t)));
        return response.data.data;
      } catch (err: any) {
        setError(err.message || '업무 수정 실패');
        throw err;
      }
    },
    [tasks]
  );

  // 업무 삭제
  const deleteTask = useCallback(
    async (id: number) => {
      try {
        await apiClient.delete(`/tasks/${id}`);
        setTasks(tasks.filter((t) => t.id !== id));
      } catch (err: any) {
        setError(err.message || '업무 삭제 실패');
        throw err;
      }
    },
    [tasks]
  );

  // 상태 변경
  const updateStatus = useCallback(
    async (id: number, status: string) => {
      try {
        const response = await apiClient.patch<{ data: Task }>(
          `/tasks/${id}/status`,
          { status }
        );
        setTasks(tasks.map((t) => (t.id === id ? response.data.data : t)));
        return response.data.data;
      } catch (err: any) {
        setError(err.message || '상태 변경 실패');
        throw err;
      }
    },
    [tasks]
  );

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    total,
    page,
    setPage,
    limit,
    setLimit,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    updateStatus,
  };
}
