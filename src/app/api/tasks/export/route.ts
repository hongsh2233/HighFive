import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, errorResponse } from '@/lib/utils';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// GET /api/tasks/export?format=csv|xlsx&from=&to=
// 데이터 범위: ADMIN은 조직 전체(org), LEADER는 본인 소속 프로젝트 + 담당 팀원 범위만(team)
export async function GET(req: NextRequest) {
  try {
    const { error, organizationId, session } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') ?? 'csv') as 'csv' | 'xlsx';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const role = (session!.user as any).role;
    const userId = parseInt((session!.user as any).id || '0');
    let scopeOr: any = {};
    if (role === 'LEADER') {
      const [myProjects, subordinates] = await Promise.all([
        prisma.projectMember.findMany({ where: { userId }, select: { projectId: true } }),
        prisma.user.findMany({ where: { organizationId, managerId: userId }, select: { id: true } }),
      ]);
      scopeOr = { OR: [{ projectId: { in: myProjects.map((p) => p.projectId) } }, { workerId: { in: subordinates.map((s) => s.id) } }] };
    }

    const tasks = await prisma.task.findMany({
      where: {
        organizationId,
        ...(from && to
          ? { createdAt: { gte: new Date(from), lte: new Date(to) } }
          : {}),
        ...scopeOr,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        worker: { select: { name: true, email: true } },
        registrant: { select: { name: true, email: true } },
        timeLogs: true,
      },
    });

    const rows = tasks.map((t) => ({
      ID: t.id,
      RMS번호: t.rmsNo ?? '',
      제목: t.title,
      상태: t.status,
      작업자: t.worker?.name ?? '',
      등록자: t.registrant?.name ?? '',
      목표일: t.targetDate ? t.targetDate.toISOString().slice(0, 10) : '',
      프리징: t.isFreeze ? 'Y' : 'N',
      총공수: t.timeLogs.reduce((s, l) => s + (l.finalHours ?? 0), 0).toFixed(2),
      생성일: t.createdAt.toISOString().slice(0, 10),
    }));

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '업무목록');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new Response(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="tasks_${Date.now()}.xlsx"`,
        },
      });
    }

    // CSV (기본)
    const csv = Papa.unparse(rows);
    const bom = '﻿'; // 한글 깨짐 방지
    return new Response(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tasks_${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    console.error(err);
    return errorResponse('내보내기 중 오류가 발생했습니다.', 500);
  }
}
