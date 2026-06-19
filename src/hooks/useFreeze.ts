'use client';

import { useMemo } from 'react';
import { Task } from '@/types';

export function useFreeze(tasks: Task[]) {
  const frozenTasks = useMemo(() => tasks.filter((t) => t.isFreeze), [tasks]);
  const hasFrozenConflict = frozenTasks.length > 0;

  function isFrozen(taskId: number) {
    return frozenTasks.some((t) => t.id === taskId);
  }

  return { frozenTasks, hasFrozenConflict, isFrozen };
}
