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

const statusColors: { [key: string]: string } = {
  ASSIGNED: 'var(--color-primary)',
  PROGRESS: 'var(--color-warning)',
  REVIEW: 'var(--color-info)',
  QA: 'var(--color-danger)',
  DONE: 'var(--color-success)',
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
    minWidth: '290px',
    maxWidth: '330px',
    backgroundColor: '#F1F5F9',
    borderRadius: '14px',
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--color-gray-200)',
    maxHeight: 'calc(100vh - 180px)',
  };

  const headerStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--color-gray-900)',
    marginBottom: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 4px',
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 8px',
    backgroundColor: 'var(--color-gray-300)',
    color: 'var(--color-gray-800)',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
  };

  const droppableStyle: React.CSSProperties = {
    flex: 1,
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto',
    padding: '2px',
  };

  const getCardStyle = (taskStatus: string): React.CSSProperties => {
    return {
      backgroundColor: 'white',
      padding: '14px 16px',
      borderRadius: '10px',
      border: '1px solid var(--color-gray-200)',
      borderLeft: `4px solid ${statusColors[taskStatus] || 'var(--color-primary)'}`,
      cursor: 'pointer',
      boxShadow: 'var(--shadow-sm)',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--color-gray-900)',
    marginBottom: '8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    letterSpacing: '-0.01em',
  };

  const cardMetaStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--color-gray-500)',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  return (
    <div style={columnStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: statusColors[status],
          }}/>
          <span>{title}</span>
        </div>
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
              height: '100px',
              color: 'var(--color-gray-400)',
              fontSize: '13px',
              border: '2px dashed var(--color-gray-200)',
              borderRadius: '10px',
              backgroundColor: 'rgba(255,255,255,0.4)',
            }}
          >
            대기 업무 없음
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              style={getCardStyle(status)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('taskId', task.id.toString());
              }}
              onClick={() => onTaskClick(task)}
              onMouseEnter={(e) => {
                const target = e.currentTarget as HTMLElement;
                target.style.transform = 'translateY(-2px)';
                target.style.boxShadow = 'var(--shadow-md)';
                target.style.borderColor = 'var(--color-gray-300)';
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget as HTMLElement;
                target.style.transform = 'none';
                target.style.boxShadow = 'var(--shadow-sm)';
                target.style.borderColor = 'var(--color-gray-200)';
              }}
            >
              <div style={cardTitleStyle} title={task.title}>
                {task.title}
              </div>
              <div style={cardMetaStyle}>
                👤 담당: <span style={{ color: 'var(--color-gray-700)', fontWeight: 600 }}>{task.worker?.name || '-'}</span>
              </div>
              {task.targetDate && (
                <div style={{
                  ...cardMetaStyle,
                  marginTop: '6px',
                  backgroundColor: 'var(--color-gray-100)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  width: 'fit-content',
                }}>
                  📅 {new Date(task.targetDate).toLocaleDateString('ko-KR')} 완료 목표
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
