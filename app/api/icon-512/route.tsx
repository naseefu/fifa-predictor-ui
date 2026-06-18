import { ImageResponse } from 'next/og';

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 420,
          background: 'transparent',
        }}
      >
        ⚽
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  );
}
