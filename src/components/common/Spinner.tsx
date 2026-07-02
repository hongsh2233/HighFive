import styles from './Spinner.module.css';

interface SpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Spinner({ label = '로딩 중', size = 'md' }: SpinnerProps) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <span className={`${styles.spinner} ${styles[size]}`} />
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}
