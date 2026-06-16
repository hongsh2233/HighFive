'use client';


import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Task } from '@/types';
import KanbanBoard from '@/components/kanban/KanbanBoard';

export default function KanbanPage() {
  const { isLoading } = useAuth();
  const router = useRouter();


  const handleTaskClick = (task: Task) => {
    router.push(`/tasks/${task.id}`);
  };

  if (isLoading) {
    return <div style={{ padding: 'var(--space-8)' }}>로딩 중...</div>;
  }

  const headerStyle: React.CSSProperties = {
    padding: 'var(--space-6) var(--space-8)',
    backgroundColor: 'white',
    borderBottom: '1px solid var(--color-gray-300)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
  };

  return (
    <>
      <div style={headerStyle}>
        <h1 style={titleStyle}>칸반 보드</h1>
        <p style={{ margin: 0, color: 'var(--color-gray-600)', fontSize: '14px' }}>
          업무를 드래그하여 상태를 변경할 수 있습니다.
        </p>
      </div>
      <KanbanBoard onTaskClick={handleTaskClick} />
    </>
  );
}
