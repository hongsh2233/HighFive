'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { TimeLog } from '@/types';

export function useTimer(taskId: number) {
  const [currentLog, setCurrentLog] = useState<TimeLog | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(false);

  // 진행 중인 타이머 조회
  const checkActiveTimer = useCallback(async () => {
    try {
      const response = await apiClient.get<{ data: { logs: TimeLog[] } }>(
        `/tasks/${taskId}/timelogs`
      );
      const active = response.data.data.logs.find((log) => !log.endTime);
      if (active) {
        setCurrentLog(active);
        const elapsed = new Date().getTime() - new Date(active.startTime).getTime();
        setElapsedSeconds(Math.floor(elapsed / 1000));
      } else {
        setCurrentLog(null);
        setElapsedSeconds(0);
      }
    } catch (err) {
      console.error('Failed to check active timer:', err);
    }
  }, [taskId]);

  // 초기 로드
  useEffect(() => {
    checkActiveTimer();
  }, [checkActiveTimer]);

  // 타이머 카운트다운
  useEffect(() => {
    if (!currentLog || currentLog.endTime) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentLog]);

  // 페이지 이탈 시 경고
  useEffect(() => {
    if (!currentLog || currentLog.endTime) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '진행 중인 타이머가 있습니다. 페이지를 떠나시겠습니까?';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentLog]);

  const start = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.post<{ data: TimeLog }>(
        `/tasks/${taskId}/timelogs/start`,
        {}
      );
      setCurrentLog(response.data.data);
      setElapsedSeconds(0);
      return response.data.data;
    } catch (err) {
      console.error('Failed to start timer:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const stop = useCallback(async () => {
    if (!currentLog) return null;
    setLoading(true);
    try {
      const response = await apiClient.patch<{ data: TimeLog }>(
        `/tasks/${taskId}/timelogs/${currentLog.id}/stop`,
        {}
      );
      setCurrentLog(null);
      setElapsedSeconds(0);
      return response.data.data;
    } catch (err) {
      console.error('Failed to stop timer:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [taskId, currentLog]);

  const adjust = useCallback(
    async (hours: number) => {
      if (!currentLog) return null;
      try {
        const response = await apiClient.patch<{ data: TimeLog }>(
          `/tasks/${taskId}/timelogs/${currentLog.id}/adjust`,
          { adjustedHours: hours }
        );
        return response.data.data;
      } catch (err) {
        console.error('Failed to adjust hours:', err);
        throw err;
      }
    },
    [taskId, currentLog]
  );

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return {
    currentLog,
    isRunning: !!currentLog && !currentLog.endTime,
    elapsedSeconds,
    formattedTime: formatTime(elapsedSeconds),
    loading,
    start,
    stop,
    adjust,
    checkActiveTimer,
  };
}
