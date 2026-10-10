'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import type { Task } from '@/types';
import { taskRisk, type StatusResolver } from '@/lib/work-hub';
import styles from './WorkHub.module.css';

export default function JiaSidePanel({ task, getStatuses, onDraft }: { task: Task; getStatuses: StatusResolver; onDraft?: (draft: string) => void }) {
  const [enabled, setEnabled] = useState(false);
  const [summary, setSummary] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inserted, setInserted] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    setEnabled(false);
    apiClient.get<{ data: { features: { taskSummary?: boolean } } }>('/settings/ai/status')
      .then(res => { if (active) setEnabled(!!res.data.data.features.taskSummary); }).catch(() => { if (active) setEnabled(false); });
    return () => { active = false; };
  }, [task.id]);
  useEffect(() => {
    request.current?.abort();
    setSummary(''); setDraft(''); setError(''); setLoading(false); setInserted(false);
    return () => request.current?.abort();
  }, [task.id, task.updatedAt]);
  const risk = taskRisk(task, getStatuses);
  const summarize = async () => {
    if (loading) return;
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError('');
    try { const res = await apiClient.post<{ data: { summary: string } }>('/ai/task-summary', { taskId: task.id }, { signal: controller.signal }); if (!controller.signal.aborted) setSummary(res.data.data.summary); }
    catch { if (!controller.signal.aborted) setError('요약을 불러오지 못했습니다. 설정과 연결 상태를 확인해 주세요.'); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  };
  const makeDraft = () => {
    const text = `${task.worker?.name || '담당자'}님, 「${task.title}」의 진행 상황을 확인 부탁드립니다.${risk ? ` 현재 ${risk} 상태입니다.` : ''} 남은 작업과 완료 예상일을 알려 주세요.`;
    setDraft(text); setInserted(false);
  };
  return <aside aria-label="JIA 업무 비서" className={`${styles.card} ${styles.jia}`}>
    <h2>JIA 업무 비서</h2><p className={styles.muted}>업무 #{task.id} · 제안과 초안을 검토한 후 직접 실행하세요.</p>
    <h3>현재 확인할 사항</h3><p className={styles.text}>{risk || '마감 또는 선행 업무 위험이 감지되지 않았습니다.'}</p>
    <p className={styles.muted}>최근 변경: {new Date(task.updatedAt).toLocaleString('ko-KR')}</p>
    <h3>다음 행동</h3><p className={styles.text}>{task.hasIncompleteBlockers ? '선행 업무의 완료 여부를 먼저 확인하세요.' : risk ? '담당자에게 진행 상황과 완료 예상일을 확인하세요.' : '체크리스트와 최근 댓글을 확인하세요.'}</p>
    <div className={styles.row}><button className={styles.button} disabled={!enabled || loading} onClick={summarize}>{loading ? '요약 중…' : '업무 요약'}</button>
      <button className={styles.button} onClick={makeDraft}>댓글 초안</button></div>
    {!enabled && <p className={styles.muted}>AI 업무 요약은 조직 AI 설정에서 활성화할 수 있습니다.</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}{summary && <p className={styles.text}>{summary}</p>}
    {draft && <div><p className={styles.muted}>기본 확인 문안 · AI 생성 아님</p><p className={styles.text}>{draft}</p>{onDraft && <button className={styles.button} disabled={inserted} onClick={() => { onDraft(draft); setInserted(true); }}>{inserted ? '입력란에 추가됨' : '댓글 입력란에 넣기'}</button>}</div>}
    <hr /><h3>준비 중</h3><p className={styles.muted}>하위 업무 생성 제안 · 일정 변경 제안 · 관련 문서 요약은 다음 단계에서 연결됩니다.</p>
    {task.projectId && <Link className={styles.button} href={`/projects/${task.projectId}`}>프로젝트 확인</Link>}
  </aside>;
}
