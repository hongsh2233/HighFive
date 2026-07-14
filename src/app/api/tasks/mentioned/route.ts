import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/utils';
import { prisma } from '@/lib/db';

// GET /api/tasks/mentioned - 내가 댓글에서 멘션된 업무의 id 목록
export async function GET() {
  const { session, error, organizationId } = await requireAuth();
  if (error) return error;

  const userId = parseInt((session!.user as any).id || '0');

  const comments = await prisma.taskComment.findMany({
    where: {
      content: { contains: `](${userId})` },
      task: { organizationId },
    },
    select: { taskId: true },
    distinct: ['taskId'],
  });

  return NextResponse.json({ data: { taskIds: comments.map((c) => c.taskId) } });
}
