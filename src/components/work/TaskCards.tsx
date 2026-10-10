'use client';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Task } from '@/types';
import { TASK_PRIORITY_TEXT } from '@/lib/constants';
import { parseTaskDate, taskRisk, taskState, type StatusResolver } from '@/lib/work-hub';
import styles from './WorkHub.module.css';

export default function TaskCards({ tasks, getStatuses }: { tasks: Task[]; getStatuses: StatusResolver }) {
  if (!tasks.length) return <p className={styles.empty}>해당하는 업무가 없습니다.</p>;
  return <div className={styles.taskList}>{tasks.map(task => {
    const risk = taskRisk(task, getStatuses);
    const date = parseTaskDate(task.targetDate);
    return <Link href={`/tasks/${task.id}`} key={task.id} className={styles.task}>
      <div className={styles.row}><span className={styles.badge}>{task.project?.name || '프로젝트 미지정'}</span>
        <span className={styles.badge}>{taskState(task, getStatuses)?.label || task.status}</span>
        {risk && <span className={`${styles.badge} ${styles.risk}`}>{risk}</span>}</div>
      <strong>{task.title}</strong>
      <div className={styles.muted}>{task.worker?.name || '미배정'} · {TASK_PRIORITY_TEXT[task.priority] || task.priority || '보통'} · {date ? format(date, 'yyyy.MM.dd') : '마감 미정'}
        {typeof task._count?.comments === 'number' && ` · 댓글 ${task._count.comments}개`}</div>
      {task.latestComment && <p className={styles.commentPreview}>최근 댓글 · {task.latestComment.author?.name || 'JIA'}: {task.latestComment.content}</p>}
    </Link>;
  })}</div>;
}
