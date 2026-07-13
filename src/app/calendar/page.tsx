'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import { Task } from '@/types';
import styles from './calendar.module.css';
import Spinner from '@/components/common/Spinner';

interface CalendarData {
  tasksByDate: { [key: string]: Task[] };
  leavesByDate: { [key: string]: string[] };
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
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleAiSummary = async () => {
    setAiLoading(true);
    setAiError('');
    setAiSummary('');
    try {
      const res = await apiClient.get<{ data: { summary: string } }>('/ai/calendar-summary');
      setAiSummary(res.data.data.summary);
    } catch (err: any) {
      setAiError(err?.response?.data?.message || 'AI 요약 생성 중 오류가 발생했습니다.');
    } finally {
      setAiLoading(false);
    }
  };

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
    return <div className={styles.loadingPage}><Spinner /></div>;
  }

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
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>배포 캘린더</h1>
        <div className={styles.navRow}>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className={styles.navBtn}
          >
            ← 이전
          </button>
          <span className={styles.monthLabel}>
            {currentDate.getFullYear()}.{String(currentDate.getMonth() + 1).padStart(2, '0')}
          </span>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className={styles.navBtn}
          >
            다음 →
          </button>
          <button onClick={handleAiSummary} className={styles.aiSummaryBtn} disabled={aiLoading}>
            {aiLoading ? '요약 생성 중...' : '✨ 이번 주 AI 요약'}
          </button>
        </div>
      </div>

      {(aiSummary || aiError) && (
        <div className={styles.aiSummaryBox}>
          {aiError ? (
            <p className={styles.aiSummaryError}>{aiError}</p>
          ) : (
            <p className={styles.aiSummaryText}>{aiSummary}</p>
          )}
        </div>
      )}

      {/* 통계 */}
      {data && (
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>
              {data.summary.total}
            </div>
            <div className={styles.summaryLabel}>
              총 업무
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValueAssigned}>
              {data.summary.assigned}
            </div>
            <div className={styles.summaryLabel}>
              배정됨
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValueProgress}>
              {data.summary.progress}
            </div>
            <div className={styles.summaryLabel}>
              진행중
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValueDone}>
              {data.summary.done}
            </div>
            <div className={styles.summaryLabel}>
              완료
            </div>
          </div>
        </div>
      )}

      {/* 캘린더 */}
      <div className={styles.calendarCard}>
        <div className={styles.dayHeaderGrid}>
          {weekDays.map((day) => (
            <div key={day} className={styles.dayLabel}>
              {day}
            </div>
          ))}
        </div>

        <div className={styles.calendarGrid}>
          {daysArray.map((date, idx) => {
            const dateKey = date.toISOString().split('T')[0];
            const dayTasks = data?.tasksByDate[dateKey] || [];
            const dayLeaves = data?.leavesByDate[dateKey] || [];
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();

            return (
              <div
                key={idx}
                className={styles.day}
                data-current-month={isCurrentMonth ? 'true' : 'false'}
                data-has-events={(dayTasks.length > 0 || dayLeaves.length > 0) ? 'true' : 'false'}
              >
                <div className={styles.dayNumber}>
                  {date.getDate()}
                </div>
                <div>
                  {dayLeaves.map((name) => (
                    <div key={name} className={styles.leaveItem} title={`${name} 휴가`}>
                      🌴 {name}
                    </div>
                  ))}
                  {dayTasks.slice(0, 2).map((task) => (
                    <div
                      key={task.id}
                      className={styles.taskItem}
                      style={{
                        backgroundColor: statusColors[task.status] || 'var(--color-primary-light)',
                      }}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <div className={styles.moreCount}>
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
