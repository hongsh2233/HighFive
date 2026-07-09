import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/utils';
import { prisma } from '@/lib/db';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { commentId } = await params;
  const id = parseInt(commentId);
  if (isNaN(id)) return NextResponse.json({ message: '잘못된 요청' }, { status: 400 });

  const comment = await prisma.taskComment.findUnique({ where: { id } });
  if (!comment) return NextResponse.json({ message: '댓글을 찾을 수 없습니다.' }, { status: 404 });

  const userId = parseInt((session!.user as any).id || '0');
  const userRole = (session!.user as any).role;
  const isOwner = comment.authorId === userId;
  const isManager = userRole === 'ADMIN' || userRole === 'LEADER';

  if (!isOwner && !isManager) {
    return NextResponse.json({ message: '삭제 권한이 없습니다.' }, { status: 403 });
  }

  await prisma.taskComment.delete({ where: { id } });
  return NextResponse.json({ message: '삭제되었습니다.' });
}
