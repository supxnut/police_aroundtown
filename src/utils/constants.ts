export const POLICE_RANKS = [
  'ผบ',
  'ครูฝึก',
  'สารวัตร',
  'หมวด',
  'จ่า',
  'นักเรียนตำรวจ',
] as const;

export const RANK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'ผบ': { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40' },
  'ครูฝึก': { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
  'สารวัตร': { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/40' },
  'หมวด': { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/40' },
  'จ่า': { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40' },
  'นักเรียนตำรวจ': { bg: 'bg-slate-700/50', text: 'text-slate-200', border: 'border-slate-600' },
  // Fallback for legacy data
  'Chief of Police': { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40' },
  'Assistant Chief': { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  'Captain': { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
  'Patrol Officer': { bg: 'bg-rose-600/20', text: 'text-rose-300', border: 'border-rose-600/40' },
  'Cadet': { bg: 'bg-slate-700/50', text: 'text-slate-200', border: 'border-slate-600' },
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const getCurrentWeekRange = () => {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);

  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);

  return { sunday, saturday };
};

export const sortUsersByRankAndName = <T extends { rank?: string; fullname?: string }>(usersList: T[]): T[] => {
  return [...usersList].sort((a, b) => {
    const rankA = a.rank || '';
    const rankB = b.rank || '';
    
    let indexA = POLICE_RANKS.indexOf(rankA as any);
    let indexB = POLICE_RANKS.indexOf(rankB as any);
    
    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;

    if (indexA !== indexB) {
      return indexA - indexB; // Lower index in POLICE_RANKS array = Higher rank
    }

    const nameA = a.fullname || '';
    const nameB = b.fullname || '';
    return nameA.localeCompare(nameB, 'th');
  });
};

