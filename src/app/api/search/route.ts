import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/utils';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  if (!q) return NextResponse.json({ data: { tasks: [], wiki: [] } });

  const [tasks, fieldMatches, wiki] = await Promise.all([
    prisma.task.findMany({
      where: {
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
      where: { value: { contains: q, mode: 'insensitive' } },
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
    prisma.wikiPage.findMany({
      where: {
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

  // 필드값 매치에서 중복 제거 후 업무 목록에 합치기
  type TaskRow = typeof tasks[number];
  const taskMap = new Map<number, TaskRow>(tasks.map((t: TaskRow) => [t.id, t] as [number, TaskRow]));
  for (const fm of fieldMatches) {
    if (!taskMap.has(fm.task.id)) taskMap.set(fm.task.id, fm.task);
  }

  const taskResults = Array.from(taskMap.values()).slice(0, 20).map((t: TaskRow) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    snippet: t.notes ? t.notes.slice(0, 80) : '',
    projectId: t.project?.id ?? null,
    projectName: t.project?.name ?? null,
    workerName: t.worker?.name ?? null,
  }));

  type WikiRow = typeof wiki[number];
  const wikiResults = wiki.map((w: WikiRow) => {
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

  return NextResponse.json({ data: { tasks: taskResults, wiki: wikiResults } });
}
