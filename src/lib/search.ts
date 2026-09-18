import { prisma } from './db';

export interface SearchTaskResult {
  id: number;
  title: string;
  status: string;
  snippet: string;
  projectId: number | null;
  projectName: string | null;
  workerName: string | null;
}

export interface SearchWikiResult {
  id: number;
  title: string;
  snippet: string;
  projectId: number;
  projectName: string | null;
}

export interface SearchProjectResult {
  id: number;
  name: string;
  snippet: string;
  status: string;
}

export interface SearchMeetingResult {
  id: number;
  title: string;
  snippet: string;
  projectId: number;
  projectName: string | null;
  meetingDate: string | null;
}

export interface SearchWeeklyReportResult {
  id: number;
  snippet: string;
  projectId: number;
  projectName: string | null;
  periodStart: string;
  authorName: string | null;
}

export interface SearchAnnouncementResult {
  id: number;
  snippet: string;
  createdAt: string;
}

export interface SearchFileResult {
  id: number;
  filename: string;
  taskId: number;
  taskTitle: string;
}

export interface SearchMemberResult {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface SearchResults {
  tasks: SearchTaskResult[];
  wiki: SearchWikiResult[];
  projects: SearchProjectResult[];
  meetings: SearchMeetingResult[];
  weeklyReports: SearchWeeklyReportResult[];
  announcements: SearchAnnouncementResult[];
  files: SearchFileResult[];
  members: SearchMemberResult[];
}

export interface SearchContext {
  userId: number;
  role: string;
}

export interface SearchFilters {
  projectId?: number;
  authorId?: number;
  from?: Date;
  to?: Date;
  types?: string[]; // 지정하면 이 타입만 검색(성능/노이즈 절감). 비우면 전체.
}

const EMPTY_RESULTS: SearchResults = { tasks: [], wiki: [], projects: [], meetings: [], weeklyReports: [], announcements: [], files: [], members: [] };

// 검색 대상이 되는 "접근 가능한 프로젝트 id 목록"을 role별로 계산.
// ADMIN은 null(=전체), 그 외는 소속 프로젝트로 제한(위키/회의록/주간보고/프로젝트 검색에 공용으로 사용).
async function getAccessibleProjectIds(organizationId: number | undefined, ctx: SearchContext): Promise<number[] | null> {
  if (ctx.role === 'ADMIN') return null;
  const memberships = await prisma.projectMember.findMany({ where: { userId: ctx.userId }, select: { projectId: true } });
  const ids = memberships.map((m) => m.projectId);
  if (ctx.role === 'LEADER' || ctx.role === 'PARTNER') return ids;
  // WORKER: 소속 멤버십 + 본인이 담당/등록한 업무가 있는 프로젝트까지 포함(기존 /api/projects와 동일 원칙)
  const taskProjects = await prisma.task.findMany({
    where: { organizationId, OR: [{ workerId: ctx.userId }, { registrantId: ctx.userId }] },
    select: { projectId: true },
  });
  const set = new Set(ids);
  taskProjects.forEach((t) => { if (t.projectId) set.add(t.projectId); });
  return Array.from(set);
}

function taskVisibilityWhere(organizationId: number | undefined, ctx: SearchContext, accessibleProjectIds: number[] | null) {
  const base: any = { organizationId };
  if (ctx.role === 'ADMIN') return base;
  if (ctx.role === 'WORKER') {
    return { ...base, OR: [{ workerId: ctx.userId }, { registrantId: ctx.userId }] };
  }
  if (ctx.role === 'LEADER') {
    return { ...base, projectId: { in: accessibleProjectIds?.length ? accessibleProjectIds : [-1] } };
  }
  if (ctx.role === 'PARTNER') {
    return {
      ...base,
      projectId: { in: accessibleProjectIds?.length ? accessibleProjectIds : [-1] },
      OR: [{ workerId: ctx.userId }, { partnerVisible: true }],
    };
  }
  return base;
}

export async function runSearch(
  organizationId: number | undefined,
  q: string,
  ctx: SearchContext,
  filters: SearchFilters = {}
): Promise<SearchResults> {
  if (!q.trim()) return EMPTY_RESULTS;

  const wantsType = (t: string) => !filters.types?.length || filters.types.includes(t);
  const dateFilter = filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined;

  const accessibleProjectIds = await getAccessibleProjectIds(organizationId, ctx);
  const projectScopeWhere = accessibleProjectIds === null ? {} : { id: { in: accessibleProjectIds.length ? accessibleProjectIds : [-1] } };
  const projectIdScopeWhere = accessibleProjectIds === null ? {} : { projectId: { in: accessibleProjectIds.length ? accessibleProjectIds : [-1] } };

  const taskWhere = taskVisibilityWhere(organizationId, ctx, accessibleProjectIds);
  const commentVisibility = ctx.role === 'PARTNER' ? { visibility: 'PARTNER_VISIBLE' } : {};

  const [
    tasks,
    fieldMatches,
    commentMatches,
    wiki,
    projects,
    meetings,
    weeklyReports,
    announcements,
    files,
    members,
  ] = await Promise.all([
    !wantsType('tasks') ? [] : prisma.task.findMany({
      where: {
        AND: [
          taskWhere,
          { OR: [{ title: { contains: q, mode: 'insensitive' } }, { notes: { contains: q, mode: 'insensitive' } }] },
          ...(filters.projectId ? [{ projectId: filters.projectId }] : []),
          ...(filters.authorId ? [{ OR: [{ workerId: filters.authorId }, { registrantId: filters.authorId }] }] : []),
          ...(dateFilter ? [{ createdAt: dateFilter }] : []),
        ],
      },
      select: {
        id: true, title: true, status: true, notes: true,
        project: { select: { id: true, name: true } },
        worker: { select: { id: true, name: true } },
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    }),
    !wantsType('tasks') ? [] : prisma.taskFieldValue.findMany({
      where: { value: { contains: q, mode: 'insensitive' }, task: taskWhere },
      select: {
        task: {
          select: { id: true, title: true, status: true, notes: true, project: { select: { id: true, name: true } }, worker: { select: { id: true, name: true } } },
        },
      },
      take: 20,
    }),
    !wantsType('tasks') ? [] : prisma.taskComment.findMany({
      where: { content: { contains: q, mode: 'insensitive' }, task: taskWhere, ...commentVisibility },
      select: {
        content: true,
        task: { select: { id: true, title: true, status: true, notes: true, project: { select: { id: true, name: true } }, worker: { select: { id: true, name: true } } } },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
    !wantsType('wiki') ? [] : prisma.wikiPage.findMany({
      where: {
        project: { organizationId, ...projectScopeWhere },
        OR: [{ title: { contains: q, mode: 'insensitive' } }, { content: { contains: q, mode: 'insensitive' } }],
        ...(filters.projectId ? { projectId: filters.projectId } : {}),
        ...(filters.authorId ? { authorId: filters.authorId } : {}),
        ...(dateFilter ? { updatedAt: dateFilter } : {}),
      },
      select: { id: true, title: true, content: true, projectId: true, project: { select: { name: true } } },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    }),
    !wantsType('projects') ? [] : prisma.project.findMany({
      where: {
        organizationId,
        ...projectScopeWhere,
        OR: [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }],
      },
      select: { id: true, name: true, description: true, status: true },
      take: 10,
    }),
    !wantsType('meetings') ? [] : prisma.meetingNote.findMany({
      where: {
        project: { organizationId },
        ...projectIdScopeWhere,
        OR: [{ title: { contains: q, mode: 'insensitive' } }, { content: { contains: q, mode: 'insensitive' } }],
        ...(filters.projectId ? { projectId: filters.projectId } : {}),
        ...(filters.authorId ? { authorId: filters.authorId } : {}),
        ...(dateFilter ? { updatedAt: dateFilter } : {}),
      },
      select: { id: true, title: true, content: true, projectId: true, meetingDate: true, project: { select: { name: true } } },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    }),
    !wantsType('weeklyReports') ? [] : prisma.weeklyReport.findMany({
      where: {
        project: { organizationId },
        ...projectIdScopeWhere,
        summary: { contains: q, mode: 'insensitive' },
        ...(filters.projectId ? { projectId: filters.projectId } : {}),
        ...(filters.authorId ? { authorId: filters.authorId } : {}),
        ...(dateFilter ? { periodStart: dateFilter } : {}),
      },
      select: { id: true, summary: true, projectId: true, periodStart: true, project: { select: { name: true } }, author: { select: { name: true } } },
      take: 10,
      orderBy: { periodStart: 'desc' },
    }),
    !wantsType('announcements') ? [] : prisma.announcement.findMany({
      where: {
        OR: [{ organizationId }, { organizationId: null }],
        isActive: true,
        content: { contains: q, mode: 'insensitive' },
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      select: { id: true, content: true, createdAt: true },
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
    !wantsType('files') ? [] : prisma.taskAttachment.findMany({
      where: {
        filename: { contains: q, mode: 'insensitive' },
        task: taskWhere,
      },
      select: { id: true, filename: true, task: { select: { id: true, title: true } } },
      take: 15,
    }),
    !wantsType('members') ? [] : prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }],
        // PARTNER는 자기 조직 전체 직원 명단을 검색할 수 없고, 같은 프로젝트에 소속된 사람만 검색 가능
        ...(ctx.role === 'PARTNER' ? { projectMembers: { some: { projectId: { in: accessibleProjectIds?.length ? accessibleProjectIds : [-1] } } } } : {}),
      },
      select: { id: true, name: true, email: true, role: true },
      take: 10,
    }),
  ]);

  type TaskRow = typeof tasks[number];
  const taskMap = new Map<number, TaskRow>(tasks.map((t: TaskRow) => [t.id, t] as [number, TaskRow]));
  const commentSnippetMap = new Map<number, string>();
  for (const fm of fieldMatches) {
    if (!taskMap.has(fm.task.id)) taskMap.set(fm.task.id, fm.task);
  }
  for (const cm of commentMatches) {
    if (!taskMap.has(cm.task.id)) taskMap.set(cm.task.id, cm.task);
    if (!commentSnippetMap.has(cm.task.id)) commentSnippetMap.set(cm.task.id, cm.content);
  }

  const taskResults: SearchTaskResult[] = Array.from(taskMap.values()).slice(0, 20).map((t: TaskRow) => {
    const commentSnippet = commentSnippetMap.get(t.id);
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      snippet: commentSnippet ? `💬 ${commentSnippet.slice(0, 80)}` : (t.notes ? t.notes.slice(0, 80) : ''),
      projectId: t.project?.id ?? null,
      projectName: t.project?.name ?? null,
      workerName: t.worker?.name ?? null,
    };
  });

  const snippetAround = (text: string) => {
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    return idx >= 0 ? text.slice(Math.max(0, idx - 20), idx + 60) : text.slice(0, 80);
  };

  type WikiRow = typeof wiki[number];
  const wikiResults: SearchWikiResult[] = wiki.map((w: WikiRow) => ({
    id: w.id, title: w.title, snippet: snippetAround(w.content), projectId: w.projectId, projectName: w.project?.name ?? null,
  }));

  const projectResults: SearchProjectResult[] = projects.map((p) => ({
    id: p.id, name: p.name, snippet: p.description ? snippetAround(p.description) : '', status: p.status,
  }));

  const meetingResults: SearchMeetingResult[] = meetings.map((m) => ({
    id: m.id, title: m.title, snippet: snippetAround(m.content), projectId: m.projectId,
    projectName: m.project?.name ?? null, meetingDate: m.meetingDate ? m.meetingDate.toISOString() : null,
  }));

  const weeklyReportResults: SearchWeeklyReportResult[] = weeklyReports.map((w) => ({
    id: w.id, snippet: w.summary ? snippetAround(w.summary) : '', projectId: w.projectId,
    projectName: w.project?.name ?? null, periodStart: w.periodStart.toISOString(), authorName: w.author?.name ?? null,
  }));

  const announcementResults: SearchAnnouncementResult[] = announcements.map((a) => ({
    id: a.id, snippet: snippetAround(a.content), createdAt: a.createdAt.toISOString(),
  }));

  const fileResults: SearchFileResult[] = files.map((f) => ({
    id: f.id, filename: f.filename, taskId: f.task.id, taskTitle: f.task.title,
  }));

  const memberResults: SearchMemberResult[] = members.map((m) => ({
    id: m.id, name: m.name, email: m.email, role: m.role,
  }));

  return {
    tasks: taskResults,
    wiki: wikiResults,
    projects: projectResults,
    meetings: meetingResults,
    weeklyReports: weeklyReportResults,
    announcements: announcementResults,
    files: fileResults,
    members: memberResults,
  };
}
