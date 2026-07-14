import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/utils';
import { prisma } from '@/lib/db';

async function canManageChecklist(taskId: number, organizationId: number | undefined, userId: number, role: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, organizationId } });
  if (!task) return { task: null, allowed: false };
  const allowed = ['ADMIN', 'LEADER'].includes(role) || task.workerId === userId || task.registrantId === userId;
  return { task, allowed };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { session, error, organizationId } = await requireAuth();
  if (error) return error;

  const { id, itemId } = await params;
  const taskId = parseInt(id);
  const checklistItemId = parseInt(itemId);
  if (isNaN(taskId) || isNaN(checklistItemId)) return NextResponse.json({ message: '잘못된 요청' }, { status: 400 });

  const userId = parseInt((session!.user as any).id || '0');
  const role = (session!.user as any).role;
  const { task, allowed } = await canManageChecklist(taskId, organizationId, userId, role);
  if (!task) return NextResponse.json({ message: '업무를 찾을 수 없습니다.' }, { status: 404 });
  if (!allowed) return NextResponse.json({ message: '체크리스트를 수정할 권한이 없습니다.' }, { status: 403 });

  const item = await prisma.taskChecklistItem.findUnique({ where: { id: checklistItemId } });
  if (!item || item.taskId !== taskId) return NextResponse.json({ message: '항목을 찾을 수 없습니다.' }, { status: 404 });

  const body = await req.json();
  const data: { content?: string; isDone?: boolean; order?: number } = {};
  if (typeof body.content === 'string') {
    const trimmed = body.content.trim();
    if (!trimmed) return NextResponse.json({ message: '내용을 입력해주세요.' }, { status: 400 });
    data.content = trimmed.slice(0, 300);
  }
  if (typeof body.isDone === 'boolean') data.isDone = body.isDone;
  if (typeof body.order === 'number') data.order = body.order;

  const updated = await prisma.taskChecklistItem.update({ where: { id: checklistItemId }, data });
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { session, error, organizationId } = await requireAuth();
  if (error) return error;

  const { id, itemId } = await params;
  const taskId = parseInt(id);
  const checklistItemId = parseInt(itemId);
  if (isNaN(taskId) || isNaN(checklistItemId)) return NextResponse.json({ message: '잘못된 요청' }, { status: 400 });

  const userId = parseInt((session!.user as any).id || '0');
  const role = (session!.user as any).role;
  const { task, allowed } = await canManageChecklist(taskId, organizationId, userId, role);
  if (!task) return NextResponse.json({ message: '업무를 찾을 수 없습니다.' }, { status: 404 });
  if (!allowed) return NextResponse.json({ message: '체크리스트를 삭제할 권한이 없습니다.' }, { status: 403 });

  const item = await prisma.taskChecklistItem.findUnique({ where: { id: checklistItemId } });
  if (!item || item.taskId !== taskId) return NextResponse.json({ message: '항목을 찾을 수 없습니다.' }, { status: 404 });

  await prisma.taskChecklistItem.delete({ where: { id: checklistItemId } });
  return NextResponse.json({ message: '삭제되었습니다.' });
}
