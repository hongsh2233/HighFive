import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { tasks, project, getStatuses, task } from './fixtures';
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), hub: vi.fn(), draft: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock('@/hooks/useWorkHub', () => ({ useWorkHub: mocks.hub }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));
vi.mock('@/components/kanban/KanbanBoard', () => ({ default: () => <div>기존 칸반</div> }));
import WorkHome from '../src/components/work/WorkHome';
import TaskViews from '../src/components/work/TaskViews';
import JiaSidePanel from '../src/components/work/JiaSidePanel';
afterEach(cleanup);
function setup() {
  mocks.hub.mockReturnValue({ user: { id: '7', name: '지아', role: 'WORKER' }, tasks, projects: [project], loading: false, error: '', reload: vi.fn(), getStatuses });
  mocks.get.mockImplementation((url: string) => Promise.resolve({ data: { data: url === '/notifications' ? { notifications: [{ id: 1, taskId: 1, isRead: false, type: 'COMMENT_MENTION', message: '검토 요청 멘션' }] } : { features: { taskSummary: true, dailyBriefing: true } } } }));
  mocks.post.mockResolvedValue({ data: { data: { summary: '최근 댓글 기반 요약', briefing: '오늘 검수부터 확인하세요.' } } });
}
describe('주요 업무 UI', () => {
  it('내 업무 필터는 본인 업무만 보여주며 커스텀 완료를 포함한다', async () => {
    setup(); render(<WorkHome personal />);
    expect(screen.queryByText('다른 사람 업무')).toBeNull();
    await userEvent.click(screen.getByRole('tab', { name: '지연' }));
    expect(screen.getByText('API 점검')).toBeTruthy();
    expect(screen.queryByText('완료된 검토')).toBeNull();
    await userEvent.click(screen.getByRole('tab', { name: '완료' }));
    expect(screen.getByText('완료된 검토')).toBeTruthy();
  });
  it('HOME은 멘션과 프로젝트 위험을 보여주고 요청 시에만 AI를 호출한다', async () => {
    setup(); render(<WorkHome />);
    await screen.findByText('검토 요청 멘션');
    expect(mocks.post).not.toHaveBeenCalled();
    await waitFor(() => expect((screen.getByRole('button', { name: 'AI 브리핑 생성' }) as HTMLButtonElement).disabled).toBe(false));
    await userEvent.click(screen.getByRole('button', { name: 'AI 브리핑 생성' }));
    expect(await screen.findByText('오늘 검수부터 확인하세요.')).toBeTruthy();
    expect(mocks.post).toHaveBeenCalledWith('/ai/daily-briefing');
  });
  it('실패 시 빈 현황을 보여주는 대신 다시 시도할 수 있다', async () => {
    setup(); const reload = vi.fn(); mocks.hub.mockReturnValue({ loading: false, error: '조회 실패', reload });
    render(<WorkHome personal />); await userEvent.click(screen.getByRole('button', { name: '다시 시도' })); expect(reload).toHaveBeenCalledOnce();
  });
  it('List·Calendar·Assignee 전환과 업무 상세 링크를 제공한다', async () => {
    setup(); render(<TaskViews tasks={tasks} getStatuses={getStatuses} />);
    expect(screen.getByText('기존 칸반')).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'List' }));
    expect(screen.getByRole('link', { name: /디자인 검수/ }).getAttribute('href')).toBe('/tasks/1');
    await userEvent.click(screen.getByRole('tab', { name: 'Calendar' }));
    expect(screen.getByRole('region', { name: '업무 마감 캘린더' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '다음 달' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Assignee' }));
    expect(screen.getByRole('heading', { name: /지아/ })).toBeTruthy();
  });
  it('JIA 초안은 댓글 입력란 전달까지만 하며 쓰기 API를 호출하지 않는다', async () => {
    setup(); render(<JiaSidePanel task={task()} getStatuses={getStatuses} onDraft={mocks.draft} />);
    await userEvent.click(screen.getByRole('button', { name: '댓글 초안' }));
    expect(screen.getByText('기본 확인 문안 · AI 생성 아님')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '댓글 입력란에 넣기' }));
    expect(mocks.draft).toHaveBeenCalledWith(expect.stringContaining('완료 예상일'));
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it('JIA 요약은 기존 API와 taskId로 요청한다', async () => {
    setup(); render(<JiaSidePanel task={task()} getStatuses={getStatuses} />);
    await waitFor(() => expect((screen.getByRole('button', { name: '업무 요약' }) as HTMLButtonElement).disabled).toBe(false));
    await userEvent.click(screen.getByRole('button', { name: '업무 요약' }));
    expect(await screen.findByText('최근 댓글 기반 요약')).toBeTruthy();
    expect(mocks.post).toHaveBeenCalledWith('/ai/task-summary', { taskId: 1 });
  });
});
