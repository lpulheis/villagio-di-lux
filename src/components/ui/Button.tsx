import type { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

const styles = {
  primary:
    'inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-soft transition duration-200 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50',
  secondary:
    'inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
  ghost: 'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50',
};

export const Button = ({ variant = 'primary', className, ...props }: ButtonProps) => (
  <button className={clsx(styles[variant], className)} {...props} />
);
