'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import styles from './security.module.css';

interface Session {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
}

export default function SecurityPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // 2FA state
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSaving, setOtpSaving] = useState(false);

  // Session state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/auth/2fa').then(r => r.json()).then(d => {
      if (d.success) setTotpEnabled(d.data.totpEnabled);
    });
    fetch('/api/auth/sessions').then(r => r.json()).then(d => {
      if (d.success) setSessions(d.data);
    }).finally(() => setSessionsLoading(false));
  }, [user]);

  const startSetup = async () => {
    const res = await fetch('/api/auth/2fa', { method: 'POST' }).then(r => r.json());
    if (res.success) {
      setQrCode(res.data.qrCodeDataUrl);
      setSecret(res.data.secret);
      setSetupMode(true);
      setOtpInput('');
      setOtpError('');
    }
  };

  const verifyAndActivate = async () => {
    setOtpError('');
    setOtpSaving(true);
    const res = await fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: otpInput }),
    }).then(r => r.json());
    setOtpSaving(false);
    if (res.success) {
      setTotpEnabled(true);
      setSetupMode(false);
      setQrCode('');
      setSecret('');
    } else {
      setOtpError(res.message || 'OTP 코드가 올바르지 않습니다.');
    }
  };

  const disableTotp = async () => {
    if (!confirm('2단계 인증을 비활성화하시겠습니까?')) return;
    const res = await fetch('/api/auth/2fa', { method: 'DELETE' }).then(r => r.json());
    if (res.success) setTotpEnabled(false);
  };

  const revokeSession = async (id: string) => {
    await fetch(`/api/auth/sessions/${id}`, { method: 'DELETE' });
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  if (isLoading) return null;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>보안 설정</h1>

      {/* 2FA Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>2단계 인증 (TOTP)</h2>
            <p className={styles.sectionDesc}>Google Authenticator, Authy 등 OTP 앱을 사용한 2단계 인증</p>
          </div>
          <span className={totpEnabled ? styles.badgeActive : styles.badgeOff}>
            {totpEnabled ? '활성' : '비활성'}
          </span>
        </div>

        {!setupMode && !totpEnabled && (
          <button className={styles.btnPrimary} onClick={startSetup}>2FA 설정 시작</button>
        )}

        {!setupMode && totpEnabled && (
          <button className={styles.btnDanger} onClick={disableTotp}>2FA 비활성화</button>
        )}

        {setupMode && (
          <div className={styles.setupBox}>
            <p className={styles.setupStep}><strong>1단계</strong> — OTP 앱으로 아래 QR 코드를 스캔하세요</p>
            {qrCode && <img src={qrCode} alt="QR Code" className={styles.qrCode} />}
            <p className={styles.setupManual}>QR 코드가 안 되면 아래 키를 직접 입력하세요</p>
            <code className={styles.secretCode}>{secret}</code>

            <p className={styles.setupStep} style={{ marginTop: 20 }}><strong>2단계</strong> — 앱에 표시된 6자리 코드를 입력하세요</p>
            {otpError && <p className={styles.otpError}>{otpError}</p>}
            <div className={styles.otpRow}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className={styles.otpInput}
                autoComplete="one-time-code"
              />
              <button className={styles.btnPrimary} onClick={verifyAndActivate} disabled={otpSaving || otpInput.length !== 6}>
                {otpSaving ? '확인 중...' : '확인 및 활성화'}
              </button>
              <button className={styles.btnSecondary} onClick={() => setSetupMode(false)}>취소</button>
            </div>
          </div>
        )}
      </section>

      {/* Sessions Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>로그인 기기 목록</h2>
        <p className={styles.sectionDesc}>현재 로그인된 기기와 세션을 관리합니다. 의심스러운 세션은 종료하세요.</p>

        {sessionsLoading ? (
          <p className={styles.sectionDesc}>불러오는 중...</p>
        ) : sessions.length === 0 ? (
          <p className={styles.sectionDesc}>기록된 세션이 없습니다.</p>
        ) : (
          <div className={styles.sessionList}>
            {sessions.map((s) => (
              <div key={s.id} className={styles.sessionItem}>
                <div className={styles.sessionInfo}>
                  <span className={styles.sessionDevice}>{s.deviceName || '알 수 없는 기기'}</span>
                  <span className={styles.sessionMeta}>
                    {s.ipAddress || 'IP 미확인'} · 마지막 활동 {new Date(s.lastActiveAt).toLocaleString('ko-KR')}
                  </span>
                </div>
                <button className={styles.btnDangerSm} onClick={() => revokeSession(s.id)}>종료</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
