import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { task, getStatuses } from './fixtures';
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ default: mocks }));
vi.mock('@/components/work/JiaSidePanel', () => ({ default: () => null }));
import TaskDetailPanel from '../src/components/TaskDetailPanel';
afterEach(cleanup);
const props = { onClose: vi.fn(), getStatuses, workers: [], canEdit: true, onUpdateStatus: vi.fn(), onUpdateTask: vi.fn(), width: 420, onResizeStart: vi.fn() };
function setup() { mocks.get.mockImplementation((url: string) => Promise.resolve({ data: { data: url.endsWith('/comments') ? [] : task({ id: Number(url.split('/').pop()), title: url.endsWith('/2') ? '두 번째 업무' : '첫 번째 업무' }) } })); }
describe('빠른 업무 상세 안정성', () => {
  it('늦은 이전 업무 응답이 새 업무를 덮어쓰지 않는다', async () => {
    setup(); let oldResponse!: (value: unknown) => void;
    mocks.get.mockImplementationOnce(() => new Promise(resolve => { oldResponse = resolve; }));
    const view = render(<TaskDetailPanel {...props} taskId={1} />);
    view.rerender(<TaskDetailPanel {...props} taskId={2} />);
    await screen.findByRole('heading', { name: '두 번째 업무' });
    await act(async () => oldResponse({ data: { data: task({ id: 1, title: '오래된 업무 응답' }) } }));
    expect(screen.queryByText('오래된 업무 응답')).toBeNull();
    expect(screen.getByRole('heading', { name: '두 번째 업무' })).toBeTruthy();
  });
  it('업무를 바꾸어도 댓글 초안을 다른 업무에 옮기지 않고 원래 업무에 보존한다', async () => {
    setup(); const view = render(<TaskDetailPanel {...props} taskId={1} />);
    await screen.findByRole('heading', { name: '첫 번째 업무' });
    await userEvent.type(screen.getByPlaceholderText('댓글을 입력하세요...'), '첫 업무에만 남길 초안');
    view.rerender(<TaskDetailPanel {...props} taskId={2} />);
    await screen.findByRole('heading', { name: '두 번째 업무' });
    expect((screen.getByPlaceholderText('댓글을 입력하세요...') as HTMLTextAreaElement).value).toBe('');
    view.rerender(<TaskDetailPanel {...props} taskId={1} />);
    await screen.findByRole('heading', { name: '첫 번째 업무' });
    expect((screen.getByPlaceholderText('댓글을 입력하세요...') as HTMLTextAreaElement).value).toBe('첫 업무에만 남길 초안');
  });
  it('댓글 저장 실패를 표시하며 입력 내용을 보존한다', async () => {
    setup(); mocks.post.mockRejectedValue(new Error('network'));
    render(<TaskDetailPanel {...props} taskId={1} />); await screen.findByRole('heading', { name: '첫 번째 업무' });
    await userEvent.type(screen.getByPlaceholderText('댓글을 입력하세요...'), '저장할 내용');
    await userEvent.click(screen.getByRole('button', { name: '등록' }));
    await screen.findByRole('alert');
    expect((screen.getByPlaceholderText('댓글을 입력하세요...') as HTMLTextAreaElement).value).toBe('저장할 내용');
  });
  it('댓글 저장 중 추가 입력한 내용은 성공 응답이 와도 지우지 않는다', async () => {
    setup(); let finish!: (value: unknown) => void;
    mocks.post.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<TaskDetailPanel {...props} taskId={1} />); await screen.findByRole('heading', { name: '첫 번째 업무' });
    await userEvent.type(screen.getByPlaceholderText('댓글을 입력하세요...'), '먼저 저장');
    await userEvent.click(screen.getByRole('button', { name: '등록' }));
    await userEvent.type(screen.getByPlaceholderText('댓글을 입력하세요...'), ' 추가 입력');
    await act(async () => finish({ data: { data: { id: 1, content: '먼저 저장', author: { name: '지아' }, createdAt: new Date().toISOString() } } }));
    expect((screen.getByPlaceholderText('댓글을 입력하세요...') as HTMLTextAreaElement).value).toBe('먼저 저장 추가 입력');
  });
});
