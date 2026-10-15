import React from 'react';

export type BadgeVariant =
  | 'emerald'
  | 'amber'
  | 'red'
  | 'blue'
  | 'purple'
  | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  status?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  status,
  className = '',
}) => {
  let resolvedVariant: BadgeVariant = variant || 'gray';

  if (status) {
    const s = status.toLowerCase();
    if (['confirmed', 'received', 'paid', 'approved', 'executed', 'success'].includes(s)) {
      resolvedVariant = 'emerald';
    } else if (['pending', 'awaiting_approval', 'planned', 'due', 'medium', 'warning'].includes(s)) {
      resolvedVariant = 'amber';
    } else if (['cancelled', 'rejected', 'failed', 'overdue', 'expired', 'critical', 'high', 'deficit'].includes(s)) {
      resolvedVariant = 'red';
    } else if (['executing', 'active', 'low', 'info'].includes(s)) {
      resolvedVariant = 'blue';
    }
  }

  const variantStyles: Record<BadgeVariant, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    gray: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[resolvedVariant]} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {children}
    </span>
  );
};
