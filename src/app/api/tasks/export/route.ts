import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, errorResponse } from '@/lib/utils';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// GET /api/tasks/export?format=csv|xlsx&from=&to=
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireRole(['ADMIN', 'PLANNER']);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') ?? 'csv') as 'csv' | 'xlsx';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const tasks = await prisma.task.findMany({
      where: {
        ...(from && to
          ? { createdAt: { gte: new Date(from), lte: new Date(to) } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        worker: { select: { name: true, email: true } },
        planner: { select: { name: true, email: true } },
        timeLogs: true,
      },
    });

    const rows = tasks.map((t) => ({
      ID: t.id,
      RMS번호: t.rmsNo ?? '',
      제목: t.title,
      상태: t.status,
      작업자: t.worker?.name ?? '',
      기획자: t.planner?.name ?? '',
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
