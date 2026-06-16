import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse, parseRmsNo } from '@/lib/utils';

// GET /api/tasks - 업무 목록 조회
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    // 쿼리 파라미터 가져오기
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const workerId = searchParams.get('workerId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // 필터 조건 구성
    const where: any = {};
    if (status) where.status = status;
    if (workerId) where.workerId = parseInt(workerId);

    // 페이지네이션
    const skip = (page - 1) * limit;

    // 데이터 조회
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          planner: { select: { id: true, name: true, email: true } },
          worker: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return successResponse(
      { data: tasks, total, page, limit },
      '업무 목록 조회 완료'
    );
  } catch (err) {
    console.error(err);
    return errorResponse('업무 목록 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/tasks - 업무 생성
export async function POST(req: NextRequest) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const userRole = (session?.user as any)?.role;
    if (!['ADMIN', 'PLANNER'].includes(userRole)) {
      return errorResponse('업무를 생성할 권한이 없습니다.', 403, 'AUTH_403');
    }

    const body = await req.json();
    const { title, workerId, plannerId, targetDate, notes } = body;

    // 입력값 검증
    if (!title || !workerId || !plannerId) {
      return errorResponse('필수 항목이 누락되었습니다.', 400, 'VALID_400');
    }

    // RMS 번호 파싱
    const { cleanTitle, rmsNo } = parseRmsNo(title);

    // 업무 생성
    const task = await prisma.task.create({
      data: {
        title: cleanTitle,
        rmsNo,
        workerId: parseInt(workerId),
        plannerId: parseInt(plannerId),
        targetDate: targetDate ? new Date(targetDate) : null,
        notes,
        status: 'ASSIGNED',
      },
      include: {
        planner: { select: { id: true, name: true, email: true } },
        worker: { select: { id: true, name: true, email: true } },
      },
    });

    return successResponse(task, '업무가 생성되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('업무 생성 중 오류가 발생했습니다.', 500);
  }
}
