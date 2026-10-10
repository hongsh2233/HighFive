'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';
import styles from './WorkHub.module.css';

export type ExtensionArea = 'docs' | 'inbox' | 'reports' | 'jia' | 'automation';
const AREAS: Record<ExtensionArea, { title: string; description: string; next: string }> = {
  docs: { title: '문서 · Work Docs', description: '기존 지식베이스와 회의록을 이어서 사용하세요.', next: '업무–문서 연결, 문서 유형, 수정 이력, JIA Action Item 추출' },
  inbox: { title: '수신함', description: '기존 요청·문의 기능을 유지하며 통합 수신함을 준비합니다.', next: '내부 요청·외부 문의·JIA 업무 후보의 통합 분류와 업무 전환' },
  reports: { title: '리포트', description: '기존 통계와 주간보고를 이어서 사용하세요.', next: '완료율·지연율·담당자 분배·주간 변화 및 JIA 해석' },
  jia: { title: 'JIA', description: 'HOME 브리핑과 업무 상세의 JIA 패널에서 업무 상황을 확인하세요.', next: 'HighFive 데이터를 기반으로 한 대화, 제안 검토, 승인 정책과 실행 이력' },
  automation: { title: '자동화', description: '기존 반복 업무와 외부연동 설정을 유지합니다.', next: '이벤트 기반 규칙, 승인 정책, 실행 기록 및 실패 재시도' },
};
export default function PhaseGateway({ area }: { area: ExtensionArea }) {
  const { user } = useAuth();
  const manager = ['ADMIN', 'LEADER'].includes(user?.role || '');
  const [inquiry, setInquiry] = useState(false);
  const [plan, setPlan] = useState<{ features: string[]; knowledgeBaseMode: string } | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    apiClient.get<{ data: { features: string[]; knowledgeBaseMode: string } }>('/plan-config')
      .then(res => { if (active) setPlan(res.data.data); }).catch(() => {});
    if (area === 'inbox' && !manager) apiClient.get<{ data: { capabilities?: { INQUIRY_MANAGE?: boolean } } }>('/users/me')
      .then(res => { if (active) setInquiry(!!res.data.data.capabilities?.INQUIRY_MANAGE); }).catch(() => {});
    return () => { active = false; };
  }, [user?.id, area, manager]);
  const links: { href: string; label: string }[] = [];
  if (area === 'docs') {
    if (plan?.knowledgeBaseMode === 'WIKI' && plan.features.includes('wiki')) links.push({ href: '/wiki', label: '프로젝트 위키' });
    if (plan?.knowledgeBaseMode === 'INFO' && plan.features.includes('info')) links.push({ href: '/info', label: '지식베이스' });
    links.push({ href: '/meetings', label: '회의록' }, { href: '/my-notes', label: '개인 문서' });
  }
  if (area === 'inbox') {
    if (plan?.features.includes('requests')) links.push({ href: '/requests', label: '신청·결재' });
    if (manager || inquiry) links.push({ href: '/inquiries', label: '외부 문의' });
  }
  if (area === 'reports' && manager) {
    if (plan?.features.includes('stats')) links.push({ href: '/stats', label: '기존 통계' });
    links.push({ href: '/weekly-reports', label: '주간보고' });
  }
  if (area === 'jia') links.push({ href: '/dashboard', label: '오늘의 브리핑' }, { href: '/my-work', label: '내 업무' });
  if (area === 'automation' && manager) {
    links.push({ href: '/settings/recurring-tasks', label: '반복 업무' });
    if (user?.role === 'ADMIN' && plan?.features.includes('integrations')) links.push({ href: '/settings/integrations', label: '외부연동' });
  }
  const config = AREAS[area];
  return <section className={styles.page}><header className={styles.header}><div><h1>{config.title}</h1><p className={styles.muted}>{config.description}</p></div></header>
    <div className={styles.card}><h2>현재 사용할 수 있는 기능</h2><div className={styles.row}>{links.map(link => <Link key={link.href} href={link.href} className={styles.button}>{link.label} →</Link>)}</div></div>
    <div className={styles.card}><h2>다음 단계 · 준비 중</h2><p className={styles.text}>{config.next}</p><p className={styles.muted}>이번 단계에서는 화면 진입점과 기존 기능 연결을 준비했습니다.</p></div>
  </section>;
}
