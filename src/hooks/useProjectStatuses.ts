'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { ProjectStatusDef } from '@/types';

export function useProjectStatuses() {
  const [byProject, setByProject] = useState<Record<number, ProjectStatusDef[]>>({});
  const [defaultStatuses, setDefaultStatuses] = useState<ProjectStatusDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<{ data: { byProject: Record<number, ProjectStatusDef[]>; default: ProjectStatusDef[] } }>('/projects/statuses')
      .then((res) => {
        setByProject(res.data.data.byProject);
        setDefaultStatuses(res.data.data.default);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getStatuses = (projectId?: number | null): ProjectStatusDef[] => {
    if (projectId && byProject[projectId]?.length) return byProject[projectId];
    return defaultStatuses;
  };

  return { getStatuses, loading };
}
