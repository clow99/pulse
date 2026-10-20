import Image from 'next/image';

export function PulseLogo({
  width = 116,
  className,
  priority = false,
  decorative = false,
}: {
  width?: number;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
}) {
  return (
    <Image
      src="/logo.svg"
      alt={decorative ? '' : 'Pulse'}
      width={width}
      height={Math.round((width * 72) / 226)}
      className={className}
      preload={priority}
      unoptimized
    />
  );
}
