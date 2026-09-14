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

interface GoogleEvent { id: string; title: string; }

export default function CalendarPage() {
  const { isLoading: authLoading } = useAuth();
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [aiNotice, setAiNotice] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEventsByDate, setGoogleEventsByDate] = useState<{ [key: string]: GoogleEvent[] }>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handleAiSummary = () => {
    setAiNotice(true);
  };

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const [tasksRes, googleRes] = await Promise.all([
          apiClient.get<{ data: CalendarData }>(
            `/tasks/calendar?year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}`
          ),
          apiClient.get<{ data: { connected: boolean; eventsByDate: { [key: string]: GoogleEvent[] } } }>(
            `/calendar/google-events?year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}`
          ).catch(() => null),
        ]);
        setData(tasksRes.data.data);
        if (googleRes) {
          setGoogleConnected(googleRes.data.data.connected);
          setGoogleEventsByDate(googleRes.data.data.eventsByDate || {});
        }
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

  const todayKey = new Date().toISOString().split('T')[0];
  const activeDateKey = selectedDate || todayKey;
  const activeDayTasks = data?.tasksByDate[activeDateKey] || [];
  const activeDayLeaves = data?.leavesByDate[activeDateKey] || [];
  const activeDayGoogleEvents = googleEventsByDate[activeDateKey] || [];

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
          <button onClick={handleAiSummary} className={styles.aiSummaryBtn}>
            ✨ 이번 주 AI 요약
          </button>
        </div>
        {googleConnected && (
          <span className={styles.googleBadge}>📅 구글 캘린더 연동됨</span>
        )}
      </div>

      {aiNotice && (
        <div className={styles.aiSummaryBox}>
          <p className={styles.aiSummaryText}>AI 요약 기능은 준비 중입니다. 오픈 시 안내드리겠습니다.</p>
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

      {/* 캘린더 + 선택한 날짜 상세 */}
      <div className={styles.calendarLayout}>
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
              const dayGoogleEvents = googleEventsByDate[dateKey] || [];
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const isSelected = dateKey === activeDateKey;

              return (
                <div
                  key={idx}
                  className={styles.day}
                  data-current-month={isCurrentMonth ? 'true' : 'false'}
                  data-has-events={(dayTasks.length > 0 || dayLeaves.length > 0 || dayGoogleEvents.length > 0) ? 'true' : 'false'}
                  data-selected={isSelected ? 'true' : 'false'}
                  onClick={() => setSelectedDate(dateKey)}
                  role="button"
                  tabIndex={0}
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
                    {dayGoogleEvents.slice(0, 1).map((ev) => (
                      <div key={ev.id} className={styles.googleEventItem} title={ev.title}>
                        📅 {ev.title}
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

        <div className={styles.dayPanel}>
          <div className={styles.dayPanelHeader}>
            {new Date(activeDateKey).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </div>
          <div className={styles.dayPanelCount}>
            해당 일의 업무 {activeDayTasks.length}건
            {googleConnected && activeDayGoogleEvents.length > 0 && ` · 구글 일정 ${activeDayGoogleEvents.length}건`}
          </div>

          {activeDayLeaves.length > 0 && (
            <div className={styles.dayPanelSection}>
              {activeDayLeaves.map((name) => (
                <div key={name} className={styles.dayPanelLeave}>🌴 {name} 휴가</div>
              ))}
            </div>
          )}

          {activeDayGoogleEvents.length > 0 && (
            <div className={styles.dayPanelSection}>
              {activeDayGoogleEvents.map((ev) => (
                <div key={ev.id} className={styles.dayPanelGoogleEvent}>📅 {ev.title}</div>
              ))}
            </div>
          )}

          <div className={styles.dayPanelSection}>
            {activeDayTasks.length === 0 ? (
              <p className={styles.dayPanelEmpty}>이 날짜에 등록된 업무가 없습니다.</p>
            ) : (
              activeDayTasks.map((task: any) => (
                <div key={task.id} className={styles.dayPanelTask}>
                  <span
                    className={styles.dayPanelTaskDot}
                    style={{ backgroundColor: statusColors[task.status] || 'var(--color-primary-light)' }}
                  />
                  <div className={styles.dayPanelTaskBody}>
                    <div className={styles.dayPanelTaskTitle}>{task.title}</div>
                    <div className={styles.dayPanelTaskMeta}>{task.worker?.name || '미배정'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
