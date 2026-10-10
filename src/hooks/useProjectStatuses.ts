'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { ProjectStatusDef } from '@/types';

export function useProjectStatuses(revision = 0) {
  const [byProject, setByProject] = useState<Record<number, ProjectStatusDef[]>>({});
  const [defaultStatuses, setDefaultStatuses] = useState<ProjectStatusDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    apiClient
      .get<{ data: { byProject: Record<number, ProjectStatusDef[]>; default: ProjectStatusDef[] } }>('/projects/statuses', { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        setByProject(res.data.data.byProject);
        setDefaultStatuses(res.data.data.default);
        setReady(true);
      })
      .catch(() => { if (!controller.signal.aborted) setError('업무 상태를 불러오지 못했습니다.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  const getStatuses = useCallback((projectId?: number | null): ProjectStatusDef[] => {
    if (projectId && byProject[projectId]?.length) return byProject[projectId];
    return defaultStatuses;
  }, [byProject, defaultStatuses]);

  return { getStatuses, loading, error, ready };
}
