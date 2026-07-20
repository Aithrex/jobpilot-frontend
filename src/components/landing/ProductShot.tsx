import { cn } from '@/lib/utils';

/**
 * A real product screenshot (sanitized, fictional data) served as
 * AVIF → WebP → PNG through <picture>. Intrinsic width/height are REQUIRED
 * so the browser reserves space before load (zero CLS); below-fold usages
 * pass loading="lazy". Assets live in public/images/landing/.
 */
export interface ProductShotProps {
  /** Basename under /images/landing/, e.g. "match-dashboard". */
  name: string;
  alt: string;
  width: number;
  height: number;
  loading?: 'lazy' | 'eager';
  className?: string;
  imgClassName?: string;
}

export function ProductShot({
  name,
  alt,
  width,
  height,
  loading = 'lazy',
  className,
  imgClassName,
}: ProductShotProps) {
  const base = `/images/landing/${name}`;
  return (
    <picture className={className}>
      <source srcSet={`${base}.avif`} type="image/avif" />
      <source srcSet={`${base}.webp`} type="image/webp" />
      <img
        src={`${base}.png`}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        className={cn('h-auto w-full', imgClassName)}
      />
    </picture>
  );
}
