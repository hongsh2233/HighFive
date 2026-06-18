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

const statusColors: { [key: string]: { bg: string; text: string; border: string } } = {
  ASSIGNED: { bg: 'var(--color-primary-light)', text: 'var(--color-primary)', border: 'rgba(88, 80, 236, 0.2)' },
  PROGRESS: { bg: 'var(--color-warning-light)', text: 'var(--color-warning-dark)', border: 'rgba(245, 158, 11, 0.2)' },
  REVIEW: { bg: 'var(--color-info-light)', text: 'var(--color-info-dark)', border: 'rgba(6, 182, 212, 0.2)' },
  QA: { bg: 'var(--color-danger-light)', text: 'var(--color-danger-dark)', border: 'rgba(239, 68, 68, 0.2)' },
  DONE: { bg: 'var(--color-success-light)', text: 'var(--color-success-dark)', border: 'rgba(16, 185, 129, 0.2)' },
};

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
    return (
      <div style={{ padding: 'var(--space-16)', textAlign: 'center', color: 'var(--color-gray-500)' }}>
        로딩 중...
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-8) var(--space-4)',
    maxWidth: '1200px',
    margin: '0 auto',
    animation: 'fadeIn 0.3s ease-out',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-6)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '26px',
    fontWeight: '800',
    margin: 0,
    letterSpacing: '-0.02em',
  };

  const navButtonStyle: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: 'var(--color-white)',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    color: 'var(--color-gray-700)',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.15s ease',
  };

  const summaryStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-6)',
  };

  const getSummaryCardStyle = (accentColor: string): React.CSSProperties => ({
    backgroundColor: 'var(--color-white)',
    padding: 'var(--space-4) var(--space-5)',
    borderRadius: '12px',
    border: '1px solid var(--color-gray-200)',
    borderLeft: `4px solid ${accentColor}`,
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  });

  const calendarStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-white)',
    borderRadius: '16px',
    border: '1px solid var(--color-gray-200)',
    padding: 'var(--space-4)',
    boxShadow: 'var(--shadow-md)',
  };

  const dayHeaderStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '6px',
    marginBottom: 'var(--space-3)',
  };

  const dayLabelStyle: React.CSSProperties = {
    textAlign: 'center',
    fontWeight: '700',
    padding: '10px var(--space-2)',
    fontSize: '12px',
    color: 'var(--color-gray-500)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const calendarGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '6px',
    minHeight: '520px',
  };

  const getDayStyle = (isCurrentMonth: boolean, hasEvents: boolean): React.CSSProperties => ({
    padding: '10px',
    minHeight: '90px',
    border: '1px solid var(--color-gray-200)',
    borderRadius: '10px',
    backgroundColor: isCurrentMonth
      ? hasEvents
        ? 'rgba(245, 158, 11, 0.02)'
        : 'var(--color-white)'
      : 'var(--color-gray-50)',
    opacity: isCurrentMonth ? 1 : 0.45,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'all 0.15s ease',
  });

  const dayNumberStyle = (isCurrentMonth: boolean): React.CSSProperties => ({
    fontWeight: '700',
    fontSize: '13px',
    color: isCurrentMonth ? 'var(--color-gray-800)' : 'var(--color-gray-400)',
    alignSelf: 'flex-start',
    marginBottom: 'var(--space-2)',
  });

  const taskItemStyle = (status: string): React.CSSProperties => {
    const color = statusColors[status] || { bg: 'var(--color-primary-light)', text: 'var(--color-primary)', border: 'transparent' };
    return {
      fontSize: '11px',
      fontWeight: '600',
      padding: '3px 8px',
      backgroundColor: color.bg,
      color: color.text,
      border: `1px solid ${color.border}`,
      borderRadius: '6px',
      marginBottom: '4px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    };
  };

  // 캘린더 날짜 생성
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const daysArray = [];
  const currentCalDate = new Date(startDate);
  while (currentCalDate <= lastDay || currentCalDate.getDay() !== 0) {
    daysArray.push(new Date(currentCalDate));
    currentCalDate.setDate(currentCalDate.getDate() + 1);
  }

  const weekDays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>배포 캘린더</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            style={navButtonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-gray-100)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
          >
            ← 이전 달
          </button>
          <span style={{ padding: '8px 16px', fontWeight: '800', fontSize: '15px', color: 'var(--color-gray-900)', letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>
            {currentDate.getFullYear()}년 {String(currentDate.getMonth() + 1).padStart(2, '0')}월
          </span>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            style={navButtonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-gray-100)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
          >
            다음 달 →
          </button>
        </div>
      </div>

      {/* 통계 요약 */}
      {data && (
        <div style={summaryStyle}>
          <div style={getSummaryCardStyle('var(--color-primary)')}>
            <div style={{ fontSize: '11px', color: 'var(--color-gray-500)', fontWeight: '700', textTransform: 'uppercase' }}>전체 목표 배포 건</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-primary)' }}>{data.summary.total}</div>
          </div>
          <div style={getSummaryCardStyle('var(--color-warning)')}>
            <div style={{ fontSize: '11px', color: 'var(--color-gray-500)', fontWeight: '700', textTransform: 'uppercase' }}>배정 및 진행</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-warning-dark)' }}>{data.summary.assigned + data.summary.progress}</div>
          </div>
          <div style={getSummaryCardStyle('var(--color-info)')}>
            <div style={{ fontSize: '11px', color: 'var(--color-gray-500)', fontWeight: '700', textTransform: 'uppercase' }}>검수 및 QA 단계</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-info-dark)' }}>{data.summary.review + data.summary.qa}</div>
          </div>
          <div style={getSummaryCardStyle('var(--color-success)')}>
            <div style={{ fontSize: '11px', color: 'var(--color-gray-500)', fontWeight: '700', textTransform: 'uppercase' }}>완료된 배포</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-success-dark)' }}>{data.summary.done}</div>
          </div>
        </div>
      )}

      {/* 캘린더 본체 */}
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
            const isoString = date.toISOString().split('T')[0];
            const dayTasks = data?.tasksByDate[isoString] || [];
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();

            return (
              <div
                key={idx}
                style={getDayStyle(isCurrentMonth, dayTasks.length > 0)}
                onMouseEnter={(e) => {
                  if (isCurrentMonth) {
                    e.currentTarget.style.borderColor = 'var(--color-primary-glow)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-gray-200)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={dayNumberStyle(isCurrentMonth)}>
                  {date.getDate()}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      style={taskItemStyle(task.status)}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div style={{ fontSize: '10px', color: 'var(--color-gray-500)', fontWeight: '700', paddingLeft: '4px' }}>
                      + {dayTasks.length - 3}개 더보기
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
