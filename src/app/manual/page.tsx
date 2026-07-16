'use client';

import { useState } from 'react';
import styles from './manual.module.css';

interface Section {
  id: string;
  icon: string;
  title: string;
  items: { title: string; desc: string }[];
}

const SECTIONS: Section[] = [
  {
    id: 'tasks',
    icon: '📋',
    title: '업무 관리',
    items: [
      { title: '업무 등록/목록', desc: '프로젝트별로 업무를 등록하고, 목록에서 프로젝트/상태/담당자로 필터링하거나 텍스트로 검색·정렬할 수 있습니다. 상단 탭으로 "전체 / 내 담당 / 내가 멘션된 업무"를 바로 전환할 수 있습니다.' },
      { title: '칸반 보드', desc: '업무를 드래그해서 상태를 바꿀 수 있습니다. 담당자 아바타, 라벨, 우선순위, 선행 업무 잠금(🔒) 표시가 카드에 함께 보입니다.' },
      { title: '우선순위/체크리스트', desc: '업무별로 우선순위(낮음~긴급)를 지정하고, 체크리스트로 세부 작업 진행률을 관리할 수 있습니다.' },
      { title: '선후행 의존관계', desc: '업무 상세의 "선행 업무" 카드에서 먼저 끝나야 하는 업무를 지정할 수 있습니다. 선행 업무가 완료되지 않으면 해당 업무를 "진행중"으로 시작할 수 없습니다(칸반 드래그 시에도 동일하게 차단).' },
      { title: '자동 시간 카운트', desc: '업무가 "진행중" 단계로 들어가면 자동으로 작업 시간이 기록되고, 벗어나면 자동으로 종료됩니다. 업무 등록 시 "시간카운터 사용" 체크로 켜고 끌 수 있습니다.' },
      { title: '댓글/멘션/첨부파일', desc: '업무에 댓글과 답글을 달고 @멘션으로 알림을 보낼 수 있습니다. 댓글은 등록 후에도 수정 가능하며, 파일 첨부(최대 5MB/건, 20MB/업무 전체)도 지원합니다.' },
      { title: '활동 히스토리', desc: '업무 상세 하단 "활동 히스토리"를 클릭하면 상태 변경, 담당자 변경 등 모든 변경 이력을 볼 수 있습니다.' },
    ],
  },
  {
    id: 'collab',
    icon: '📖',
    title: '프로젝트 협업',
    items: [
      { title: '프로젝트 위키', desc: '프로젝트별로 문서를 작성/공유할 수 있습니다. 해당 프로젝트 멤버 또는 관리자만 조회/작성 가능합니다.' },
      { title: '회의록', desc: '프로젝트별 회의록을 작성합니다. 🎙️ 받아쓰기 버튼(Chrome/Edge)으로 음성을 텍스트로 바로 변환할 수 있고, 이후 자유롭게 수정할 수 있습니다.' },
      { title: '회의록 AI 자동요약', desc: 'AI 기능이 켜진 조직에서는 회의록에 "AI 요약 생성" 버튼이 나타나, 결정사항과 액션아이템을 자동으로 정리해줍니다.' },
      { title: '회의록 → 업무 변환', desc: 'AI가 뽑아낸 액션아이템을 체크하고 담당자를 지정하면, 버튼 한 번으로 바로 업무가 생성됩니다.' },
      { title: '신청(전자결재)', desc: '휴가/비품 등 신청서를 등록하고 결재자가 승인/반려할 수 있습니다.' },
      { title: '정보(FAQ) / 공지사항', desc: '자주 묻는 질문과 공지사항을 확인할 수 있습니다.' },
    ],
  },
  {
    id: 'calendar',
    icon: '📊',
    title: '일정 & 리포트',
    items: [
      { title: '캘린더', desc: '업무 마감일과 휴가 일정을 달력으로 확인합니다. 구글 캘린더와 연동해 내 일정과 동기화할 수 있습니다(설정 > 구글 캘린더 연동).' },
      { title: '통계 대시보드', desc: '월간 업무 현황, 작업자별 부하량(총 업무/완료/진행중/공수)을 확인하고 엑셀로 내려받을 수 있습니다.' },
      { title: 'AI 부하 분석', desc: '관리자/리더는 "AI 부하 분석" 버튼으로 과부하/여유 인원, 재배정 필요 여부에 대한 인사이트를 받아볼 수 있습니다.' },
      { title: 'AI 주간 보고서', desc: '이번 주 완료/진행 업무와 팀별 공수를 근거로 한 보고서를 자동 생성합니다.' },
    ],
  },
  {
    id: 'ai',
    icon: '🤖',
    title: 'AI 자동화',
    items: [
      { title: 'AI 설정 (관리자 전용)', desc: '설정 > AI 설정에서 Anthropic API 키를 등록하면 AI 기능을 쓸 수 있습니다. 기능별로 개별 토글이 있어 필요한 것만 켤 수 있고, 키가 없으면 토글이 켜지지 않습니다.' },
      { title: 'AI 업무 생성 보조', desc: '업무 등록 시 제목만 입력하고 "AI로 작성" 버튼을 누르면 상세 내용 초안과 추천 라벨이 채워집니다.' },
      { title: 'AI 업무 요약', desc: '업무 상세에서 "AI 요약" 버튼으로 히스토리·댓글을 바탕으로 한 현황 요약을 받을 수 있습니다.' },
      { title: 'AI 자연어 검색', desc: '전역 검색(우측 상단 🔍)에서 "✨ AI" 토글을 켜고 자연어로 질문하면 핵심 키워드를 뽑아 검색해줍니다.' },
      { title: '날씨 기반 인사말', desc: '날씨 API 키와 조직 기본 도시를 설정하면 대시보드에 오늘 날씨 기반 인사 문구가 표시됩니다.' },
    ],
  },
  {
    id: 'notify',
    icon: '🔔',
    title: '알림 & 개인화',
    items: [
      { title: '인앱 알림', desc: '담당자 배정, 상태 변경, 댓글/멘션, 신청 승인/반려 등의 알림을 헤더 벨 아이콘에서 확인합니다. 개별 항목만 읽음 처리할 수 있습니다.' },
      { title: '알림 음소거', desc: '업무 상세 제목 옆, 또는 프로젝트 멤버 패널의 🔔/🔕 버튼으로 해당 업무나 프로젝트의 알림을 끌 수 있습니다.' },
      { title: '외부 채널 연동', desc: '관리자는 설정 > 외부연동에서 Slack, 잔디, Microsoft Teams, 텔레그램, 카카오톡으로 상태 변경 알림을 보낼 채널을 설정할 수 있습니다.' },
      { title: '개인 메모', desc: '화면 가장자리 스티키 메모(최대 3개)와 "내 자료"(최대 3개 문서)로 개인 메모를 남길 수 있습니다.' },
    ],
  },
  {
    id: 'admin',
    icon: '🔐',
    title: '권한 & 보안',
    items: [
      { title: '역할', desc: '관리자(ADMIN)는 전체 기능, 리더(LEADER)는 팀원관리를 제외한 전체, 작업자(WORKER)는 통계·팀원관리를 제외한 기능을 사용합니다.' },
      { title: '조직별 완전 격리', desc: '모든 데이터는 조직 단위로 완전히 분리되어 다른 조직의 데이터에 접근할 수 없습니다.' },
      { title: '로그인', desc: '각 조직은 고유한 로그인 주소(`/{조직슬러그}/login`)를 사용합니다. 관리자 계정 추가는 팀원관리 또는 슈퍼관리자 페이지에서 가능합니다.' },
    ],
  },
  {
    id: 'github',
    icon: '🔗',
    title: 'GitHub 연동',
    items: [
      { title: 'PR/이슈 연결', desc: '업무 상세의 "GitHub 연결" 카드에 PR 또는 이슈 URL을 등록하면, 해당 PR이 머지되거나 이슈가 닫힐 때 업무가 자동으로 완료 처리됩니다.' },
      { title: '완료 알림', desc: 'PR이 등록/머지되면 담당 리더(등록자)와 담당자에게 인앱 알림이 발송됩니다.' },
      { title: '완료 코멘트 (관리자 설정)', desc: '관리자가 설정 > AI 설정에 GitHub 토큰을 등록하면, 업무를 완료 처리할 때 연결된 PR/이슈에 자동으로 완료 코멘트가 남습니다.' },
    ],
  },
];

export default function ManualPage() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(SECTIONS.map((s) => s.id)));

  const toggle = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>사용 메뉴얼</h1>
          <p className={styles.pageSubtitle}>High5의 주요 기능을 한눈에 확인하세요.</p>
        </div>

        <nav className={styles.toc}>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={styles.tocItem}>
              {s.icon} {s.title}
            </a>
          ))}
        </nav>

        {SECTIONS.map((section) => {
          const isOpen = openSections.has(section.id);
          return (
            <div key={section.id} id={section.id} className={styles.section}>
              <div className={styles.sectionHeader} onClick={() => toggle(section.id)}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.sectionIcon}>{section.icon}</span>
                  {section.title}
                </h2>
                <span className={styles.chevron} data-open={isOpen}>▸</span>
              </div>
              {isOpen && (
                <div className={styles.itemList}>
                  {section.items.map((item) => (
                    <div key={item.title} className={styles.item}>
                      <h3 className={styles.itemTitle}>{item.title}</h3>
                      <p className={styles.itemDesc}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
