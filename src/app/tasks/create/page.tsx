'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import dynamic from 'next/dynamic';
import axios from 'axios';
import styles from './create.module.css';
import { TASK_LABEL_LIST, TASK_LABEL_TEXT } from '@/lib/constants';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface Worker {
  id: number;
  name: string;
  email: string;
  role?: string;
}

interface Project {
  id: number;
  name: string;
  status: string;
  members: { user: Worker }[];
}

interface SubTaskForm {
  title: string;
  workerId: string;
  targetDate: string;
}

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'blockquote', 'code-block'],
    ['clean'],
  ],
};

export default function TaskCreatePage() {
  return (
    <Suspense fallback={<div className={styles.loading}>로딩 중...</div>}>
      <TaskCreateForm />
    </Suspense>
  );
}

function TaskCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentTaskIdParam = searchParams.get('parentTaskId');
  const { user, isLoading: authLoading } = useAuth();

  const [parentTask, setParentTask] = useState<{ id: number; title: string } | null>(null);
  const [title, setTitle] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdDate] = useState(new Date().toLocaleDateString('ko-KR'));
  const [labels, setLabels] = useState<string[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [timeCounterEnabled, setTimeCounterEnabled] = useState(true);
  const [subTasks, setSubTasks] = useState<SubTaskForm[]>([{ title: '', workerId: '', targetDate: '' }]);

  const toggleLabel = (code: string) => {
    setLabels(prev => prev.includes(code) ? prev.filter(l => l !== code) : [...prev, code]);
  };

  const addSubTask = () => setSubTasks(prev => [...prev, { title: '', workerId: '', targetDate: '' }]);
  const removeSubTask = (idx: number) => setSubTasks(prev => prev.filter((_, i) => i !== idx));
  const updateSubTask = (idx: number, patch: Partial<SubTaskForm>) => {
    setSubTasks(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const assignableWorkers = workers.filter(w => w.role !== 'ADMIN');

  const isAdmin = user?.role === 'ADMIN';
  const isLeader = user?.role === 'LEADER';

  useEffect(() => {
    if (!authLoading && user) {
      fetchProjects();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (parentTaskIdParam) {
      fetchParentTask(parentTaskIdParam);
    }
  }, [parentTaskIdParam]);

  const fetchParentTask = async (id: string) => {
    try {
      const res = await axios.get(`/api/tasks/${id}`);
      setParentTask({ id: res.data.data.id, title: res.data.data.title });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (projectId) {
      const proj = projects.find(p => p.id === parseInt(projectId));
      if (proj) {
        setWorkers(proj.members.map(m => m.user));
      }
    } else if (isAdmin) {
      fetchAllWorkers();
    } else {
      setWorkers([]);
    }
    setWorkerId('');
  }, [projectId, projects]);

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects');
      const activeProjects = (res.data.data || []).filter((p: Project) => p.status === 'ACTIVE');
      setProjects(activeProjects);
      if (isLeader && activeProjects.length > 0) {
        const myProject = activeProjects.find((p: Project) =>
          p.members.some((m: { user: Worker }) => m.user.id === Number(user?.id))
        );
        if (myProject) setProjectId(String(myProject.id));
      }
      if (isAdmin && activeProjects.length === 0) fetchAllWorkers();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllWorkers = async () => {
    try {
      const res = await axios.get('/api/users?role=WORKER');
      setWorkers(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!title.trim()) { setError('업무 제목을 입력해주세요.'); setLoading(false); return; }
      if (!workerId) { setError('담당자를 선택해주세요.'); setLoading(false); return; }
      if (isLeader && !projectId) { setError('프로젝트를 선택해주세요.'); setLoading(false); return; }

      const validSubTasks = subTasks.filter(s => s.title.trim() && s.workerId);

      await axios.post('/api/tasks', {
        title: title.trim(),
        workerId: parseInt(workerId),
        plannerId: user?.id,
        targetDate: targetDate ? new Date(targetDate) : null,
        notes: (!parentTask && isGroup) ? '' : notes.trim(),
        projectId: projectId ? parseInt(projectId) : null,
        labels,
        parentTaskId: parentTask ? parentTask.id : undefined,
        isGroup: !parentTask && isGroup,
        timeCounterEnabled,
        subTasks: (!parentTask && isGroup) ? validSubTasks.map(s => ({
          title: s.title.trim(),
          workerId: parseInt(s.workerId),
          targetDate: s.targetDate || null,
        })) : undefined,
      });

      setSuccess(parentTask ? '하위 업무가 추가되었습니다.' : '업무가 등록되었습니다.');
      const redirectUrl = projectId ? `/tasks?projectId=${projectId}` : '/tasks';
      setTimeout(() => router.push(redirectUrl), 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || '업무 등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className={styles.loading}>로딩 중...</div>;

  if (!user || !['ADMIN', 'LEADER'].includes(user.role ?? '')) {
    return (
      <div className={styles.noPermission}>
        <p className={styles.dangerText}>업무를 등록할 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>{parentTask ? '하위 업무 등록' : '업무 등록'}</h1>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}
      {success && <div className={styles.successBox}>{success}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.leftPane}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>기본 정보</h2>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>등록일자</label>
              <div className={styles.dateDisplay}>📅 {createdDate} (자동)</div>
            </div>

            {parentTask && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>상위 그룹</label>
                <div className={styles.dateDisplay}>📁 {parentTask.title}</div>
              </div>
            )}

            <div className={styles.fieldGroup}>
              <label className={styles.label}>프로젝트 {isLeader && <span className={styles.required}>*</span>}</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} className={styles.input} disabled={loading}>
                <option value="">프로젝트 선택 {isAdmin ? '(선택사항)' : ''}</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>업무 제목 <span className={styles.required}>*</span></label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="업무제목을 입력하세요."
                className={styles.input}
                disabled={loading}
              />
              <p className={styles.hint}>선택사항: [RMS-NO] 형식으로 입력하면 자동으로 분류됩니다.</p>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>담당자 <span className={styles.required}>*</span></label>
              <select value={workerId} onChange={e => setWorkerId(e.target.value)} className={styles.input} disabled={loading}>
                <option value="">담당자를 선택해주세요.</option>
                {assignableWorkers.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              {projectId && assignableWorkers.length === 0 && (
                <p className={styles.hintError}>선택한 프로젝트에 작업자가 없습니다.</p>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>목표일</label>
              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className={styles.input} disabled={loading} />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>라벨</label>
              <div className={styles.labelRow}>
                {TASK_LABEL_LIST.map(code => (
                  <label key={code} className={styles.labelChip} data-checked={labels.includes(code) ? 'true' : 'false'} data-label={code}>
                    <input
                      type="checkbox"
                      checked={labels.includes(code)}
                      onChange={() => toggleLabel(code)}
                      className={styles.labelCheckbox}
                    />
                    {TASK_LABEL_TEXT[code]}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.groupCheckLabel}>
                <input
                  type="checkbox"
                  checked={timeCounterEnabled}
                  onChange={e => setTimeCounterEnabled(e.target.checked)}
                  className={styles.labelCheckbox}
                />
                시간카운터 사용 (상태 변경에 따라 작업 시간을 자동으로 계산합니다)
              </label>
            </div>

            {!parentTask && (
              <div className={styles.fieldGroup}>
                <label className={styles.groupCheckLabel}>
                  <input
                    type="checkbox"
                    checked={isGroup}
                    onChange={e => setIsGroup(e.target.checked)}
                    className={styles.labelCheckbox}
                  />
                  그룹 업무로 등록 (하위 업무는 지금 등록하거나, 나중에 그룹 업무 상세에서 추가할 수 있습니다)
                </label>
              </div>
            )}
          </div>
        </div>

        <div className={styles.rightPane}>
          {!parentTask && isGroup ? (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>하위 업무</h2>
              <p className={styles.hint}>지금 입력하지 않아도 그룹 업무 등록 후 목록에서 하위 업무를 추가할 수 있습니다.</p>
              {subTasks.map((sub, idx) => (
                <div key={idx} className={styles.subTaskRow}>
                  <input
                    type="text"
                    value={sub.title}
                    onChange={e => updateSubTask(idx, { title: e.target.value })}
                    placeholder="하위 업무 제목"
                    className={styles.input}
                    disabled={loading}
                  />
                  <select
                    value={sub.workerId}
                    onChange={e => updateSubTask(idx, { workerId: e.target.value })}
                    className={styles.input}
                    disabled={loading}
                  >
                    <option value="">담당자</option>
                    {assignableWorkers.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={sub.targetDate}
                    onChange={e => updateSubTask(idx, { targetDate: e.target.value })}
                    className={styles.input}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className={styles.removeSubBtn}
                    onClick={() => removeSubTask(idx)}
                    disabled={loading || subTasks.length === 1}
                  >
                    삭제
                  </button>
                </div>
              ))}
              <button type="button" className={styles.addSubBtn} onClick={addSubTask} disabled={loading}>
                + 하위 업무 추가
              </button>
            </div>
          ) : (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>비고</h2>
              <div className={styles.editorWrap}>
                <ReactQuill
                  theme="snow"
                  value={notes}
                  onChange={setNotes}
                  modules={quillModules}
                  className={styles.editor}
                  placeholder="업무에 대한 상세 내용을 입력해주세요."
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.btnRow}>
          <button type="submit" data-loading={loading} className={styles.submitBtn} disabled={loading}>
            {loading ? '등록 중...' : '업무 등록'}
          </button>
          <button type="button" className={styles.cancelBtn} onClick={() => router.push('/tasks')} disabled={loading}>
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
