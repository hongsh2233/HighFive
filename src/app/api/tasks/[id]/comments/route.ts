import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/utils';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const taskId = parseInt(id);
  if (isNaN(taskId)) return NextResponse.json({ message: '잘못된 요청' }, { status: 400 });

  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ data: comments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const taskId = parseInt(id);
  if (isNaN(taskId)) return NextResponse.json({ message: '잘못된 요청' }, { status: 400 });

  const body = await req.json();
  const content = (body.content || '').trim();
  if (!content) return NextResponse.json({ message: '내용을 입력해주세요.' }, { status: 400 });

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ message: '업무를 찾을 수 없습니다.' }, { status: 404 });

  const authorId = parseInt((session!.user as any).id || '0');
  const comment = await prisma.taskComment.create({
    data: { taskId, authorId, content },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ data: comment }, { status: 201 });
}
