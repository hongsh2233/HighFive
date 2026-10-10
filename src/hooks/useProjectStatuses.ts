'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { ProjectStatusDef } from '@/types';

export function useProjectStatuses(revision = 0) {
  const [byProject, setByProject] = useState<Record<number, ProjectStatusDef[]>>({});
  const [defaultStatuses, setDefaultStatuses] = useState<ProjectStatusDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    apiClient
      .get<{ data: { byProject: Record<number, ProjectStatusDef[]>; default: ProjectStatusDef[] } }>('/projects/statuses')
      .then((res) => {
        setByProject(res.data.data.byProject);
        setDefaultStatuses(res.data.data.default);
      })
      .catch(() => setError('업무 상태를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [revision]);

  const getStatuses = (projectId?: number | null): ProjectStatusDef[] => {
    if (projectId && byProject[projectId]?.length) return byProject[projectId];
    return defaultStatuses;
  };

  return { getStatuses, loading, error };
}
