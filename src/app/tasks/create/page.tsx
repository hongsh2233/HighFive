'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import dynamic from 'next/dynamic';
import axios from 'axios';
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

      // MANAGER: 자신이 속한 첫 번째 프로젝트 자동 선택
      if (isManager && activeProjects.length > 0) {
        const myProject = activeProjects.find((p: Project) =>
          p.members.some((m: { user: Worker }) => m.user.id === Number(user?.id))
        );
        if (myProject) setProjectId(String(myProject.id));
      }

      // ADMIN이고 프로젝트 없으면 전체 작업자 로드
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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: 'var(--space-3)', border: '1px solid var(--color-gray-300)',
    borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: 'var(--space-2)', fontSize: '14px', fontWeight: '600', color: 'var(--color-gray-900)',
  };

  const fieldStyle: React.CSSProperties = { marginBottom: 'var(--space-6)' };

  const quillModules = {
    toolbar: [['bold', 'italic', 'underline'], ['link'], ['clean']],
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>업무 등록</h1>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}
      {success && <div className={styles.successBox}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div style={fieldStyle}>
          <label style={labelStyle}>등록일자</label>
          <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-gray-100)', borderRadius: '6px', fontSize: '14px', color: 'var(--color-gray-900)', fontWeight: '500' }}>
            📅 {createdDate} (자동)
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>
            프로젝트 {isManager && '*'}
          </label>
          <select value={projectId} onChange={e => setProjectId(e.target.value)} style={inputStyle} disabled={loading}>
            <option value="">프로젝트 선택 {isAdmin ? '(선택사항)' : ''}</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>업무 제목 *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="예: [DCBGIT-39085] 구글 원 2TB 상품 정보 수정"
            style={inputStyle}
            disabled={loading}
          />
          <p style={{ fontSize: '12px', color: 'var(--color-gray-600)', marginTop: 'var(--space-2)' }}>
            선택사항: [RMS-NO] 형식으로 입력하면 자동으로 분류됩니다.
          </p>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>담당자 *</label>
          <select value={workerId} onChange={e => setWorkerId(e.target.value)} style={inputStyle} disabled={loading}>
            <option value="">담당자를 선택해주세요.</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.name} ({w.email})</option>
            ))}
          </select>
          {projectId && workers.length === 0 && (
            <p style={{ fontSize: '12px', color: '#DC2626', marginTop: 'var(--space-2)' }}>선택한 프로젝트에 작업자가 없습니다.</p>
          )}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>목표일</label>
          <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={inputStyle} disabled={loading} />
        </div>

        <div style={{ ...fieldStyle, marginBottom: 'var(--space-8)' }}>
          <label style={labelStyle}>비고</label>
          <ReactQuill
            theme="snow"
            value={notes}
            onChange={setNotes}
            modules={quillModules}
            style={{ backgroundColor: 'white' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button type="submit" style={{ flex: 1, padding: 'var(--space-3)', backgroundColor: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: loading ? 0.6 : 1 }} disabled={loading}>
            {loading ? '등록 중...' : '등록'}
          </button>
          <button type="button" className={styles.cancelBtn} onClick={() => router.push('/tasks')} disabled={loading}>
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
