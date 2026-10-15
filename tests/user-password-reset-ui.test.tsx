import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  confirm: vi.fn(),
  auth: { user: { id: '1', name: '홍성호', role: 'ADMIN' } as { id: string; name: string; role: string }, isLoading: false },
}));
vi.mock('@/lib/api-client', () => ({ default: { get: mocks.get, post: mocks.post, patch: vi.fn(), delete: vi.fn() } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/components/common/DialogProvider', () => ({ useDialog: () => ({ confirm: mocks.confirm, alertDialog: vi.fn() }) }));
import UsersPage from '../src/app/users/page';

const member = (id: number, name: string, role: string) => ({ id, name, role, email: `u${id}@example.com`, isActive: true, createdAt: '2026-10-01T00:00:00Z', projectMembers: [] });

beforeEach(() => {
  mocks.auth.user = { id: '1', name: '홍성호', role: 'ADMIN' };
  mocks.get.mockImplementation((url: string) => Promise.resolve({ data: { data: url === '/users'
    ? [member(1, '홍성호', 'ADMIN'), member(7, '김팀원', 'WORKER'), member(8, '최고관리자', 'SUPERADMIN')]
    : [] } }));
  mocks.post.mockResolvedValue({ data: { data: { id: 7, name: '김팀원', tempPassword: '0123456789abcdef' } } });
  mocks.confirm.mockResolvedValue(true);
});
afterEach(cleanup);

const rowOf = (name: string) => screen.getAllByText(name).map((el) => el.closest('tr')).find(Boolean) as HTMLElement;

describe('팀원 관리 — 비밀번호 초기화 (HF-000059)', () => {
  it('관리자에게는 팀원 행에만 버튼이 보이고, 본인·최고관리자 행에는 없다', async () => {
    render(<UsersPage />);
    await screen.findAllByText('김팀원');
    expect(within(rowOf('김팀원')).getByRole('button', { name: '비밀번호 초기화' })).toBeTruthy();
    expect(within(rowOf('홍성호')).queryByRole('button', { name: '비밀번호 초기화' })).toBeNull();
    expect(within(rowOf('최고관리자')).queryByRole('button', { name: '비밀번호 초기화' })).toBeNull();
  });

  it('관리자가 아니면 버튼이 없다', async () => {
    mocks.auth.user = { id: '3', name: '매니저', role: 'LEADER' };
    render(<UsersPage />);
    await screen.findByText('관리자만 접근 가능합니다.');
    expect(screen.queryByRole('button', { name: '비밀번호 초기화' })).toBeNull();
    expect(mocks.get).not.toHaveBeenCalledWith('/users');
  });

  it('확인 후 API를 부르고 임시 비밀번호를 모달로 1회 보여준다 (복사 가능)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<UsersPage />);
    await screen.findAllByText('김팀원');
    await userEvent.click(within(rowOf('김팀원')).getByRole('button', { name: '비밀번호 초기화' }));

    expect(mocks.confirm).toHaveBeenCalledWith(
      '김팀원님의 비밀번호를 초기화할까요? 임시 비밀번호가 발급되고, 다음 로그인 때 새 비밀번호로 바꿔야 해요.',
      expect.objectContaining({ confirmText: '초기화' })
    );
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/users/7/reset-password'));
    expect(await screen.findByText('비밀번호 초기화 완료')).toBeTruthy();
    expect(screen.getByText('0123456789abcdef')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '복사' }));
    expect(writeText).toHaveBeenCalledWith('0123456789abcdef');
    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(screen.queryByText('0123456789abcdef')).toBeNull();
  });

  it('취소하면 API를 부르지 않는다', async () => {
    mocks.confirm.mockResolvedValue(false);
    render(<UsersPage />);
    await screen.findAllByText('김팀원');
    await userEvent.click(within(rowOf('김팀원')).getByRole('button', { name: '비밀번호 초기화' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('실패하면 서버 메시지를 보여주고 모달은 열지 않는다', async () => {
    mocks.post.mockRejectedValue({ response: { data: { message: '최고관리자의 비밀번호는 초기화할 수 없습니다.' } } });
    render(<UsersPage />);
    await screen.findAllByText('김팀원');
    await userEvent.click(within(rowOf('김팀원')).getByRole('button', { name: '비밀번호 초기화' }));
    expect(await screen.findByText('최고관리자의 비밀번호는 초기화할 수 없습니다.')).toBeTruthy();
    expect(screen.queryByText('비밀번호 초기화 완료')).toBeNull();
  });
});
