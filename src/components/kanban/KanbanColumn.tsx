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

const statusColors: { [key: string]: string } = {
  ASSIGNED: '#DBEAFE',
  PROGRESS: '#FEF3C7',
  REVIEW: '#EDE9FE',
  QA: '#CFFAFE',
  DONE: '#D1FAE5',
};

export default function KanbanColumn({
  title,
  status,
  tasks,
  onDragOver,
  onDragLeave,
  onDrop,
  onTaskClick,
}: KanbanColumnProps) {
  const columnStyle: React.CSSProperties = {
    minWidth: '280px',
    maxWidth: '320px',
    backgroundColor: '#F3F4F6',
    borderRadius: '10px',
    padding: 'var(--space-3)',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: '700',
    color: '#374151',
    marginBottom: 'var(--space-3)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    borderRadius: '50%',
    fontSize: '12px',
    fontWeight: '700',
  };

  const droppableStyle: React.CSSProperties = {
    flex: 1,
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: 'var(--space-3)',
    borderRadius: '8px',
    border: `2px solid ${statusColors[status]}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    draggable: true,
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: 'var(--space-2)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const cardMetaStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--color-gray-600)',
  };

  return (
    <div style={columnStyle}>
      <div style={headerStyle}>
        <span>{title}</span>
        <div style={badgeStyle}>{tasks.length}</div>
      </div>

      <div
        style={droppableStyle}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, status)}
      >
        {tasks.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--color-gray-400)',
              fontSize: '13px',
            }}
          >
            업무가 없습니다
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              style={cardStyle}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('taskId', task.id.toString());
              }}
              onClick={() => onTaskClick(task)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  '0 4px 12px rgba(0,0,0,0.10)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div style={cardTitleStyle}>{task.title}</div>
              <div style={cardMetaStyle}>
                담당: {task.worker?.name || '-'}
              </div>
              {task.targetDate && (
                <div style={{ ...cardMetaStyle, marginTop: 'var(--space-2)' }}>
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
