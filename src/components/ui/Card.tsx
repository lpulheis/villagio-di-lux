import type { ReactNode } from 'react';
import { clsx } from 'clsx';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export const Card = ({ children, className }: CardProps) => (
  <div className={clsx('rounded-[32px] border border-white/60 bg-white/90 p-6 shadow-soft backdrop-blur-xl', className)}>
    {children}
  </div>
);
