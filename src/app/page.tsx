'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import styles from './landing.module.css';

const FEATURES = [
  {
    icon: '📋',
    title: '업무 관리',
    desc: '칸반보드, 우선순위, 체크리스트, 선후행 의존관계까지 — 업무 상태 변경에 맞춰 작업시간을 자동으로 기록합니다.',
  },
  {
    icon: '📖',
    title: '프로젝트 협업',
    desc: '프로젝트별 위키와 회의록. 음성 받아쓰기로 회의록을 작성하고, AI가 결정사항·액션아이템을 자동 요약해 업무로 바로 변환합니다.',
  },
  {
    icon: '📊',
    title: '일정 & 리포트',
    desc: '캘린더(구글 캘린더 연동), 통계 대시보드, AI가 작성하는 주간 보고서로 팀 현황을 한눈에 파악합니다.',
  },
  {
    icon: '🤖',
    title: 'AI 자동화',
    desc: '업무 초안 작성, 업무 요약, 자연어 검색, 업무 부하 분석까지 — 관리자가 API 키만 등록하면 기능별로 바로 켤 수 있습니다.',
  },
  {
    icon: '🔔',
    title: '알림 & 보안',
    desc: '업무·프로젝트 단위 알림 음소거, 조직 간 완전 데이터 격리, 역할 기반 권한(관리자/리더/작업자)으로 안전하게 운영합니다.',
  },
  {
    icon: '🔗',
    title: '외부 연동',
    desc: 'GitHub PR/이슈 양방향 동기화, Slack·잔디·Teams·텔레그램·카카오톡 알림 채널을 지원합니다.',
  },
];

const emptyDemoForm = { name: '', company: '', email: '', phone: '', message: '' };

export default function LandingPage() {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoForm, setDemoForm] = useState(emptyDemoForm);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [demoError, setDemoError] = useState('');
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const openDemoModal = () => {
    setDemoForm(emptyDemoForm);
    setDemoError('');
    setDemoSubmitted(false);
    setShowDemoModal(true);
  };

  const handleDemoSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setDemoError('');
    setDemoSubmitting(true);
    try {
      const res = await fetch('/api/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setDemoError(data.message || '신청 중 오류가 발생했습니다.');
        return;
      }
      setDemoSubmitted(true);
    } catch {
      setDemoError('신청 중 오류가 발생했습니다.');
    } finally {
      setDemoSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navLogo}>
            <span className={styles.navLogoIcon}>H</span>
            <span className={styles.navLogoText}>High5</span>
          </div>
          <div className={styles.navActions}>
            <button onClick={openDemoModal} className={styles.navLink}>무료 데모 신청</button>
            <Link href="/register" className={styles.navCta}>무료로 시작하기</Link>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <span className={styles.heroBadge}>노션보다 단순하게, 지라보다 가볍게</span>
            <h1 className={styles.heroTitle}>
              팀 업무 관리부터<br />AI 자동화까지, <span className={styles.heroAccent}>High5</span> 하나로
            </h1>
            <p className={styles.heroSubtitle}>
              업무·프로젝트·위키·회의록·캘린더를 한 곳에서 관리하고,<br />
              AI가 업무 초안 작성부터 주간 보고서까지 자동으로 처리합니다.
            </p>
            <div className={styles.heroActions}>
              <Link href="/register" className={styles.btnPrimary}>무료로 시작하기</Link>
              <button onClick={openDemoModal} className={styles.btnSecondary}>무료 데모 신청</button>
            </div>
          </div>
        </section>

        <section id="features" className={styles.features}>
          <div className={styles.featuresInner}>
            <h2 className={styles.sectionTitle}>필요한 협업 도구, 전부 갖췄습니다</h2>
            <div className={styles.featureGrid}>
              {FEATURES.map((f) => (
                <div key={f.title} className={styles.featureCard}>
                  <div className={styles.featureIcon}>{f.icon}</div>
                  <h3 className={styles.featureTitle}>{f.title}</h3>
                  <p className={styles.featureDesc}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <div className={styles.ctaInner}>
            <h2 className={styles.ctaTitle}>지금 바로 팀과 함께 시작해보세요</h2>
            <p className={styles.ctaSubtitle}>회사명과 이메일만 있으면 1분 안에 조직을 만들 수 있습니다. 먼저 체험해보고 싶다면 무료 데모를 신청하세요.</p>
            <div className={styles.heroActions}>
              <Link href="/register" className={styles.btnPrimary}>무료로 시작하기</Link>
              <button onClick={openDemoModal} className={styles.btnSecondary}>무료 데모 신청</button>
            </div>
          </div>
        </section>
      </main>

      {showDemoModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDemoModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {demoSubmitted ? (
              <div className={styles.modalSuccess}>
                <p className={styles.modalSuccessIcon}>✅</p>
                <h3 className={styles.modalTitle}>신청이 접수되었습니다</h3>
                <p className={styles.modalSubtitle}>담당자가 확인 후 입력하신 이메일로 연락드리겠습니다.</p>
                <button onClick={() => setShowDemoModal(false)} className={styles.btnPrimary}>닫기</button>
              </div>
            ) : (
              <>
                <h3 className={styles.modalTitle}>무료 데모 신청</h3>
                <p className={styles.modalSubtitle}>담당자가 확인 후 빠르게 연락드리겠습니다.</p>
                {demoError && <div className={styles.modalError}>{demoError}</div>}
                <form onSubmit={handleDemoSubmit}>
                  <div className={styles.modalFieldGroup}>
                    <label className={styles.modalLabel}>이름 *</label>
                    <input
                      type="text"
                      required
                      value={demoForm.name}
                      onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                      className={styles.modalInput}
                    />
                  </div>
                  <div className={styles.modalFieldGroup}>
                    <label className={styles.modalLabel}>회사명 *</label>
                    <input
                      type="text"
                      required
                      value={demoForm.company}
                      onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })}
                      className={styles.modalInput}
                    />
                  </div>
                  <div className={styles.modalFieldGroup}>
                    <label className={styles.modalLabel}>이메일 *</label>
                    <input
                      type="email"
                      required
                      value={demoForm.email}
                      onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                      className={styles.modalInput}
                    />
                  </div>
                  <div className={styles.modalFieldGroup}>
                    <label className={styles.modalLabel}>연락처</label>
                    <input
                      type="text"
                      value={demoForm.phone}
                      onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                      placeholder="선택 입력"
                      className={styles.modalInput}
                    />
                  </div>
                  <div className={styles.modalFieldGroup}>
                    <label className={styles.modalLabel}>남기실 말씀</label>
                    <textarea
                      value={demoForm.message}
                      onChange={(e) => setDemoForm({ ...demoForm, message: e.target.value })}
                      placeholder="궁금하신 점이나 팀 규모를 알려주시면 더 도움이 됩니다."
                      className={styles.modalTextarea}
                    />
                  </div>
                  <div className={styles.modalActions}>
                    <button type="button" onClick={() => setShowDemoModal(false)} className={styles.btnSecondary}>취소</button>
                    <button type="submit" disabled={demoSubmitting} className={styles.btnPrimary}>
                      {demoSubmitting ? '전송 중...' : '신청하기'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>© {new Date().getFullYear()} High5</span>
          <div className={styles.footerLinks}>
            <Link href="/register" className={styles.footerLink}>회원가입</Link>
            <Link href="/legal/terms" className={styles.footerLink}>이용약관</Link>
            <Link href="/legal/privacy" className={styles.footerLink}>개인정보처리방침</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
