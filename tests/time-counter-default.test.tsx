import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), push: vi.fn(), auth: { user: { id: 1, name: '홍성호', role: 'ADMIN' }, isLoading: false }, params: new URLSearchParams() }));
vi.mock('axios', () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }), useSearchParams: () => mocks.params }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('react-quill-new/dist/quill.snow.css', () => ({}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mocks.auth }));
import TaskCreatePage from '../src/app/tasks/create/page';
afterEach(cleanup);
function setup() {
  mocks.get.mockImplementation((url: string) => Promise.resolve({ data: { data: url === '/api/projects' ? [] : url.startsWith('/api/users') ? [{ id: 1, name: '홍성호' }] : { features: {} } } }));
  mocks.post.mockResolvedValue({ data: { data: { id: 10 } } });
}
describe('업무 등록 시 시간카운터 기본값 (HF-000067)', () => {
  it('등록 화면의 시간카운터 체크박스는 기본 해제이고, 그대로 등록하면 false로 보낸다', async () => {
    setup();
    render(<TaskCreatePage />);
    const checkbox = await screen.findByRole('checkbox', { name: /시간카운터 사용/ }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    await userEvent.type(screen.getByPlaceholderText('업무제목을 입력하세요.'), '새 업무');
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/api/users?role=WORKER'));
    await userEvent.click(screen.getByRole('button', { name: '업무 등록' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalled());
    expect(mocks.post.mock.calls[0][0]).toBe('/api/tasks');
    expect(mocks.post.mock.calls[0][1]).toMatchObject({ title: '새 업무', workerId: 1, timeCounterEnabled: false });
  });
  it('필요할 때 체크하면 true로 보낸다', async () => {
    setup();
    render(<TaskCreatePage />);
    const checkbox = await screen.findByRole('checkbox', { name: /시간카운터 사용/ });
    await userEvent.click(checkbox);
    await userEvent.type(screen.getByPlaceholderText('업무제목을 입력하세요.'), '시간 재는 업무');
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/api/users?role=WORKER'));
    await userEvent.click(screen.getByRole('button', { name: '업무 등록' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalled());
    expect(mocks.post.mock.calls[0][1]).toMatchObject({ timeCounterEnabled: true });
  });
});
