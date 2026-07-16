import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#09090B',
          color: '#FAFAFA',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 96,
            height: 96,
            borderRadius: 22,
            background: 'linear-gradient(135deg, #5E6AD2 0%, #7C86E8 100%)',
            fontSize: 48,
            fontWeight: 800,
            marginBottom: 32,
          }}
        >
          H
        </div>
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, letterSpacing: -1.5 }}>
          High5
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#A1A1AA', marginTop: 16 }}>
          팀 업무 관리부터 AI 자동화까지, 하나로
        </div>
      </div>
    ),
    { ...size }
  );
}
