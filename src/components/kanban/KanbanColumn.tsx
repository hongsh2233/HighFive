'use client';

import { Task } from '@/types';
import { TASK_PRIORITY_TEXT, TASK_PRIORITY_COLOR } from '@/lib/constants';
import styles from './KanbanColumn.module.css';

interface KanbanColumnProps {
  title: string;
  status: string;
  color?: string | null;
  tasks: Task[];
  parentMap: Map<number, Task>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onTaskClick: (task: Task) => void;
}

export default function KanbanColumn({
  title,
  status,
  color,
  tasks,
  parentMap,
  onDragOver,
  onDragLeave,
  onDrop,
  onTaskClick,
}: KanbanColumnProps) {
  return (
    <div className={styles.column}>
      <div className={styles.header}>
        {color && <span className={styles.colorDot} style={{ backgroundColor: color }} />}
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
          tasks.map((task) => {
            const parentTask = task.parentTaskId ? parentMap.get(task.parentTaskId) : undefined;
            return (
              <div
                key={task.id}
                className={`${styles.card} ${task.parentTaskId ? styles.cardChild : ''}`}
                style={color ? { borderLeftColor: color } : undefined}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('taskId', task.id.toString());
                }}
                onClick={() => onTaskClick(task)}
              >
                <div className={styles.cardTitle}>
                  {(task.priority === 'HIGH' || task.priority === 'URGENT') && (
                    <span
                      title={TASK_PRIORITY_TEXT[task.priority]}
                      style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        backgroundColor: TASK_PRIORITY_COLOR[task.priority].text,
                      }}
                    />
                  )}
                  {parentTask && <span className={styles.parentPrefix}>[{parentTask.title}]</span>}
                  <span className={styles.cardTitleText}>{task.title}</span>
                </div>
                <div className={styles.cardMeta}>담당: {task.worker?.name || '-'}</div>
                {task.targetDate && (
                  <div className={styles.cardMetaDate}>
                    {new Date(task.targetDate).toLocaleDateString('ko-KR')}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
