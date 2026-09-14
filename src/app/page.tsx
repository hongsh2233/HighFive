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
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&display=swap" />
            <span className={styles.navLogoIcon}>
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <text x="34" y="150" fontFamily="Fraunces, Georgia, serif" fontWeight="600" fontSize="156" fill="#FF6B4A">5</text>
                <g stroke="#FFB238" strokeWidth="9" strokeLinecap="round" fill="none">
                  <line x1="118" y1="46" x2="132" y2="30" />
                  <line x1="140" y1="58" x2="160" y2="46" />
                  <line x1="150" y1="76" x2="174" y2="72" />
                </g>
              </svg>
            </span>
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
          <span className={`${styles.heroBubble} ${styles.heroBubble1}`}>💬 회의록 자동 요약</span>
          <span className={`${styles.heroBubble} ${styles.heroBubble2}`}>✅ 오늘 할 일 3건</span>
          <span className={`${styles.heroBubble} ${styles.heroBubble3}`}>📅 D-2 마감 알림</span>

          <div className={styles.heroInner}>
            <span className={styles.heroBadge}>협업이 잘되면, 5시에 웃으며 퇴근한다</span>
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

          <div className={styles.heroVisual}>
            <div className={styles.heroGlow} aria-hidden="true" />
            <div className={styles.mockWindow}>
              <div className={styles.mockWindowBar}>
                <span className={styles.mockDot} />
                <span className={styles.mockDot} />
                <span className={styles.mockDot} />
              </div>
              <div className={styles.mockWindowBody}>
                <div className={styles.mockSidebar}>
                  <span className={`${styles.mockSidebarItem} ${styles.active}`} style={{ width: '70%' }} />
                  <span className={styles.mockSidebarItem} style={{ width: '55%' }} />
                  <span className={styles.mockSidebarItem} style={{ width: '60%' }} />
                  <span className={styles.mockSidebarItem} style={{ width: '45%' }} />
                </div>
                <div className={styles.mockMain}>
                  {[85, 62, 74, 50].map((w, i) => (
                    <div key={i} className={styles.mockRow}>
                      <span className={styles.mockCheck} />
                      <span className={styles.mockBar} style={{ width: `${w}%`, flex: 1 }} />
                      <span className={styles.mockBadge}>진행중</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className={`${styles.floatingCard} ${styles.floatingCard1}`}>
              <div className={styles.floatingCardTag}>✦ 주간 보고서 AI</div>
              <p className={styles.floatingCardText}>
                이번 주 완료 12건, 진행중 5건. 마감 임박 업무 2건은 담당자에게 리마인드했습니다.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.spotlights}>
          <div className={styles.spotlightRow}>
            <div>
              <span className={styles.eyebrow}>✦ AI 자동화</span>
              <h2 className={styles.spotlightTitle}>업무 초안부터 주간 보고서까지, AI가 먼저 씁니다</h2>
              <p className={styles.spotlightDesc}>
                제목만 입력하면 AI가 업무 초안을 잡아주고, 쌓인 업무 로그를 모아 주간 보고서를 자동으로 작성합니다.
                관리자가 API 키만 등록하면 기능별로 바로 켤 수 있습니다.
              </p>
              <div className={styles.chipRow}>
                <span className={styles.chip}><span className={styles.chipIcon}>✎</span>이번 주 우리 팀 진행 업무를 요약해줘</span>
                <span className={styles.chip}><span className={styles.chipIcon}>✎</span>이번 달에 완료해야 하는 업무 알려줘</span>
              </div>
            </div>
            <div className={styles.spotlightVisual}>
              <div className={styles.aiCard}>
                <div className={styles.aiCardHeader}>✦ 주간 보고서 AI</div>
                <div className={styles.aiCardLine} style={{ width: '92%' }} />
                <div className={styles.aiCardLine} style={{ width: '78%' }} />
                <div className={styles.aiCardLine} style={{ width: '85%' }} />
                <div className={styles.aiCardLine} style={{ width: '60%' }} />
              </div>
            </div>
          </div>

          <div className={`${styles.spotlightRow} ${styles.reverse}`}>
            <div>
              <span className={styles.eyebrow}>✦ 프로젝트 협업</span>
              <h2 className={styles.spotlightTitle}>회의록은 받아쓰고, 액션아이템은 업무로 바로</h2>
              <p className={styles.spotlightDesc}>
                프로젝트별 위키와 회의록을 한 곳에서 관리합니다. 음성 받아쓰기로 회의록을 작성하면,
                AI가 결정사항과 액션아이템을 자동으로 뽑아 업무로 바로 변환합니다.
              </p>
              <div className={styles.chipRow}>
                <span className={styles.chip}><span className={styles.chipIcon}>✎</span>오늘 회의에서 나온 액션아이템 정리해줘</span>
                <span className={styles.chip}><span className={styles.chipIcon}>✎</span>이 프로젝트 캘린더 일정 알려줘</span>
              </div>
            </div>
            <div className={styles.spotlightVisual}>
              <div className={styles.calendarMock}>
                <div className={styles.aiCardHeader}>📅 프로젝트 캘린더</div>
                <div className={styles.calendarGrid}>
                  {Array.from({ length: 21 }).map((_, i) => (
                    <span
                      key={i}
                      className={`${styles.calendarCell} ${i === 9 ? styles.today : [3, 12, 17].includes(i) ? styles.marked : ''}`}
                    />
                  ))}
                </div>
              </div>
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
