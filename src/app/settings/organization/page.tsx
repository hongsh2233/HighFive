'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import Spinner from '@/components/common/Spinner';
import styles from './organization.module.css';

interface OrgSettings {
  id: number;
  name: string;
  slug: string;
  displayName: string | null;
  logoUrl: string | null;
  bizNo: string | null;
  phone: string | null;
  ceoName: string | null;
  address: string | null;
  deadlineAlertDays: number;
  plan: string;
}

export default function OrganizationSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [org, setOrg] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [bizNo, setBizNo] = useState('');
  const [phone, setPhone] = useState('');
  const [ceoName, setCeoName] = useState('');
  const [address, setAddress] = useState('');
  const [deadlineAlertDays, setDeadlineAlertDays] = useState(3);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    apiClient.get<{ data: OrgSettings }>('/settings/organization')
      .then(res => {
        const data = res.data.data;
        setOrg(data);
        setDisplayName(data.displayName || '');
        setBizNo(data.bizNo || '');
        setPhone(data.phone || '');
        setCeoName(data.ceoName || '');
        setAddress(data.address || '');
        setDeadlineAlertDays(data.deadlineAlertDays);
      })
      .catch(() => setError('조직 설정을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [authLoading]);

  const handleSave = async () => {
    setError(''); setSuccess('');
    setSaving(true);
    try {
      const res = await apiClient.patch<{ data: OrgSettings }>('/settings/organization', {
        displayName, bizNo, phone, ceoName, address, deadlineAlertDays,
      });
      setOrg(res.data.data);
      setSuccess('설정이 저장되었습니다.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024) {
      setError('로고 이미지는 200KB 이하여야 합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setLogoUploading(true);
      setError('');
      try {
        const res = await apiClient.post<{ data: { logoUrl: string } }>('/settings/organization/logo', { logoBase64: base64 });
        setOrg(prev => prev ? { ...prev, logoUrl: res.data.data.logoUrl } : prev);
        setSuccess('로고가 저장되었습니다.');
        setTimeout(() => setSuccess(''), 3000);
      } catch (e: any) {
        setError(e?.response?.data?.message || '로고 저장 중 오류가 발생했습니다.');
      } finally {
        setLogoUploading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLogoDelete = async () => {
    if (!confirm('로고를 삭제하시겠습니까?')) return;
    setLogoUploading(true);
    try {
      await apiClient.delete('/settings/organization/logo');
      setOrg(prev => prev ? { ...prev, logoUrl: null } : prev);
      setSuccess('로고가 삭제되었습니다.');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('로고 삭제 중 오류가 발생했습니다.');
    } finally {
      setLogoUploading(false);
    }
  };

  const [backupDownloading, setBackupDownloading] = useState(false);

  const handleBackupDownload = async () => {
    setError('');
    setBackupDownloading(true);
    try {
      const res = await apiClient.get('/settings/organization/backup', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `highfive-backup-${org?.slug || 'org'}-${dateStr}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('데이터 백업 다운로드 중 오류가 발생했습니다.');
    } finally {
      setBackupDownloading(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  if (authLoading || loading) return <div className={styles.loading}><Spinner /></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>조직 설정</h1>
        <span className={styles.planBadge}>{org?.plan ?? 'FREE'}</span>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}
      {success && <div className={styles.successBox}>{success}</div>}

      {/* 로고 섹션 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>조직 로고</h2>
        <div className={styles.logoArea}>
          <div className={styles.logoPreview}>
            {org?.logoUrl
              ? <img src={org.logoUrl} alt="조직 로고" className={styles.logoImg} />
              : <div className={styles.logoPlaceholder}>{org?.name?.slice(0, 2).toUpperCase()}</div>
            }
          </div>
          {isAdmin && (
            <div className={styles.logoActions}>
              <p className={styles.logoHint}>PNG, JPG, SVG / 최대 200KB<br />헤더에 표시되는 조직 로고입니다.</p>
              <div className={styles.logoBtns}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                  style={{ display: 'none' }}
                  onChange={handleLogoFile}
                />
                <button
                  className={styles.btnSecondary}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoUploading}
                >
                  {logoUploading ? '업로드 중...' : org?.logoUrl ? '로고 변경' : '로고 업로드'}
                </button>
                {org?.logoUrl && (
                  <button className={styles.btnDanger} onClick={handleLogoDelete} disabled={logoUploading}>
                    삭제
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 기본 정보 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>기본 정보</h2>
        <div className={styles.formGrid}>
          <div className={styles.formRow}>
            <label className={styles.label}>조직명 (slug)</label>
            <input className={styles.inputReadonly} value={org?.name ?? ''} readOnly />
            <span className={styles.hint}>변경하려면 시스템 관리자에게 문의하세요.</span>
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>헤더 표시명</label>
            <input
              className={styles.input}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={org?.name ?? ''}
              disabled={!isAdmin}
              maxLength={40}
            />
            <span className={styles.hint}>비워두면 조직명이 그대로 사용됩니다.</span>
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>사업자번호</label>
            <input
              className={styles.input}
              value={bizNo}
              onChange={e => setBizNo(e.target.value)}
              placeholder="000-00-00000"
              disabled={!isAdmin}
              maxLength={20}
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>대표자명</label>
            <input
              className={styles.input}
              value={ceoName}
              onChange={e => setCeoName(e.target.value)}
              placeholder="홍길동"
              disabled={!isAdmin}
              maxLength={30}
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>대표번호</label>
            <input
              className={styles.input}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="02-0000-0000"
              disabled={!isAdmin}
              maxLength={20}
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>주소</label>
            <input
              className={styles.input}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="서울시 강남구 ..."
              disabled={!isAdmin}
              maxLength={200}
            />
          </div>
        </div>
      </section>

      {/* 업무 설정 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>업무 설정</h2>
        <div className={styles.formGrid}>
          <div className={styles.formRow}>
            <label className={styles.label}>마감 알림 기준일</label>
            <div className={styles.inputInline}>
              <input
                type="number"
                className={styles.inputNum}
                value={deadlineAlertDays}
                min={1}
                max={30}
                onChange={e => setDeadlineAlertDays(Number(e.target.value))}
                disabled={!isAdmin}
              />
              <span className={styles.unit}>일 전부터 D-day 경고 표시</span>
            </div>
          </div>
        </div>
      </section>

      {/* 데이터 백업 */}
      {isAdmin && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>데이터 백업</h2>
          <p className={styles.hint}>
            업무, 프로젝트, 위키, 신청, 공지 등 조직의 전체 데이터를 JSON 파일로 내려받습니다.
            (첨부파일 실제 내용은 용량 문제로 제외되며 목록만 포함됩니다.)
          </p>
          <button className={styles.btnSecondary} onClick={handleBackupDownload} disabled={backupDownloading} style={{ marginTop: 'var(--space-3)' }}>
            {backupDownloading ? '백업 생성 중...' : '전체 데이터 백업 다운로드'}
          </button>
        </section>
      )}

      {isAdmin && (
        <div className={styles.saveRow}>
          <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      )}
    </div>
  );
}
