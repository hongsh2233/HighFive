'use client';
import { useWorkHub } from '@/hooks/useWorkHub';
import TaskViews from '@/components/work/TaskViews';
import Spinner from '@/components/common/Spinner';
import styles from '@/components/work/WorkHub.module.css';
export default function KanbanPage() {
  const hub = useWorkHub();
  if (hub.loading) return <Spinner />;
  if (hub.error) return <div className={styles.error} role="alert">{hub.error}<button className={styles.button} onClick={hub.reload}>다시 시도</button></div>;
  return <section className={styles.page}><header className={styles.header}><div><h1>업무 보드</h1><p className={styles.muted}>프로젝트의 기존 상태를 유지하며, 업무를 여러 관점으로 확인하세요.</p></div></header><TaskViews tasks={hub.tasks} projects={hub.projects} getStatuses={hub.getStatuses} onChanged={hub.reload} /></section>;
}
