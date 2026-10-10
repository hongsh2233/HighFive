'use client';
import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useProjectStatuses } from '@/hooks/useProjectStatuses';
import type { Task, PaginatedResponse } from '@/types';

export interface HubProject {
  id: number; name: string; description?: string | null; status: string;
  projectManagerName?: string | null; healthStatus?: string; wikiEnabled: boolean;
  createdAt: string; members: { user: { id: number; name: string } }[];
  roles?: { label: string; userName: string | null; user: { name: string } | null }[];
}
// Walk every page so briefings never silently omit tasks beyond the first page.
export async function loadHubTasks(projectId?: number, signal?: AbortSignal) {
  const tasks: Task[] = [];
  for (let page = 1; ; page++) {
    const res = await apiClient.get<{ data: PaginatedResponse<Task> }>('/tasks', {
      params: { page, limit: 200, ...(projectId ? { projectId } : {}) }, signal,
    });
    const result = res.data.data;
    tasks.push(...result.data);
    if (tasks.length >= result.total || result.data.length === 0) break;
  }
  return tasks;
}
export function useWorkHub(projectId?: number) {
  const { user, isLoading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<HubProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const statuses = useProjectStatuses(revision);
  const reload = useCallback(() => setRevision(n => n + 1), []);
  const userId = user?.id;
  const scope = `${userId}:${projectId ?? 'all'}`;
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  useEffect(() => {
    if (authLoading || !userId) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    Promise.all([
      loadHubTasks(projectId, controller.signal),
      apiClient.get<{ data: HubProject[] }>('/projects', { signal: controller.signal }),
    ]).then(([items, response]) => {
      if (!controller.signal.aborted) { setTasks(items); setProjects(response.data.data); setLoadedScope(scope); }
    }).catch(() => {
      if (!controller.signal.aborted) setError('업무 현황을 불러오지 못했습니다. 다시 시도해 주세요.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [authLoading, userId, projectId, revision, scope]);
  return { tasks, projects, user, loading: authLoading || (loadedScope !== scope && !error) || (statuses.loading && !statuses.ready), refreshing: loading || statuses.loading, error: error || statuses.error, reload, getStatuses: statuses.getStatuses };
}
