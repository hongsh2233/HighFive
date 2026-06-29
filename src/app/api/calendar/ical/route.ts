import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyIcalToken } from '@/lib/ical-token';

function pad(n: number) { return String(n).padStart(2, '0'); }

function toIcalDate(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function nextDay(d: Date) {
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  return next;
}

function escapeIcal(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return new NextResponse('token required', { status: 400 });

  const userId = verifyIcalToken(token);
  if (!userId) return new NextResponse('invalid token', { status: 401 });

  const tasks = await prisma.task.findMany({
    where: { workerId: userId, targetDate: { not: null } },
    select: { id: true, title: true, rmsNo: true, status: true, targetDate: true },
    orderBy: { targetDate: 'asc' },
  });

  const baseUrl = process.env.NEXTAUTH_URL || '';
  const statusLabel: Record<string, string> = {
    ASSIGNED: '배정됨', PROGRESS: '진행중', REVIEW: '검수', QA: 'QA',
    WAITING: '대기', DONE: '완료', HOLD: '보류',
  };

  const events = tasks.map((t) => {
    const start = toIcalDate(t.targetDate!);
    const end = toIcalDate(nextDay(t.targetDate!));
    const summary = escapeIcal(`[${statusLabel[t.status] ?? t.status}] ${t.rmsNo ? t.rmsNo + ' ' : ''}${t.title}`);
    return [
      'BEGIN:VEVENT',
      `UID:tms-task-${t.id}@tms`,
      `SUMMARY:${summary}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `URL:${baseUrl}/tasks/${t.id}`,
      'END:VEVENT',
    ].join('\r\n');
  }).join('\r\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TMS//KO',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:TMS 업무 일정',
    events,
    'END:VCALENDAR',
  ].join('\r\n');

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="tms.ics"',
    },
  });
}
