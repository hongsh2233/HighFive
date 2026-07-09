import { NextRequest } from 'next/server';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { inviteUser } from '@/lib/services/user.service';

// POST /api/users/invite — ADMIN 전용
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN']);
    if (error) return error;

    const body = await req.json();
    const { email, name, role } = body;

    if (!email || !name || !role) {
      return errorResponse('email, name, role은 필수입니다.', 400, 'VALID_400');
    }

    if (!['ADMIN', 'LEADER', 'WORKER'].includes(role)) {
      return errorResponse('유효하지 않은 역할입니다.', 400, 'VALID_400');
    }

    const { user, tempPassword } = await inviteUser(email, name, role, organizationId);
    return successResponse({ user, tempPassword }, '사용자가 초대되었습니다.', 201);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return errorResponse('이미 사용 중인 이메일입니다.', 409);
    }
    console.error(err);
    return errorResponse('사용자 초대 중 오류가 발생했습니다.', 500);
  }
}
