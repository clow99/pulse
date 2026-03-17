'use client';

import { motion } from 'framer-motion';

const directionOffsets = {
  left: { x: -48 },
  right: { x: 48 },
  up: { y: -48 },
  down: { y: 48 },
} as const;

interface SlideInProps {
  children: React.ReactNode;
  from?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
  className?: string;
}

export function SlideIn({
  children,
  from = 'left',
  delay = 0,
  className,
}: SlideInProps) {
  const offset = directionOffsets[from];

  return (
    <motion.div
      initial={{
        opacity: 0,
        ...offset,
      }}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 30,
          delay,
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
