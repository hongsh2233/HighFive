import { expect, test, type Page } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import { tasks, project, statuses } from '../fixtures';
const secret = 'highfive-phase-one-local-test-secret';
async function signIn(page: Page, role = 'ADMIN') {
  const user = { id: '7', name: '지아', email: 'test@example.com', role, organizationId: 1, organizationSlug: 'exwave', enabledFeatures: ['tasks', 'wiki', 'stats', 'requests', 'integrations'], isActive: true };
  const token = await encode({ secret, token: { ...user, sub: '7' }, maxAge: 3600 });
  await page.context().addCookies([{ name: 'next-auth.session-token', value: token, domain: 'localhost', path: '/' }]);
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    let data: unknown = [];
    if (path === '/api/auth/session') { await route.fulfill({ json: { user, expires: new Date(Date.now() + 3600000).toISOString() } }); return; }
    if (path === '/api/tasks') data = { data: tasks, total: tasks.length, page: 1, limit: 200 };
    else if (path === '/api/projects') data = [project];
    else if (path === '/api/projects/statuses') data = { byProject: { 3: statuses }, default: statuses };
    else if (path === '/api/projects/3/milestones') data = [{ id: 1, title: '1차 검수', dueDate: tasks[0].targetDate, isDone: false }];
    else if (path === '/api/settings/organization') data = { displayName: 'HighFive', name: 'HighFive' };
    else if (path === '/api/settings/audit') data = { logs: [] };
    else if (path === '/api/plan-config') data = { features: user.enabledFeatures, knowledgeBaseMode: 'WIKI' };
    else if (path === '/api/settings/ai/status') data = { features: { taskSummary: false, dailyBriefing: false } };
    else if (path === '/api/notifications') data = { notifications: [], unreadCount: 0 };
    else if (path === '/api/users/me') data = { ...user, capabilities: {} };
    else if (path === '/api/tasks/1') data = { ...tasks[0], attachments: [], checklistItems: [], timeLogs: [], subTasks: [] };
    else if (path === '/api/tasks/1/timelogs') data = { logs: [], totalHours: 0 };
    else if (path === '/api/tasks/1/dependencies') data = [];
    else if (path === '/api/notifications/mute') data = { muted: false };
    else if (path === '/api/tasks/calendar') data = { tasksByDate: {}, leavesByDate: {} };
    else if (path === '/api/dashboard/summary') data = { role: 'ADMIN', projectProgress: [], overdueTasks: [], unassignedTasks: [], byWorker: [], missingWeeklyReport: [], pendingApprovals: [] };
    await route.fulfill({ json: { success: true, data } });
  });
}
test('비로그인 보호 라우트는 조직 로그인으로 이동한다', async ({ page }) => {
  await page.goto('/exwave/my-work');
  await expect(page).toHaveURL(/\/exwave\/login/);
});
test('HOME, 내 업무, 프로젝트 개요와 상세의 흐름', async ({ page }, testInfo) => {
  page.on('pageerror', error => console.error(error.stack));
  await signIn(page);
  await page.goto('/exwave/dashboard');
  await expect(page.getByRole('heading', { name: '지아님, 오늘의 업무 브리핑' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'JIA 업무 브리핑' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('home-desktop.png'), fullPage: true });
  await page.goto('/exwave/my-work');
  await expect(page.getByRole('heading', { name: '내 업무', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: '지연', exact: true }).click();
  await expect(page.getByText('API 점검', { exact: true })).toBeVisible();
  await expect(page.getByText('완료된 검토', { exact: true })).toHaveCount(0);
  await page.goto('/exwave/projects/3');
  await expect(page.getByRole('heading', { name: 'HighFive', exact: true })).toBeVisible();
  await expect(page.getByText('1차 검수')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('project-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: '업무', exact: true }).click();
  await page.getByRole('tab', { name: 'List' }).click();
  await page.getByRole('link', { name: /디자인 검수/ }).click();
  await expect(page.getByRole('heading', { name: '디자인 검수', exact: true })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'JIA 업무 비서' })).toBeVisible();
  await page.getByRole('button', { name: '댓글 초안', exact: true }).click();
  await page.getByRole('button', { name: '댓글 입력란에 넣기' }).click();
  await expect(page.locator('textarea').filter({ hasNot: page.locator('[disabled]') }).last()).toHaveValue(/완료 예상일/);
  await page.screenshot({ path: testInfo.outputPath('detail-desktop.png'), fullPage: true });
});
test('업무 보기 전환과 Tablet 가로 넘침', async ({ page }, testInfo) => {
  await signIn(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/exwave/tasks/kanban');
  await expect(page.getByRole('heading', { name: '업무 보드', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Assignee' }).click();
  await expect(page.getByRole('heading', { name: /지아/ })).toBeVisible();
  await page.getByRole('tab', { name: 'Calendar' }).click();
  await expect(page.getByRole('region', { name: '업무 마감 캘린더' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('board-tablet.png'), fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.goto('/exwave/projects/3');
  await page.screenshot({ path: testInfo.outputPath('project-tablet.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
