import { prisma } from './db';

export interface EffectiveStatus {
  code: string;
  label: string;
  color: string | null;
  order: number;
  isProgress: boolean;
  isDone: boolean;
}

export const DEFAULT_STATUSES: EffectiveStatus[] = [
  { code: 'ASSIGNED', label: '배정됨', color: '#1D4ED8', order: 0, isProgress: false, isDone: false },
  { code: 'PROGRESS', label: '진행중', color: '#92400E', order: 1, isProgress: true, isDone: false },
  { code: 'REVIEW', label: '검수중', color: '#5B21B6', order: 2, isProgress: false, isDone: false },
  { code: 'QA', label: 'QA', color: '#155E75', order: 3, isProgress: false, isDone: false },
  { code: 'DONE', label: '완료', color: '#065F46', order: 4, isProgress: false, isDone: true },
];

// 프로젝트에 커스텀 상태가 저장되어 있으면 그것을, 없으면(또는 프로젝트 미지정) 기본 5단계를 반환
export async function getProjectStatuses(projectId: number | null | undefined): Promise<EffectiveStatus[]> {
  if (projectId) {
    const rows = await prisma.projectStatus.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });
    if (rows.length > 0) {
      return rows.map((r) => ({
        code: r.code,
        label: r.label,
        color: r.color,
        order: r.order,
        isProgress: r.isProgress,
        isDone: r.isDone,
      }));
    }
  }
  return DEFAULT_STATUSES;
}

export async function resolveStatus(projectId: number | null | undefined, code: string): Promise<EffectiveStatus | null> {
  const statuses = await getProjectStatuses(projectId);
  return statuses.find((s) => s.code === code) ?? null;
}

export async function isValidStatus(projectId: number | null | undefined, code: string): Promise<boolean> {
  return (await resolveStatus(projectId, code)) !== null;
}
