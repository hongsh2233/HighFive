'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import axios from 'axios';
import styles from './password.module.css';

export default function PasswordChangePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (authLoading) {
    return <div className={styles.loadingPage}>로딩 중...</div>;
  }

  if (!user) {
    return (
      <div className={styles.loadingPage}>
        <p className={styles.dangerText}>로그인이 필요합니다.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!currentPassword.trim()) {
        setError('현재 비밀번호를 입력해주세요.');
        setLoading(false);
        return;
      }

      if (!newPassword.trim()) {
        setError('새 비밀번호를 입력해주세요.');
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('새 비밀번호가 일치하지 않습니다.');
        setLoading(false);
        return;
      }

      if (newPassword.length < 8) {
        setError('새 비밀번호는 8자 이상이어야 합니다.');
        setLoading(false);
        return;
      }

      await axios.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setSuccess('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || '비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        비밀번호 변경
      </h1>

      {error && <div className={styles.errorBox}>{error}</div>}
      {success && <div className={styles.successBox}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>현재 비밀번호 *</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="현재 비밀번호를 입력하세요."
            className={styles.input}
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>새 비밀번호 *</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="새 비밀번호를 입력하세요. (8자 이상)"
            className={styles.input}
            disabled={loading}
          />
          <p className={styles.hint}>
            최소 8자, 영문 대소문자, 숫자, 특수문자 포함 권장
          </p>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>새 비밀번호 확인 *</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="새 비밀번호를 다시 입력하세요."
            className={styles.input}
            disabled={loading}
          />
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="submit"
            className={styles.btnSubmit}
            data-loading={loading ? 'true' : 'false'}
            disabled={loading}
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={() => router.back()}
            disabled={loading}
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
