'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import { Task } from '@/types';

interface CalendarData {
  tasksByDate: { [key: string]: Task[] };
  summary: {
    total: number;
    assigned: number;
    progress: number;
    review: number;
    qa: number;
    done: number;
  };
  year: number;
  month: number;
}

export default function CalendarPage() {
  const { isLoading: authLoading } = useAuth();
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const response = await apiClient.get<{ data: CalendarData }>(
          `/tasks/calendar?year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}`
        );
        setData(response.data.data);
      } catch (err) {
        console.error('Failed to fetch calendar data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchCalendarData();
    }
  }, [currentDate, authLoading]);

  if (authLoading || loading) {
    return <div style={{ padding: 'var(--space-8)' }}>로딩 중...</div>;
  }

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-8)',
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-8)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '700',
  };

  const navButtonStyle: React.CSSProperties = {
    padding: 'var(--space-2) var(--space-3)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
  };

  const summaryStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-8)',
  };

  const summaryCardStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    padding: 'var(--space-4)',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    textAlign: 'center',
  };

  const calendarStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    padding: 'var(--space-4)',
  };

  const dayHeaderStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
    marginBottom: 'var(--space-4)',
  };

  const dayLabelStyle: React.CSSProperties = {
    textAlign: 'center',
    fontWeight: '700',
    padding: 'var(--space-2)',
    fontSize: '12px',
  };

  const calendarGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
    minHeight: '500px',
  };

  const dayStyle = (isCurrentMonth: boolean, hasEvents: boolean): React.CSSProperties => ({
    padding: 'var(--space-3)',
    minHeight: '80px',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    backgroundColor: isCurrentMonth
      ? hasEvents
        ? 'var(--accent-light)'
        : 'var(--bg-surface)'
      : 'var(--bg-subtle)',
    opacity: isCurrentMonth ? 1 : 0.5,
  });

  const dayNumberStyle: React.CSSProperties = {
    fontWeight: '600',
    marginBottom: 'var(--space-2)',
    fontSize: '14px',
  };

  const taskItemStyle: React.CSSProperties = {
    fontSize: '11px',
    padding: 'var(--space-1) var(--space-2)',
    backgroundColor: 'var(--accent-light)',
    borderRadius: '3px',
    marginBottom: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const statusColors: { [key: string]: string } = {
    ASSIGNED: '#DBEAFE',
    PROGRESS: '#FEF3C7',
    REVIEW: '#EDE9FE',
    QA: '#CFFAFE',
    DONE: '#D1FAE5',
  };

  // 캘린더 날짜 생성
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const daysArray = [];
  const currentCalDate = new Date(startDate);
  while (currentCalDate <= lastDay) {
    daysArray.push(new Date(currentCalDate));
    currentCalDate.setDate(currentCalDate.getDate() + 1);
  }

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>배포 캘린더</h1>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            style={navButtonStyle}
          >
            ← 이전
          </button>
          <span style={{ padding: 'var(--space-2) var(--space-4)', fontWeight: '600' }}>
            {currentDate.getFullYear()}.{String(currentDate.getMonth() + 1).padStart(2, '0')}
          </span>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            style={navButtonStyle}
          >
            다음 →
          </button>
        </div>
      </div>

      {/* 통계 */}
      {data && (
        <div style={summaryStyle}>
          <div style={summaryCardStyle}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent)' }}>
              {data.summary.total}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-gray-600)' }}>
              총 업무
            </div>
          </div>
          <div style={summaryCardStyle}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#DBEAFE' }}>
              {data.summary.assigned}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-gray-600)' }}>
              배정됨
            </div>
          </div>
          <div style={summaryCardStyle}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#FEF3C7' }}>
              {data.summary.progress}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-gray-600)' }}>
              진행중
            </div>
          </div>
          <div style={summaryCardStyle}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#D1FAE5' }}>
              {data.summary.done}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-gray-600)' }}>
              완료
            </div>
          </div>
        </div>
      )}

      {/* 캘린더 */}
      <div style={calendarStyle}>
        <div style={dayHeaderStyle}>
          {weekDays.map((day) => (
            <div key={day} style={dayLabelStyle}>
              {day}
            </div>
          ))}
        </div>

        <div style={calendarGridStyle}>
          {daysArray.map((date, idx) => {
            const dateKey = date.toISOString().split('T')[0];
            const dayTasks = data?.tasksByDate[dateKey] || [];
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();

            return (
              <div key={idx} style={dayStyle(isCurrentMonth, dayTasks.length > 0)}>
                <div style={dayNumberStyle}>
                  {date.getDate()}
                </div>
                <div>
                  {dayTasks.slice(0, 2).map((task) => (
                    <div
                      key={task.id}
                      style={{
                        ...taskItemStyle,
                        backgroundColor: statusColors[task.status] || 'var(--color-primary-light)',
                      }}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <div style={{ fontSize: '11px', color: 'var(--color-gray-600)' }}>
                      +{dayTasks.length - 2}개
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
