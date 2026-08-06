import React from 'react';
import { RANK_COLORS } from '../../utils/constants';

interface BadgeProps {
  rank: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ rank, className = '' }) => {
  const style = RANK_COLORS[rank] || { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      {rank}
    </span>
  );
};
