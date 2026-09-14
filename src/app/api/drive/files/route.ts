import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { listDriveFiles, uploadFileToDrive } from '@/lib/google-drive';

// GET /api/drive/files - 내 구글 드라이브(앱 폴더) 파일 목록
export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const userId = parseInt((session!.user as any).id || '0');
    const files = await listDriveFiles(userId);
    return successResponse(files, '파일 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('구글 드라이브가 연결되어 있지 않거나 목록 조회에 실패했습니다.', 500);
  }
}

// POST /api/drive/files - 파일 업로드 (multipart/form-data, field: file)
export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const userId = parseInt((session!.user as any).id || '0');
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return errorResponse('업로드할 파일이 없습니다.', 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFileToDrive(userId, file.name, file.type || 'application/octet-stream', buffer);
    if (!result) return errorResponse('구글 드라이브가 연결되어 있지 않습니다.', 400);

    return successResponse(result, '업로드되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('업로드 중 오류가 발생했습니다.', 500);
  }
}
