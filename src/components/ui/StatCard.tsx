import React from 'react';
import { HelpCircle } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  tooltipText: string;
  icon?: React.ReactNode;
  trend?: 'positive' | 'negative' | 'neutral' | 'warning';
  trendText?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  tooltipText,
  icon,
  trend = 'neutral',
  trendText,
  className = '',
}) => {
  const trendColors = {
    positive: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    negative: 'text-rose-700 bg-rose-50 border-rose-200',
    warning: 'text-amber-700 bg-amber-50 border-amber-200',
    neutral: 'text-slate-600 bg-slate-100 border-slate-200',
  };

  return (
    <div
      className={`bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 ${className}`}
    >
      <div className="flex items-center justify-between text-slate-500 mb-2">
        <div className="flex items-center gap-1.5 group relative cursor-help">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
          <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block z-50 w-60 p-2.5 bg-slate-900 text-xs text-slate-100 rounded-xl shadow-xl pointer-events-none">
            {tooltipText}
          </div>
        </div>
        {icon && <div className="p-2 rounded-xl bg-blue-50/70 text-blue-600 border border-blue-100/60">{icon}</div>}
      </div>

      <div className="mt-1">
        <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">{value}</div>
        {subValue && <div className="text-xs text-slate-500 mt-1">{subValue}</div>}
      </div>

      {trendText && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${trendColors[trend]}`}
          >
            {trendText}
          </span>
        </div>
      )}
    </div>
  );
};
