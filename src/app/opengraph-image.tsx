/* eslint-disable @next/next/no-img-element */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';

export const alt = 'Pulse analytics overview on a dark telemetry background';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';
export const runtime = 'nodejs';

async function readPublicImage(
  path: string,
  width: number,
  height: number,
  fit: 'cover' | 'contain' = 'cover',
) {
  try {
    const bytes = await readFile(join(process.cwd(), 'public', path));
    const png = await sharp(bytes)
      .resize(width, height, { fit, position: 'centre', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch {
    return null;
  }
}

export default async function OpenGraphImage() {
  const [heroBackground, overviewScreenshot, logo] = await Promise.all([
    readPublicImage('landing/hero-telemetry-desktop.webp', 1200, 630),
    readPublicImage('landing/pulse-overview.webp', 720, 448),
    readPublicImage('logo.svg', 154, 49, 'contain'),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: '#0b1017',
          color: '#edf3fc',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {heroBackground ? (
          <img
            alt=""
            src={heroBackground}
            width={1200}
            height={630}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.58,
            }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background:
              'linear-gradient(90deg, rgba(11,16,23,0.98) 0%, rgba(11,16,23,0.9) 46%, rgba(11,16,23,0.44) 100%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            padding: '58px 0 58px 68px',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '480px',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            {logo ? (
              <img
                alt="Pulse"
                src={logo}
                width={154}
                height={49}
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <div style={{ display: 'flex', color: '#edf3fc', fontSize: '30px', fontWeight: 700 }}>
                Pulse
              </div>
            )}
            <div
              style={{
                display: 'flex',
                marginTop: '48px',
                color: '#79c8f5',
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '3px',
                textTransform: 'uppercase',
              }}
            >
              Signals without the noise
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: '20px',
                fontSize: '55px',
                fontWeight: 700,
                letterSpacing: '-3px',
                lineHeight: 0.98,
              }}
            >
              Analytics, uptime, and AI signals.
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: '30px',
                gap: '10px',
              }}
            >
              {['Cookie-free', 'Operational', 'Agent-ready'].map((label) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    border: '1px solid rgba(121,200,245,0.3)',
                    borderRadius: '999px',
                    background: 'rgba(21,34,50,0.78)',
                    color: '#b6e3ff',
                    padding: '8px 13px',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              top: '92px',
              right: '-128px',
              display: 'flex',
              width: '720px',
              height: '448px',
              overflow: 'hidden',
              border: '1px solid rgba(121,200,245,0.35)',
              borderRadius: '22px',
              background: '#111b28',
              boxShadow: '0 30px 90px rgba(0,0,0,0.5)',
            }}
          >
            {overviewScreenshot ? (
              <img
                alt=""
                src={overviewScreenshot}
                width={720}
                height={448}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'left top',
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9aaec4',
                  fontSize: '22px',
                }}
              >
                Pulse overview
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
