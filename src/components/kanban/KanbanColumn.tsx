'use client';

import { Task } from '@/types';
import styles from './KanbanColumn.module.css';

interface KanbanColumnProps {
  title: string;
  status: string;
  tasks: Task[];
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onTaskClick: (task: Task) => void;
}

export default function KanbanColumn({
  title,
  status,
  tasks,
  onDragOver,
  onDragLeave,
  onDrop,
  onTaskClick,
}: KanbanColumnProps) {
  return (
    <div className={styles.column}>
      <div className={styles.header}>
        <span>{title}</span>
        <div className={styles.badge}>{tasks.length}</div>
      </div>

      <div
        className={styles.droppable}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, status)}
      >
        {tasks.length === 0 ? (
          <div className={styles.empty}>업무가 없습니다</div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={styles.card}
              data-status={status}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('taskId', task.id.toString());
              }}
              onClick={() => onTaskClick(task)}
            >
              <div className={styles.cardTitle}>{task.title}</div>
              <div className={styles.cardMeta}>담당: {task.worker?.name || '-'}</div>
              {task.targetDate && (
                <div className={styles.cardMetaDate}>
                  {new Date(task.targetDate).toLocaleDateString('ko-KR')}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
