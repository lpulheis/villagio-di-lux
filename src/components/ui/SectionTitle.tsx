import type { ReactNode } from 'react';

type SectionTitleProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export const SectionTitle = ({ title, description, children }: SectionTitleProps) => (
  <div className="space-y-3">
    <div className="text-sm uppercase tracking-[0.28em] text-slate-500">{title}</div>
    {description ? <p className="max-w-xl text-sm leading-6 text-slate-600">{description}</p> : null}
    {children}
  </div>
);
