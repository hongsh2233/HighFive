import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

const taskListSelect = {
  id: true,
  title: true,
  status: true,
  targetDate: true,
  workerId: true,
  registrantId: true,
  projectId: true,
  worker: { select: { id: true, name: true } },
} as const;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // 월요일 시작
  x.setDate(x.getDate() + diff);
  return x;
}

// GET /api/dashboard/summary - 역할별 "지금 해야 할 일" 중심 대시보드 데이터
export async function GET() {
  try {
    const { session, error, organizationId } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const today = startOfDay(new Date());
    const in3days = new Date(today);
    in3days.setDate(in3days.getDate() + 3);

    if (role === 'WORKER') {
      const myTasks = await prisma.task.findMany({
        where: { organizationId, workerId: userId, isGroup: false },
        select: taskListSelect,
      });
      const notDone = myTasks.filter((t) => t.status !== 'DONE');

      const dueToday = notDone.filter((t) => t.targetDate && startOfDay(t.targetDate).getTime() === today.getTime());
      const dueSoon = notDone.filter((t) => t.targetDate && startOfDay(t.targetDate) > today && startOfDay(t.targetDate) <= in3days);
      const overdue = notDone.filter((t) => t.targetDate && startOfDay(t.targetDate) < today);

      const requestedOfMe = await prisma.task.findMany({
        where: { organizationId, registrantId: userId, status: 'REVIEW' },
        select: taskListSelect,
      });

      const announcements = await prisma.announcement.findMany({
        where: { organizationId, isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        select: { id: true, content: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const recentDecisions = await prisma.request.findMany({
        where: { requesterId: userId, status: { in: ['APPROVED', 'REJECTED'] }, decidedAt: { gte: twoWeeksAgo } },
        select: { id: true, type: true, title: true, status: true, rejectReason: true, decidedAt: true },
        orderBy: { decidedAt: 'desc' },
        take: 5,
      });

      const todaySchedule = await prisma.task.findMany({
        where: {
          organizationId,
          workerId: userId,
          isGroup: false,
          targetDate: { gte: today, lt: new Date(today.getTime() + 86400000) },
        },
        select: taskListSelect,
      });

      return successResponse({
        role: 'WORKER',
        dueToday: dueToday.slice(0, 10),
        dueSoon: dueSoon.slice(0, 10),
        overdue: overdue.slice(0, 10),
        requestedOfMe: requestedOfMe.slice(0, 10),
        unreadAnnouncements: announcements,
        recentDecisions,
        todaySchedule,
      });
    }

    // LEADER / ADMIN: 매니저 화면 (ADMIN은 조직 전체, LEADER는 본인이 관리하는 팀원 + 소속 프로젝트 범위)
    const isOrgWide = role === 'ADMIN';

    const subordinates = isOrgWide
      ? await prisma.user.findMany({ where: { organizationId, isActive: true, role: { not: 'ADMIN' } }, select: { id: true, name: true } })
      : await prisma.user.findMany({ where: { organizationId, isActive: true, managerId: userId }, select: { id: true, name: true } });
    const subordinateIds = subordinates.map((s) => s.id);

    const myProjects = isOrgWide
      ? await prisma.project.findMany({ where: { organizationId, status: 'ACTIVE' }, select: { id: true, name: true } })
      : await prisma.project.findMany({
          where: { organizationId, status: 'ACTIVE', members: { some: { userId } } },
          select: { id: true, name: true },
        });
    const myProjectIds = myProjects.map((p) => p.id);

    const scopedTaskWhere = isOrgWide
      ? { organizationId, isGroup: false }
      : { organizationId, isGroup: false, OR: [{ projectId: { in: myProjectIds } }, { workerId: { in: subordinateIds } }] };

    const scopedTasks = await prisma.task.findMany({
      where: scopedTaskWhere,
      select: { ...taskListSelect, worker: { select: { id: true, name: true, isActive: true } } },
    });
    const notDoneScoped = scopedTasks.filter((t) => t.status !== 'DONE');
    const overdueScoped = notDoneScoped.filter((t) => t.targetDate && startOfDay(t.targetDate) < today);
    const unassignedScoped = notDoneScoped.filter((t) => !(t.worker as any)?.isActive);

    const projectProgress = await Promise.all(
      myProjects.map(async (p) => {
        const tasks = await prisma.task.findMany({ where: { projectId: p.id, isGroup: false }, select: { status: true } });
        const total = tasks.length;
        const done = tasks.filter((t) => t.status === 'DONE').length;
        return { projectId: p.id, name: p.name, total, done, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
      })
    );

    const byWorker = subordinates.map((s) => {
      const tasks = notDoneScoped.filter((t) => t.workerId === s.id);
      return { userId: s.id, name: s.name, activeTasks: tasks.length, overdueTasks: tasks.filter((t) => t.targetDate && startOfDay(t.targetDate) < today).length };
    });

    const weekStart = startOfWeek(new Date());
    const reportsThisWeek = await prisma.weeklyReport.findMany({
      where: { authorId: { in: subordinateIds }, periodStart: { gte: weekStart } },
      select: { authorId: true },
    });
    const reportedIds = new Set(reportsThisWeek.map((r) => r.authorId));
    const missingWeeklyReport = subordinates.filter((s) => !reportedIds.has(s.id));

    const pendingApprovals = await prisma.request.findMany({
      where: isOrgWide
        ? { organizationId, status: 'PENDING', OR: [{ approverId: userId }, { approverId: null }] }
        : { organizationId, status: 'PENDING', approverId: userId },
      select: { id: true, type: true, title: true, requester: { select: { id: true, name: true } }, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    return successResponse({
      role: isOrgWide ? 'ADMIN' : 'LEADER',
      projectProgress,
      overdueTasks: overdueScoped.slice(0, 10),
      unassignedTasks: unassignedScoped.slice(0, 10),
      byWorker,
      missingWeeklyReport,
      pendingApprovals,
    });
  } catch (err) {
    console.error(err);
    return errorResponse('대시보드 데이터 조회 중 오류가 발생했습니다.', 500);
  }
}
