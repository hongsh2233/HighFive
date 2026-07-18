import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata = {
  title: '개인정보처리방침',
};

export default function PrivacyPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <Link href="/" className={styles.backLink}>← 홈으로</Link>
        <h1 className={styles.title}>개인정보처리방침</h1>
        <p className={styles.updated}>최종 개정일: 2026년 7월 18일</p>

        <section className={styles.section}>
          <h2>1. 수집하는 개인정보 항목</h2>
          <p>
            회사는 회원가입 및 서비스 제공을 위해 다음의 개인정보를 수집합니다.<br />
            - 필수: 이름, 이메일, 비밀번호(암호화 저장), 소속 조직 정보<br />
            - 서비스 이용 과정에서 자동 생성: 접속 로그, 업무/댓글/첨부파일 등 이용 기록
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. 개인정보의 수집 및 이용 목적</h2>
          <p>
            - 회원 식별 및 서비스 이용에 따른 본인 확인<br />
            - 업무 관리, 알림, 협업 기능 제공<br />
            - 서비스 개선 및 고객 문의 대응
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. 개인정보의 보유 및 이용 기간</h2>
          <p>
            회원 탈퇴 또는 조직 삭제 시 지체 없이 파기하며, 관계 법령에 따라 보존이 필요한 경우
            해당 법령이 정한 기간 동안 보관합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. 개인정보의 제3자 제공</h2>
          <p>
            회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만, 법령에 근거가 있거나
            수사기관의 적법한 절차에 따른 요청이 있는 경우는 예외로 합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. 개인정보의 처리 위탁</h2>
          <p>
            서비스 운영을 위해 이메일 발송, 클라우드 호스팅 등 일부 업무를 외부 업체에 위탁할 수 있으며,
            위탁계약 시 개인정보가 안전하게 관리되도록 필요한 사항을 규정합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. 이용자의 권리와 행사 방법</h2>
          <p>
            이용자는 언제든지 자신의 개인정보를 조회, 수정할 수 있으며, 조직 관리자를 통해
            계정 삭제(탈퇴)를 요청할 수 있습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. 개인정보의 안전성 확보 조치</h2>
          <p>
            회사는 비밀번호 암호화 저장, 접근권한 관리, 조직 간 데이터 격리 등 개인정보 보호를 위한
            기술적·관리적 조치를 시행하고 있습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. 개인정보 보호책임자</h2>
          <p>
            문의사항은 서비스 내 고객센터 또는 등록하신 이메일을 통해 접수받고 있습니다.
          </p>
        </section>
      </div>
    </div>
  );
}
