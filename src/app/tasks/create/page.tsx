'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import dynamic from 'next/dynamic';
import axios from 'axios';
import styles from './create.module.css';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface Worker {
  id: number;
  name: string;
  email: string;
}

interface Project {
  id: number;
  name: string;
  status: string;
  members: { user: Worker }[];
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
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

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

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';

  useEffect(() => {
    if (!authLoading && user) {
      fetchProjects();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (projectId) {
      const proj = projects.find(p => p.id === parseInt(projectId));
      if (proj) {
        setWorkers(proj.members.map(m => m.user).filter(u => u.id !== Number(user?.id)));
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
      if (isManager && activeProjects.length > 0) {
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
      if (isManager && !projectId) { setError('프로젝트를 선택해주세요.'); setLoading(false); return; }

      await axios.post('/api/tasks', {
        title: title.trim(),
        workerId: parseInt(workerId),
        plannerId: user?.id,
        targetDate: targetDate ? new Date(targetDate) : null,
        notes: notes.trim(),
        projectId: projectId ? parseInt(projectId) : null,
      });

      setSuccess('업무가 등록되었습니다.');
      setTimeout(() => router.push('/tasks'), 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || '업무 등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className={styles.loading}>로딩 중...</div>;

  if (!user || !['ADMIN', 'MANAGER'].includes(user.role ?? '')) {
    return (
      <div className={styles.noPermission}>
        <p className={styles.dangerText}>업무를 등록할 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>업무 등록</h1>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}
      {success && <div className={styles.successBox}>{success}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* 왼쪽: 기본 정보 */}
        <div className={styles.leftPane}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>기본 정보</h2>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>등록일자</label>
              <div className={styles.dateDisplay}>📅 {createdDate} (자동)</div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>프로젝트 {isManager && <span className={styles.required}>*</span>}</label>
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
                placeholder="예: [DCBGIT-39085] 구글 원 2TB 상품 정보 수정"
                className={styles.input}
                disabled={loading}
              />
              <p className={styles.hint}>선택사항: [RMS-NO] 형식으로 입력하면 자동으로 분류됩니다.</p>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>담당자 <span className={styles.required}>*</span></label>
              <select value={workerId} onChange={e => setWorkerId(e.target.value)} className={styles.input} disabled={loading}>
                <option value="">담당자를 선택해주세요.</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.email})</option>
                ))}
              </select>
              {projectId && workers.length === 0 && (
                <p className={styles.hintError}>선택한 프로젝트에 작업자가 없습니다.</p>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>목표일</label>
              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className={styles.input} disabled={loading} />
            </div>
          </div>
        </div>

        {/* 오른쪽: 비고 에디터 */}
        <div className={styles.rightPane}>
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
        </div>

        {/* 하단 버튼 */}
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
