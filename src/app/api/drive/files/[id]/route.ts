import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { deleteDriveFile } from '@/lib/google-drive';

// DELETE /api/drive/files/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const userId = parseInt((session!.user as any).id || '0');
    const { id } = await params;
    await deleteDriveFile(userId, id);
    return successResponse(null, '삭제되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('삭제 중 오류가 발생했습니다.', 500);
  }
}
