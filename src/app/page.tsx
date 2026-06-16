export default function Home() {
  return (
    <main style={{ padding: 'var(--space-16)' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h1>TMS - 업무 관리 시스템</h1>
        <p style={{ color: 'var(--color-gray-600)', marginTop: 'var(--space-4)' }}>
          AI 기반 경량 업무 관리 플랫폼
        </p>
        <div style={{ marginTop: 'var(--space-8)' }}>
          <a
            href="/login"
            style={{
              display: 'inline-block',
              padding: 'var(--space-2) var(--space-4)',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              borderRadius: '6px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            로그인
          </a>
        </div>
      </div>
    </main>
  );
}
