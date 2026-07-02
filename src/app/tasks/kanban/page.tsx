'use client';


import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Task } from '@/types';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import styles from './kanban.module.css';
import Spinner from '@/components/common/Spinner';

export default function KanbanPage() {
  const { isLoading } = useAuth();
  const router = useRouter();


  const handleTaskClick = (task: Task) => {
    router.push(`/tasks/${task.id}`);
  };

  if (isLoading) {
    return <div className={styles.loadingPage}><Spinner /></div>;
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>칸반 보드</h1>
        <p className={styles.subtitle}>
          업무를 드래그하여 상태를 변경할 수 있습니다.
        </p>
      </div>
      <KanbanBoard onTaskClick={handleTaskClick} />
    </>
  );
}
