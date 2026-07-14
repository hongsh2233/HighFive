import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/utils';
import { prisma } from '@/lib/db';

async function canManageChecklist(taskId: number, organizationId: number | undefined, userId: number, role: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, organizationId } });
  if (!task) return { task: null, allowed: false };
  const allowed = ['ADMIN', 'LEADER'].includes(role) || task.workerId === userId || task.registrantId === userId;
  return { task, allowed };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, organizationId } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const taskId = parseInt(id);
  if (isNaN(taskId)) return NextResponse.json({ message: '잘못된 요청' }, { status: 400 });

  const task = await prisma.task.findFirst({ where: { id: taskId, organizationId } });
  if (!task) return NextResponse.json({ message: '업무를 찾을 수 없습니다.' }, { status: 404 });

  const items = await prisma.taskChecklistItem.findMany({
    where: { taskId },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json({ data: items });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error, organizationId } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const taskId = parseInt(id);
  if (isNaN(taskId)) return NextResponse.json({ message: '잘못된 요청' }, { status: 400 });

  const userId = parseInt((session!.user as any).id || '0');
  const role = (session!.user as any).role;
  const { task, allowed } = await canManageChecklist(taskId, organizationId, userId, role);
  if (!task) return NextResponse.json({ message: '업무를 찾을 수 없습니다.' }, { status: 404 });
  if (!allowed) return NextResponse.json({ message: '체크리스트를 추가할 권한이 없습니다.' }, { status: 403 });

  const body = await req.json();
  const content = (body.content || '').trim();
  if (!content) return NextResponse.json({ message: '내용을 입력해주세요.' }, { status: 400 });

  const maxOrder = await prisma.taskChecklistItem.aggregate({
    where: { taskId },
    _max: { order: true },
  });

  const item = await prisma.taskChecklistItem.create({
    data: { taskId, content: content.slice(0, 300), order: (maxOrder._max.order ?? -1) + 1 },
  });

  return NextResponse.json({ data: item }, { status: 201 });
}
