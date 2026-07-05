'use client';

import { create } from 'zustand';
import { Task, TaskStatus } from '@/types';
import apiClient from '@/lib/api-client';

interface TaskFilters {
  status: string;
  workerId: string;
  page: number;
  limit: number;
}

interface TaskState {
  tasks: Task[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: TaskFilters;

  // 필터 액션
  setFilter: (key: keyof TaskFilters, value: string | number) => void;
  resetFilters: () => void;

  // CRUD 액션
  fetchTasks: () => Promise<void>;
  createTask: (data: CreateTaskInput) => Promise<Task>;
  updateTask: (id: number, data: Partial<Task>) => Promise<Task>;
  updateStatus: (id: number, status: TaskStatus) => Promise<Task>;
  deleteTask: (id: number) => Promise<void>;

  // 칸반용: 로컬 상태 낙관적 업데이트
  moveTask: (id: number, status: TaskStatus) => void;
}

interface CreateTaskInput {
  title: string;
  workerId: number;
  registrantId: number;
  targetDate?: string;
  notes?: string;
}

const DEFAULT_FILTERS: TaskFilters = { status: '', workerId: '', page: 1, limit: 10 };

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  total: 0,
  loading: false,
  error: null,
  filters: { ...DEFAULT_FILTERS },

  setFilter: (key, value) =>
    set((s) => ({
      filters: { ...s.filters, [key]: value, ...(key !== 'page' ? { page: 1 } : {}) },
    })),

  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  fetchTasks: async () => {
    const { filters } = get();
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
      });
      if (filters.status) params.append('status', filters.status);
      if (filters.workerId) params.append('workerId', filters.workerId);

      const res = await apiClient.get<{ data: { data: Task[]; total: number } }>(
        `/tasks?${params}`
      );
      set({ tasks: res.data.data.data, total: res.data.data.total });
    } catch (err: any) {
      set({ error: err.message ?? '업무 목록 조회 실패' });
    } finally {
      set({ loading: false });
    }
  },

  createTask: async (data) => {
    const res = await apiClient.post<{ data: Task }>('/tasks', data);
    const task = res.data.data;
    set((s) => ({ tasks: [task, ...s.tasks], total: s.total + 1 }));
    return task;
  },

  updateTask: async (id, data) => {
    const res = await apiClient.patch<{ data: Task }>(`/tasks/${id}`, data);
    const updated = res.data.data;
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
    return updated;
  },

  updateStatus: async (id, status) => {
    // 낙관적 업데이트
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
    try {
      const res = await apiClient.patch<{ data: Task }>(`/tasks/${id}/status`, { status });
      const updated = res.data.data;
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
      return updated;
    } catch (err) {
      // 실패 시 원상복구를 위해 다시 fetch
      get().fetchTasks();
      throw err;
    }
  },

  deleteTask: async (id) => {
    await apiClient.delete(`/tasks/${id}`);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id), total: s.total - 1 }));
  },

  moveTask: (id, status) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
  },
}));
