import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: 'transparent',
        }}
      >
        <span style={{ color: '#FF6B4A', fontSize: 26, fontWeight: 700 }}>5</span>
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 3,
            right: 2,
            width: 8,
            height: 8,
            background: '#FFB238',
            clipPath: 'polygon(0% 100%, 100% 0%, 70% 0%, 0% 80%)',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
