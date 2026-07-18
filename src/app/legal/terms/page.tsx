import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata = {
  title: '이용약관',
};

export default function TermsPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <Link href="/" className={styles.backLink}>← 홈으로</Link>
        <h1 className={styles.title}>이용약관</h1>
        <p className={styles.updated}>최종 개정일: 2026년 7월 18일</p>

        <section className={styles.section}>
          <h2>제1조 (목적)</h2>
          <p>
            이 약관은 High5(이하 &quot;회사&quot;)가 제공하는 업무 관리 및 협업 서비스(이하 &quot;서비스&quot;)의
            이용과 관련하여 회사와 이용자(조직 및 그 소속 사용자)의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제2조 (정의)</h2>
          <p>
            1. &quot;서비스&quot;란 회사가 제공하는 업무 관리, 협업, 알림, 통계 등 일체의 기능을 말합니다.<br />
            2. &quot;조직&quot;이란 서비스에 가입하여 고유한 조직 계정(슬러그)을 부여받은 회사 또는 단체를 말합니다.<br />
            3. &quot;이용자&quot;란 조직에 소속되어 서비스를 이용하는 개인을 말합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제3조 (약관의 효력 및 변경)</h2>
          <p>
            회사는 필요한 경우 관련 법령을 위반하지 않는 범위 내에서 이 약관을 변경할 수 있으며,
            변경 시 서비스 내 공지 또는 이메일을 통해 사전 고지합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제4조 (서비스 이용계약의 성립)</h2>
          <p>
            이용계약은 조직 관리자가 회원가입 절차를 완료하고 이 약관 및 개인정보처리방침에 동의함으로써 성립됩니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제5조 (회사의 의무)</h2>
          <p>
            회사는 관련 법령과 이 약관이 정하는 바에 따라 지속적이고 안정적으로 서비스를 제공하기 위해 노력합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제6조 (이용자의 의무)</h2>
          <p>
            이용자는 서비스 이용 시 관계 법령, 이 약관의 규정을 준수해야 하며, 타인의 정보를 도용하거나
            서비스 운영을 방해하는 행위를 해서는 안 됩니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제7조 (서비스 이용의 제한 및 중지)</h2>
          <p>
            회사는 이용자가 이 약관을 위반하거나 서비스의 정상적인 운영을 방해한 경우, 사전 통지 없이
            서비스 이용을 제한하거나 계약을 해지할 수 있습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제8조 (면책조항)</h2>
          <p>
            회사는 천재지변, 불가항력적 사유로 서비스를 제공할 수 없는 경우 책임이 면제되며,
            이용자 귀책사유로 인한 서비스 이용 장애에 대해서는 책임을 지지 않습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>제9조 (분쟁 해결)</h2>
          <p>
            이 약관과 관련하여 회사와 이용자 간 분쟁이 발생한 경우, 관련 법령 및 상관례에 따릅니다.
          </p>
        </section>
      </div>
    </div>
  );
}
