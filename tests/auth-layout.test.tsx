import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ pathname: '/exwave/my-work', status: 'unauthenticated' }));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ status: state.status }) }));
vi.mock('@/components/AppShell', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/AnnouncementBanner', () => ({ default: () => null }));
vi.mock('@/components/WikiSearchButton', () => ({ default: () => null }));
import LayoutWrapper from '../src/components/LayoutWrapper';
afterEach(cleanup);
describe('조직 주소의 화면 인증 차단', () => {
  it.each(['loading', 'unauthenticated'])('%s 세션은 보호 화면을 렌더하지 않는다', status => {
    state.status = status; state.pathname = '/exwave/my-work';
    render(<LayoutWrapper><p>보호된 업무</p></LayoutWrapper>);
    expect(screen.queryByText('보호된 업무')).toBeNull();
  });
  it('인증이 확인되면 기존 화면을 렌더한다', () => {
    state.status = 'authenticated'; render(<LayoutWrapper><p>보호된 업무</p></LayoutWrapper>);
    expect(screen.getByText('보호된 업무')).toBeTruthy();
  });
});
