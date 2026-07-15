import { prisma } from './db';

export interface SearchTaskResult {
  id: number;
  title: string;
  status: string;
  snippet: string;
  projectId: number | null;
  projectName: string | null;
  workerName: string | null;
}

export interface SearchWikiResult {
  id: number;
  title: string;
  snippet: string;
  projectId: number;
  projectName: string | null;
}

export async function runSearch(organizationId: number | undefined, q: string): Promise<{ tasks: SearchTaskResult[]; wiki: SearchWikiResult[] }> {
  if (!q.trim()) return { tasks: [], wiki: [] };

  const [tasks, fieldMatches, commentMatches, wiki] = await Promise.all([
    prisma.task.findMany({
      where: {
        organizationId,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        notes: true,
        project: { select: { id: true, name: true } },
        worker: { select: { id: true, name: true } },
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.taskFieldValue.findMany({
      where: { value: { contains: q, mode: 'insensitive' }, task: { organizationId } },
      select: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            notes: true,
            project: { select: { id: true, name: true } },
            worker: { select: { id: true, name: true } },
          },
        },
      },
      take: 20,
    }),
    prisma.taskComment.findMany({
      where: { content: { contains: q, mode: 'insensitive' }, task: { organizationId } },
      select: {
        content: true,
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            notes: true,
            project: { select: { id: true, name: true } },
            worker: { select: { id: true, name: true } },
          },
        },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.wikiPage.findMany({
      where: {
        project: { organizationId },
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        content: true,
        projectId: true,
        project: { select: { name: true } },
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  type TaskRow = typeof tasks[number];
  const taskMap = new Map<number, TaskRow>(tasks.map((t: TaskRow) => [t.id, t] as [number, TaskRow]));
  const commentSnippetMap = new Map<number, string>();
  for (const fm of fieldMatches) {
    if (!taskMap.has(fm.task.id)) taskMap.set(fm.task.id, fm.task);
  }
  for (const cm of commentMatches) {
    if (!taskMap.has(cm.task.id)) taskMap.set(cm.task.id, cm.task);
    if (!commentSnippetMap.has(cm.task.id)) commentSnippetMap.set(cm.task.id, cm.content);
  }

  const taskResults: SearchTaskResult[] = Array.from(taskMap.values()).slice(0, 20).map((t: TaskRow) => {
    const commentSnippet = commentSnippetMap.get(t.id);
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      snippet: commentSnippet ? `💬 ${commentSnippet.slice(0, 80)}` : (t.notes ? t.notes.slice(0, 80) : ''),
      projectId: t.project?.id ?? null,
      projectName: t.project?.name ?? null,
      workerName: t.worker?.name ?? null,
    };
  });

  type WikiRow = typeof wiki[number];
  const wikiResults: SearchWikiResult[] = wiki.map((w: WikiRow) => {
    const idx = w.content.toLowerCase().indexOf(q.toLowerCase());
    const snippet = idx >= 0
      ? w.content.slice(Math.max(0, idx - 20), idx + 60)
      : w.content.slice(0, 80);
    return {
      id: w.id,
      title: w.title,
      snippet,
      projectId: w.projectId,
      projectName: w.project?.name ?? null,
    };
  });

  return { tasks: taskResults, wiki: wikiResults };
}
