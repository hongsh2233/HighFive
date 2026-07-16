'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
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

export default function LandingPage() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [slugError, setSlugError] = useState('');

  const handleOrgLogin = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = slug.trim().toLowerCase();
    if (!trimmed) {
      setSlugError('조직 슬러그를 입력해주세요.');
      return;
    }
    router.push(`/${trimmed}/login`);
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
            <Link href="/login" className={styles.navLink}>슈퍼관리자</Link>
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
              <a href="#features" className={styles.btnSecondary}>기능 살펴보기</a>
            </div>

            <form onSubmit={handleOrgLogin} className={styles.orgLoginForm}>
              <span className={styles.orgLoginLabel}>이미 사용 중이신가요?</span>
              <div className={styles.orgLoginRow}>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugError(''); }}
                  placeholder="조직 슬러그 입력 (예: acme)"
                  className={styles.orgLoginInput}
                />
                <button type="submit" className={styles.orgLoginBtn}>조직 로그인</button>
              </div>
              {slugError && <p className={styles.orgLoginError}>{slugError}</p>}
            </form>
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
            <p className={styles.ctaSubtitle}>회사명과 이메일만 있으면 1분 안에 조직을 만들 수 있습니다.</p>
            <Link href="/register" className={styles.btnPrimary}>무료로 시작하기</Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>© {new Date().getFullYear()} High5</span>
          <div className={styles.footerLinks}>
            <Link href="/register" className={styles.footerLink}>회원가입</Link>
            <Link href="/login" className={styles.footerLink}>슈퍼관리자</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
