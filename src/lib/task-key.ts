/** The database sequence already allocates an immutable, globally unique task id.
 * Deriving the public key avoids a second counter and covers every creation path,
 * including existing tasks, imports, recurring tasks, groups and inquiries. */
export function formatTaskKey(id: number): string {
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
    throw new RangeError('유효하지 않은 업무 ID입니다.');
  }
  return `HF-${String(id).padStart(6, '0')}`;
}

/** Exact keys only: partial/overflowing keys must never select another task. */
export function parseTaskKey(value: string): number | null {
  const match = /^HF-(\d+)$/i.exec(value.trim());
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

export function withTaskKey<T extends { id: number; subTasks?: { id: number }[] }>(task: T): T & { taskKey: string } {
  return {
    ...task,
    taskKey: formatTaskKey(task.id),
    ...(task.subTasks ? { subTasks: task.subTasks.map(withTaskKey) } : {}),
  };
}
