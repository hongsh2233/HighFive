'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { TimeLog } from '@/types';
import styles from './TaskTimerButton.module.css';

interface TaskTimerButtonProps {
  taskId: number;
  onTimerUpdated?: (log: TimeLog) => void;
}

export default function TaskTimerButton({ taskId, onTimerUpdated }: TaskTimerButtonProps) {
  const [currentLog, setCurrentLog] = useState<TimeLog | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);

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

  return (
    <button
      onClick={isRunning ? handleStop : handleStart}
      disabled={loading}
      data-running={isRunning}
      data-loading={loading}
      className={styles.btn}
    >
      {isRunning ? <>⏹ {formatTime(elapsed)}</> : <>▶ 시작</>}
    </button>
  );
}
