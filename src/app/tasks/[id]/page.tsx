'use client';

import { useEffect, useState, use } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTimer } from '@/hooks/useTimer';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Task, TimeLog } from '@/types';
import TaskTimerButton from '@/components/task/TaskTimerButton';

const statusColors: { [key: string]: { bg: string; text: string; border: string } } = {
  ASSIGNED: { bg: 'var(--color-primary-light)', text: 'var(--color-primary)', border: 'rgba(88, 80, 236, 0.2)' },
  PROGRESS: { bg: 'var(--color-warning-light)', text: 'var(--color-warning-dark)', border: 'rgba(245, 158, 11, 0.2)' },
  REVIEW: { bg: 'var(--color-info-light)', text: 'var(--color-info-dark)', border: 'rgba(6, 182, 212, 0.2)' },
  QA: { bg: 'var(--color-danger-light)', text: 'var(--color-danger-dark)', border: 'rgba(239, 68, 68, 0.2)' },
  DONE: { bg: 'var(--color-success-light)', text: 'var(--color-success-dark)', border: 'rgba(16, 185, 129, 0.2)' },
};

const statusLabels: { [key: string]: string } = {
  ASSIGNED: '배정됨',
  PROGRESS: '진행중',
  REVIEW: '검수',
  QA: 'QA',
  DONE: '완료',
};

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
  const [isFocused, setIsFocused] = useState(false);
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
    return (
      <div style={{ padding: 'var(--space-16)', textAlign: 'center', color: 'var(--color-gray-500)' }}>
        로딩 중...
      </div>
    );
  }

  if (error || !task) {
    return (
      <div style={{ padding: 'var(--space-8)', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger)', fontWeight: '600' }}>⚠️ {error || '업무를 찾을 수 없습니다.'}</p>
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-8) var(--space-4)',
    maxWidth: '1000px',
    margin: '0 auto',
    animation: 'fadeIn 0.3s ease-out',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-white)',
    padding: 'var(--space-6) var(--space-8)',
    borderRadius: '16px',
    border: '1px solid var(--color-gray-200)',
    boxShadow: 'var(--shadow-sm)',
    marginBottom: 'var(--space-6)',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--color-gray-500)',
    textTransform: 'uppercase',
    marginBottom: '6px',
    letterSpacing: '0.05em',
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--color-gray-900)',
    margin: 0,
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 'var(--space-6) var(--space-4)',
  };

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    backgroundColor: statusColors[task.status]?.bg || '#E5E7EB',
    color: statusColors[task.status]?.text || '#374151',
    border: `1px solid ${statusColors[task.status]?.border || 'transparent'}`,
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    transition: 'all 0.15s ease',
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    border: isFocused ? '1px solid var(--color-primary)' : '1px solid var(--color-gray-300)',
    boxShadow: isFocused ? '0 0 0 3px var(--color-primary-glow), var(--shadow-sm)' : 'var(--shadow-sm)',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '120px',
    boxSizing: 'border-box',
    outline: 'none',
    color: 'var(--color-gray-900)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <div style={containerStyle}>
      {/* 타이틀 및 네비바 */}
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: 'var(--space-1)', letterSpacing: '-0.02em' }}>
            {task.title}
          </h1>
          <p style={{ color: 'var(--color-gray-500)', fontSize: '13px', margin: 0, fontWeight: 500 }}>
            💼 업무 ID: <span style={{ fontWeight: '700', color: 'var(--color-gray-700)' }}>#{task.id}</span>
            {task.rmsNo && (
              <>
                <span style={{ margin: '0 8px', color: 'var(--color-gray-300)' }}>|</span>
                🏷️ RMS 태그: <span style={{ fontWeight: '700', color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light)', padding: '2px 6px', borderRadius: '4px' }}>{task.rmsNo}</span>
              </>
            )}
          </p>
        </div>
        <Link
          href="/tasks"
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--color-gray-600)',
            textDecoration: 'none',
            padding: '8px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-gray-100)',
            border: '1px solid var(--color-gray-200)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-gray-200)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-gray-100)'; }}
        >
          목록으로
        </Link>
      </div>

      {/* 기본 정보 */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: '800', marginBottom: 'var(--space-6)', letterSpacing: '-0.01em', borderBottom: '1px solid var(--color-gray-100)', paddingBottom: '12px' }}>
          📌 기본 정보
        </h2>

        <div style={gridStyle}>
          <div>
            <p style={labelStyle}>진행 상태</p>
            <div style={{ marginTop: '2px' }}>
              <span style={badgeStyle}>{statusLabels[task.status]}</span>
            </div>
          </div>

          <div>
            <p style={labelStyle}>담당 작업자</p>
            <p style={valueStyle}>{task.worker?.name || '-'}</p>
          </div>

          <div>
            <p style={labelStyle}>담당 기획자</p>
            <p style={valueStyle}>{task.planner?.name || '-'}</p>
          </div>

          <div>
            <p style={labelStyle}>목표 완료일</p>
            <p style={{ ...valueStyle, color: 'var(--color-gray-700)' }}>
              {task.targetDate ? `📅 ${new Date(task.targetDate).toLocaleDateString('ko-KR')}` : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* 메모 */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-gray-100)', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, letterSpacing: '-0.01em' }}>📝 메모 및 진행상황</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              style={{ ...buttonStyle, backgroundColor: 'var(--color-gray-200)', color: 'var(--color-gray-800)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-gray-300)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-gray-200)'; }}
            >
              수정하기
            </button>
          )}
        </div>

        {editing ? (
          <div>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              style={textareaStyle}
              placeholder="여기에 진행 내용 및 이슈 노트를 자유롭게 적어두세요..."
            />
            <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSave}
                style={buttonStyle}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; }}
              >
                저장
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setFormData({ notes: task.notes || '' });
                }}
                style={{
                  ...buttonStyle,
                  backgroundColor: 'var(--color-gray-200)',
                  color: 'var(--color-gray-800)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-gray-300)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-gray-200)'; }}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            color: 'var(--color-gray-700)',
            whiteSpace: 'pre-wrap',
            fontSize: '14px',
            backgroundColor: 'var(--color-gray-50)',
            padding: '14px 18px',
            borderRadius: '8px',
            border: '1px solid var(--color-gray-200)',
            lineHeight: '1.7',
          }}>
            {task.notes || '작성된 메모가 없습니다.'}
          </div>
        )}
      </div>

      {/* 타임로그 */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-gray-100)', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, letterSpacing: '-0.01em' }}>
            ⏱️ 업무 타임로그
          </h2>
          <TaskTimerButton taskId={parseInt(id)} onTimerUpdated={handleTimerUpdated} />
        </div>

        {/* 총 소요 시간 배너 */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: 'var(--color-primary-light)',
          borderRadius: '12px',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid rgba(88, 80, 236, 0.1)',
        }}>
          <span style={{ fontWeight: '700', color: 'var(--color-primary-dark)', fontSize: '14px' }}>
            누적 작업 공수
          </span>
          <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
            {totalHours.toFixed(2)} 시간
          </span>
        </div>

        {/* 타임로그 목록 */}
        {timeLogs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-6)',
            color: 'var(--color-gray-500)',
            backgroundColor: 'var(--color-gray-50)',
            borderRadius: '8px',
            border: '1px dashed var(--color-gray-300)',
            fontSize: '13px',
          }}>
            등록된 타이머 세션이 없습니다. 우측 상단의 [▶ 시작] 버튼을 눌러 작업을 시작해 보세요.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--color-gray-200)' }}>
            <table style={{
              width: '100%',
              fontSize: '13px',
              borderCollapse: 'collapse',
              backgroundColor: 'white',
            }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '600', color: 'var(--color-gray-600)' }}>
                    시작 시점
                  </th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '600', color: 'var(--color-gray-600)' }}>
                    종료 시점
                  </th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '600', color: 'var(--color-gray-600)' }}>
                    기본 측정
                  </th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '600', color: 'var(--color-gray-600)' }}>
                    보정치
                  </th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '600', color: 'var(--color-gray-600)' }}>
                    최종 공수
                  </th>
                </tr>
              </thead>
              <tbody>
                {timeLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                    <td style={{ padding: '12px 14px', color: 'var(--color-gray-800)', fontWeight: 500 }}>
                      {new Date(log.startTime).toLocaleString('ko-KR')}
                    </td>
                    <td style={{ padding: '12px 14px', color: log.endTime ? 'var(--color-gray-800)' : 'var(--color-danger)', fontWeight: log.endTime ? 500 : 700 }}>
                      {log.endTime
                        ? new Date(log.endTime).toLocaleString('ko-KR')
                        : '🔴 측정 중'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--color-gray-600)' }}>
                      {log.durationHours?.toFixed(2) || '-'} h
                    </td>
                    <td style={{ padding: '12px 14px', color: log.adjustedHours > 0 ? 'var(--color-success)' : log.adjustedHours < 0 ? 'var(--color-danger)' : 'var(--color-gray-500)', fontWeight: '600' }}>
                      {log.adjustedHours > 0 ? `+${log.adjustedHours.toFixed(2)}` : `${log.adjustedHours.toFixed(2)}`} h
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--color-primary)' }}>
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
