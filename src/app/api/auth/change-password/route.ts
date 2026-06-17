import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import bcryptjs from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session?.user as any)?.id || '0');
    if (isNaN(userId)) {
      return errorResponse('유효하지 않은 사용자입니다.', 400, 'VALID_400');
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return errorResponse('현재 비밀번호와 새 비밀번호를 입력해주세요.', 400, 'VALID_400');
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return errorResponse('사용자를 찾을 수 없습니다.', 404, 'USER_404');
    }

    // 현재 비밀번호 검증
    const isPasswordValid = await bcryptjs.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return errorResponse('현재 비밀번호가 일치하지 않습니다.', 401, 'AUTH_401');
    }

    // 새 비밀번호 해시
    const hashedPassword = await bcryptjs.hash(newPassword, 12);

    // 비밀번호 업데이트
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return successResponse(null, '비밀번호가 변경되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('비밀번호 변경 중 오류가 발생했습니다.', 500);
  }
}
