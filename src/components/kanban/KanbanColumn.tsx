'use client';

import { Task } from '@/types';


interface KanbanColumnProps {
  title: string;
  status: string;
  tasks: Task[];
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onTaskClick: (task: Task) => void;
}

const statusBorderColors: { [key: string]: string } = {
  ASSIGNED: '#93C5FD',
  PROGRESS: '#FCD34D',
  REVIEW:   '#C4B5FD',
  QA:       '#67E8F9',
  DONE:     '#6EE7B7',
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
    minWidth: '260px',
    maxWidth: '300px',
    backgroundColor: 'var(--bg-subtle)',
    borderRadius: '8px',
    padding: 'var(--space-3)',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-3)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    backgroundColor: 'var(--border)',
    color: 'var(--text-secondary)',
    borderRadius: '50%',
    fontSize: '11px',
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
    backgroundColor: 'var(--bg-surface)',
    padding: 'var(--space-3)',
    borderRadius: '7px',
    border: `1px solid var(--border)`,
    borderLeft: `3px solid ${statusBorderColors[status] ?? '#E4E4E7'}`,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
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
