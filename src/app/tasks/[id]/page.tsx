'use client';

import { useEffect, useState, use } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTimer } from '@/hooks/useTimer';
import apiClient from '@/lib/api-client';
import { Task, TimeLog } from '@/types';
import TaskTimerButton from '@/components/task/TaskTimerButton';

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading: authLoading } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ notes: '' });
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  useTimer(parseInt(id));

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await apiClient.get<{ data: Task }>(`/tasks/${id}`);
        setTask(response.data.data);
        setFormData({ notes: response.data.data.notes || '' });

        // 타임로그 조회
        const logsResponse = await apiClient.get<{ data: { logs: TimeLog[]; totalHours: number } }>(
          `/tasks/${id}/timelogs`
        );
        setTimeLogs(logsResponse.data.data.logs);
        setTotalHours(logsResponse.data.data.totalHours);
      } catch (err: any) {
        setError(err.message || '업무 조회 실패');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchTask();
    }
  }, [id, authLoading]);

  const handleTimerUpdated = async (_log: TimeLog) => {
    // 타이머 업데이트 후 로그 다시 로드
    try {
      const response = await apiClient.get<{ data: { logs: TimeLog[]; totalHours: number } }>(
        `/tasks/${id}/timelogs`
      );
      setTimeLogs(response.data.data.logs);
      setTotalHours(response.data.data.totalHours);
    } catch (err) {
      console.error('Failed to refresh timelogs:', err);
    }
  };

  const handleSave = async () => {
    if (!task) return;
    try {
      const response = await apiClient.patch<{ data: Task }>(`/tasks/${task.id}`, formData);
      setTask(response.data.data);
      setEditing(false);
    } catch (err) {
      setError('저장 실패');
      console.error(err);
    }
  };

  if (authLoading || loading) {
    return <div style={{ padding: 'var(--space-8)' }}>로딩 중...</div>;
  }

  if (error || !task) {
    return (
      <div style={{ padding: 'var(--space-8)' }}>
        <p style={{ color: 'var(--color-danger)' }}>{error || '업무를 찾을 수 없습니다.'}</p>
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-8)',
    maxWidth: '1000px',
    margin: '0 auto',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    padding: 'var(--space-6)',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    marginBottom: 'var(--space-6)',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--color-gray-600)',
    textTransform: 'uppercase',
    marginBottom: 'var(--space-1)',
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: 'var(--space-4)',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-6)',
  };

  const statusColors: { [key: string]: { bg: string; text: string; border: string } } = {
    ASSIGNED: { bg: 'transparent', text: '#1D4ED8', border: '#93C5FD' },
    PROGRESS: { bg: 'transparent', text: '#92400E', border: '#FCD34D' },
    REVIEW:   { bg: 'transparent', text: '#5B21B6', border: '#C4B5FD' },
    QA:       { bg: 'transparent', text: '#155E75', border: '#67E8F9' },
    DONE:     { bg: 'transparent', text: '#065F46', border: '#6EE7B7' },
  };

  const statusLabels: { [key: string]: string } = {
    ASSIGNED: '배정됨',
    PROGRESS: '진행중',
    REVIEW: '검수',
    QA: 'QA',
    DONE: '완료',
  };

  const badgeStyle = {
    display: 'inline-block',
    padding: '3px 8px',
    backgroundColor: statusColors[task.status]?.bg || 'transparent',
    color: statusColors[task.status]?.text || '#374151',
    border: `1px solid ${statusColors[task.status]?.border || '#D4D4D8'}`,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  };

  const buttonStyle: React.CSSProperties = {
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: 'var(--accent)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    marginRight: 'var(--space-2)',
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    padding: 'var(--space-3)',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '120px',
    boxSizing: 'border-box',
  };

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: 'var(--space-2)' }}>
          {task.title}
        </h1>
        <p style={{ color: 'var(--color-gray-600)', fontSize: '14px' }}>
          업무 #{task.id}
          {task.rmsNo && ` · ${task.rmsNo}`}
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: 'var(--space-3)',
            backgroundColor: '#FEF2F2',
            border: '1px solid var(--color-danger)',
            borderRadius: '6px',
            color: '#7F1D1D',
            marginBottom: 'var(--space-4)',
          }}
        >
          {error}
        </div>
      )}

      {/* 기본 정보 */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: 'var(--space-4)' }}>
          기본 정보
        </h2>

        <div style={gridStyle}>
          <div>
            <p style={labelStyle}>상태</p>
            <div style={badgeStyle}>{statusLabels[task.status]}</div>
          </div>

          <div>
            <p style={labelStyle}>담당자</p>
            <p style={valueStyle}>{task.worker?.name || '-'}</p>
          </div>

          <div>
            <p style={labelStyle}>기획자</p>
            <p style={valueStyle}>{task.planner?.name || '-'}</p>
          </div>

          <div>
            <p style={labelStyle}>목표일</p>
            <p style={valueStyle}>
              {task.targetDate ? new Date(task.targetDate).toLocaleDateString('ko-KR') : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* 메모 */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>메모</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              style={{ ...buttonStyle, backgroundColor: 'var(--color-gray-600)' }}
            >
              수정
            </button>
          )}
        </div>

        {editing ? (
          <div>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={textareaStyle}
              placeholder="메모를 입력하세요..."
            />
            <div style={{ marginTop: 'var(--space-4)' }}>
              <button onClick={handleSave} style={buttonStyle}>
                저장
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setFormData({ notes: task.notes || '' });
                }}
                style={{
                  ...buttonStyle,
                  backgroundColor: 'var(--color-gray-600)',
                }}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--color-gray-600)', whiteSpace: 'pre-wrap' }}>
            {task.notes || '메모가 없습니다.'}
          </p>
        )}
      </div>

      {/* 타임로그 */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
            타임로그
          </h2>
          <TaskTimerButton taskId={parseInt(id)} onTimerUpdated={handleTimerUpdated} />
        </div>

        {/* 총 소요 시간 */}
        <div style={{
          padding: 'var(--space-3)',
          backgroundColor: 'var(--accent-light)',
          borderRadius: '6px',
          marginBottom: 'var(--space-4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontWeight: '600', color: 'var(--accent-hover)' }}>
            총 소요 시간
          </span>
          <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent)' }}>
            {totalHours.toFixed(2)} 시간
          </span>
        </div>

        {/* 타임로그 목록 */}
        {timeLogs.length === 0 ? (
          <p style={{ color: 'var(--color-gray-600)', fontSize: '14px' }}>
            아직 타이머 기록이 없습니다.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              fontSize: '13px',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-gray-300)' }}>
                  <th style={{ textAlign: 'left', padding: 'var(--space-2)', fontWeight: '600' }}>
                    시작 시간
                  </th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-2)', fontWeight: '600' }}>
                    종료 시간
                  </th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-2)', fontWeight: '600' }}>
                    소요 시간
                  </th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-2)', fontWeight: '600' }}>
                    보정
                  </th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-2)', fontWeight: '600' }}>
                    최종 시간
                  </th>
                </tr>
              </thead>
              <tbody>
                {timeLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                    <td style={{ padding: 'var(--space-2)' }}>
                      {new Date(log.startTime).toLocaleString('ko-KR')}
                    </td>
                    <td style={{ padding: 'var(--space-2)' }}>
                      {log.endTime
                        ? new Date(log.endTime).toLocaleString('ko-KR')
                        : '진행 중'}
                    </td>
                    <td style={{ padding: 'var(--space-2)' }}>
                      {log.durationHours?.toFixed(2) || '-'} h
                    </td>
                    <td style={{ padding: 'var(--space-2)' }}>
                      {log.adjustedHours > 0 ? '+' : ''}{log.adjustedHours.toFixed(2)} h
                    </td>
                    <td style={{ padding: 'var(--space-2)', fontWeight: '600' }}>
                      {log.finalHours?.toFixed(2) || '-'} h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
