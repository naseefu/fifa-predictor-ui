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
          fontSize: 160,
          background: 'transparent',
        }}
      >
        ⚽
      </div>
    ),
    {
      width: 192,
      height: 192,
    }
  );
}
