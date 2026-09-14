'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './drive.module.css';
import Spinner from '@/components/common/Spinner';

interface GoogleStatus {
  configured: boolean;
  connected: boolean;
  connectedAt: string | null;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string | null;
  webViewLink: string | null;
  createdTime: string | null;
}

function formatSize(size: string | null) {
  if (!size) return '';
  const bytes = parseInt(size, 10);
  if (Number.isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function DrivePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStatus = () => {
    apiClient.get<{ data: GoogleStatus }>('/auth/google/status')
      .then(res => setGoogleStatus(res.data.data))
      .catch(() => setGoogleStatus({ configured: false, connected: false, connectedAt: null }))
      .finally(() => setGoogleLoading(false));
  };

  const fetchFiles = async () => {
    setFilesLoading(true);
    try {
      const res = await apiClient.get<{ data: DriveFile[] }>('/drive/files');
      setFiles(res.data.data);
    } catch {
      // 연결 안 됨 등 - 조용히 무시
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchStatus();
  }, [authLoading]);

  useEffect(() => {
    if (googleStatus?.connected) fetchFiles();
  }, [googleStatus?.connected]);

  const handleConnect = () => {
    window.location.href = '/api/auth/google/authorize';
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiClient.post('/drive/files', formData);
      await fetchFiles();
    } catch {
      setError('업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 파일을 삭제하시겠습니까?')) return;
    try {
      await apiClient.delete(`/drive/files/${id}`);
      setFiles(prev => prev.filter(f => f.id !== id));
    } catch {
      setError('삭제 중 오류가 발생했습니다.');
    }
  };

  if (authLoading) {
    return <div className={styles.loadingPage}><Spinner /></div>;
  }

  if (!user) {
    return <div className={styles.loadingPage}>로그인이 필요합니다.</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>구글 드라이브</h1>
      <p className={styles.subtitle}>파일을 구글 드라이브(High5 전용 폴더)에 저장하고, 목록에서 바로 열어볼 수 있습니다.</p>

      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>연동 상태</h2>
        {googleLoading ? (
          <Spinner />
        ) : !googleStatus?.configured ? (
          <p className={styles.hintMuted}>구글 연동이 아직 준비 중입니다.</p>
        ) : !googleStatus.connected ? (
          <>
            <p className={styles.cardDesc}>
              구글 드라이브를 사용하려면 계정을 연결해야 합니다. 이미 구글 캘린더를 연결했더라도,
              드라이브 접근 권한이 추가되어 재연결(재동의) 1회가 필요합니다.
            </p>
            <button onClick={handleConnect} className={styles.btnGenerate}>Google 계정 연결</button>
          </>
        ) : (
          <>
            <p className={styles.cardDesc}>✅ 연동됨</p>
            <input ref={fileInputRef} type="file" onChange={handleUpload} disabled={uploading} style={{ fontSize: 13 }} />
            {uploading && <p className={styles.hintMuted}>업로드 중...</p>}
          </>
        )}
      </div>

      {googleStatus?.connected && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>파일 목록</h2>
          {filesLoading ? (
            <Spinner />
          ) : files.length === 0 ? (
            <p className={styles.hintMuted}>업로드된 파일이 없습니다.</p>
          ) : (
            <div className={styles.fileList}>
              {files.map(f => (
                <div key={f.id} className={styles.fileRow}>
                  <span className={styles.fileIcon}>📄</span>
                  <div className={styles.fileInfo}>
                    <div className={styles.fileName}>{f.name}</div>
                    <div className={styles.fileMeta}>
                      {formatSize(f.size)}
                      {f.createdTime && ` · ${new Date(f.createdTime).toLocaleDateString('ko-KR')}`}
                    </div>
                  </div>
                  <div className={styles.fileActions}>
                    {f.webViewLink && (
                      <a href={f.webViewLink} target="_blank" rel="noopener noreferrer" className={styles.btnOpen}>열기</a>
                    )}
                    <button onClick={() => handleDelete(f.id)} className={styles.btnDelete}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
