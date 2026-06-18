'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { TimeLog } from '@/types';

interface TaskTimerButtonProps {
  taskId: number;
  onTimerUpdated?: (log: TimeLog) => void;
}

export default function TaskTimerButton({ taskId, onTimerUpdated }: TaskTimerButtonProps) {
  const [currentLog, setCurrentLog] = useState<TimeLog | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);

  // 진행 중인 타이머 확인
  useEffect(() => {
    const checkActiveTimer = async () => {
      try {
        const response = await apiClient.get<{ data: { logs: TimeLog[] } }>(
          `/tasks/${taskId}/timelogs`
        );
        const active = response.data.data.logs.find((log) => !log.endTime);
        if (active) {
          setCurrentLog(active);
          const elapsed = new Date().getTime() - new Date(active.startTime).getTime();
          setElapsed(Math.floor(elapsed / 1000));
        }
      } catch (err) {
        console.error(err);
      }
    };

    checkActiveTimer();
  }, [taskId]);

  // 타이머 카운트다운
  useEffect(() => {
    if (!currentLog || currentLog.endTime) return;

    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentLog]);

  const handleStart = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post<{ data: TimeLog }>(
        `/tasks/${taskId}/timelogs/start`,
        {}
      );
      setCurrentLog(response.data.data);
      setElapsed(0);
      onTimerUpdated?.(response.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || '타이머 시작 실패');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!currentLog) return;
    setLoading(true);
    try {
      const response = await apiClient.patch<{ data: TimeLog }>(
        `/tasks/${taskId}/timelogs/${currentLog.id}/stop`,
        {}
      );
      setCurrentLog(null);
      setElapsed(0);
      onTimerUpdated?.(response.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || '타이머 종료 실패');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isRunning = !!currentLog && !currentLog.endTime;

  const buttonStyle: React.CSSProperties = {
    padding: '8px 18px',
    backgroundColor: isRunning ? 'var(--color-danger)' : 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: loading ? 'not-allowed' : 'pointer',
    fontWeight: '700',
    fontSize: '13px',
    minWidth: '140px',
    opacity: loading ? 0.6 : 1,
    boxShadow: isRunning ? '0 0 12px rgba(239, 68, 68, 0.4)' : '0 4px 10px rgba(88, 80, 236, 0.2)',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    animation: isRunning ? 'pulseGlow 2s infinite' : 'none',
  };

  return (
    <button
      onClick={isRunning ? handleStop : handleStart}
      disabled={loading}
      style={buttonStyle}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.backgroundColor = isRunning
            ? 'var(--color-danger-dark)'
            : 'var(--color-primary-dark)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isRunning
          ? 'var(--color-danger)'
          : 'var(--color-primary)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {isRunning ? (
        <>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'white',
            marginRight: '2px',
          }}/>
          ⏹ {formatTime(elapsed)}
        </>
      ) : (
        <>
          ▶ 작업 시작
        </>
      )}
    </button>
  );
}
