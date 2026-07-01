'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { ProjectField } from '@/types';

export function useProjectFields(projectId?: number | null) {
  const [fields, setFields] = useState<ProjectField[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFields = useCallback(async () => {
    if (!projectId) {
      setFields([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: ProjectField[] }>(`/projects/${projectId}/fields`);
      setFields(res.data.data || []);
    } catch {
      setFields([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const saveFields = async (next: Pick<ProjectField, 'name' | 'type' | 'options'>[]) => {
    if (!projectId) return;
    const res = await apiClient.put<{ data: ProjectField[] }>(`/projects/${projectId}/fields`, { fields: next });
    setFields(res.data.data || []);
  };

  const saveValue = async (taskId: number, fieldId: number, value: string | null) => {
    await apiClient.put(`/tasks/${taskId}/fields`, { fieldId, value });
  };

  return { fields, loading, refetch: fetchFields, saveFields, saveValue };
}
