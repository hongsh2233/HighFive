import { prisma } from './db';
import { getProjectStatuses } from './task-status';

// blockingTaskId에서 taskId까지 도달 가능하면(순환이 생기면) true
export async function wouldCreateCycle(taskId: number, blockingTaskId: number): Promise<boolean> {
  if (taskId === blockingTaskId) return true;

  const visited = new Set<number>([blockingTaskId]);
  let frontier = [blockingTaskId];

  while (frontier.length > 0) {
    const deps = await prisma.taskDependency.findMany({
      where: { taskId: { in: frontier } },
      select: { blockingTaskId: true },
    });
    const next: number[] = [];
    for (const d of deps) {
      if (d.blockingTaskId === taskId) return true;
      if (!visited.has(d.blockingTaskId)) {
        visited.add(d.blockingTaskId);
        next.push(d.blockingTaskId);
      }
    }
    frontier = next;
  }
  return false;
}

export interface BlockingTaskInfo {
  id: number;
  title: string;
  status: string;
  isDone: boolean;
}

// taskId를 막고 있는(아직 완료 안 된) 선행 업무 목록
export async function getIncompleteBlockers(taskId: number): Promise<BlockingTaskInfo[]> {
  const deps = await prisma.taskDependency.findMany({
    where: { taskId },
    include: { blockingTask: { select: { id: true, title: true, status: true, projectId: true } } },
  });
  if (deps.length === 0) return [];

  const results: BlockingTaskInfo[] = [];
  for (const d of deps) {
    const statuses = await getProjectStatuses(d.blockingTask.projectId);
    const isDone = statuses.find((s) => s.code === d.blockingTask.status)?.isDone ?? false;
    if (!isDone) {
      results.push({ id: d.blockingTask.id, title: d.blockingTask.title, status: d.blockingTask.status, isDone });
    }
  }
  return results;
}

// newStatusCode가 해당 프로젝트의 "진행중(isProgress)" 단계로 진입하는 전이일 때만 검사.
// 미완료 선행 업무가 있으면 에러 메시지를 반환(없으면 null).
export async function assertNotBlocked(taskId: number, newStatusCode: string, projectId: number | null | undefined): Promise<string | null> {
  const statuses = await getProjectStatuses(projectId);
  const newStatusDef = statuses.find((s) => s.code === newStatusCode);
  if (!newStatusDef?.isProgress) return null;

  const blockers = await getIncompleteBlockers(taskId);
  if (blockers.length === 0) return null;

  const names = blockers.map((b) => b.title).join(', ');
  return `선행 업무가 완료되지 않아 시작할 수 없습니다: ${names}`;
}
