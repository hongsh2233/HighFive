import { prisma } from './db';

// 법인카드 명세서 입력 기간 계산. 카드사 명세서는 통상 그 다음달 초에 나오므로,
// "이번달 1~5일" 입력창에서 다루는 대상은 "지난달" 사용분이다.
function pad(n: number) {
  return String(n).padStart(2, '0');
}

// 오늘 기준으로 입력해야 할 명세서 대상 월("YYYY-MM", 지난달)과 입력창 오픈 여부를 계산.
export function getCurrentStatementWindow(now: Date = new Date()): { statementMonth: string; isWindowOpen: boolean } {
  const day = now.getDate();
  const isWindowOpen = day >= 1 && day <= 5;
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const statementMonth = `${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}`;
  return { statementMonth, isWindowOpen };
}

// 특정 기간(period)이 지금 수정 가능한 상태인지: DRAFT/REJECTED이면서 입력창이 열려있거나(현재월 대상),
// REJECTED는 창이 닫혀 있어도 재입력할 수 있게 예외를 둔다(반려 후 수정 못 하면 프로세스가 막히므로).
export function isPeriodEditable(period: { statementMonth: string; status: string }, now: Date = new Date()): boolean {
  if (period.status === 'REJECTED') return true;
  if (period.status !== 'DRAFT') return false;
  const { statementMonth, isWindowOpen } = getCurrentStatementWindow(now);
  return period.statementMonth === statementMonth && isWindowOpen;
}

// 지금 입력 가능한 기간(현재 창이 열려 있으면 이번 대상월 DRAFT를 찾거나 새로 만듦)을 반환.
// 창이 닫혀 있으면 새 기간을 만들지 않고 null(단, 기존 REJECTED 기간이 있으면 그걸 반환해 재입력 가능하게 함).
export async function getOrCreateEditablePeriod(organizationId: number) {
  const { statementMonth, isWindowOpen } = getCurrentStatementWindow();

  const existing = await prisma.cardStatementPeriod.findUnique({
    where: { organizationId_statementMonth: { organizationId, statementMonth } },
  });
  if (existing) {
    return isPeriodEditable(existing) ? existing : null;
  }
  if (!isWindowOpen) return null;

  return prisma.cardStatementPeriod.create({
    data: { organizationId, statementMonth, status: 'DRAFT' },
  });
}
