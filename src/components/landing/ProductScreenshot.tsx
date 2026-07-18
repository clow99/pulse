import Image from 'next/image';
import styles from './landing.module.css';

interface ProductScreenshotProps {
  src: string;
  alt: string;
  view: string;
  range?: string;
  variant?: 'hero' | 'story';
  priority?: boolean;
}

export function ProductScreenshot({
  src,
  alt,
  view,
  range = 'July 1–14, 2026',
  variant = 'story',
  priority = false,
}: ProductScreenshotProps) {
  return (
    <figure
      className={`${styles.screenshotFrame} ${
        variant === 'hero' ? styles.heroScreenshot : styles.storyScreenshot
      }`}
    >
      <figcaption className={styles.screenshotMeta}>
        <span className={styles.screenshotSite}>
          <span className={styles.statusDot} aria-hidden="true" />
          Demo Site
        </span>
        <span className={styles.screenshotView}>{view}</span>
        <span className={styles.screenshotRange}>{range}</span>
      </figcaption>
      <div className={styles.screenshotImageWrap}>
        <Image
          src={src}
          alt={alt}
          width={1600}
          height={1000}
          className={styles.screenshotImage}
          sizes={
            variant === 'hero'
              ? '(max-width: 860px) 94vw, (max-width: 1280px) 58vw, 920px'
              : '(max-width: 860px) 94vw, 680px'
          }
          priority={priority}
        />
      </div>
    </figure>
  );
}
