import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import { DutyLog, Case, Activity, OfficerTypeStat } from '../../types';
import { DutyCard } from '../../components/police/DutyCard';
import { CasesCard } from '../../components/police/CasesCard';
import { ActivityCard } from '../../components/police/ActivityCard';
import { OfficerPerformanceCard } from '../../components/police/OfficerPerformanceCard';
import { Badge } from '../../components/common/Badge';
import { Calendar, Flame, Filter } from 'lucide-react';
import { formatDate, getCurrentWeekRange } from '../../utils/constants';
import { useRealtimeCases } from '../../hooks/useRealtimeCases';
import toast from 'react-hot-toast';

export const PoliceDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dutyLogs, setDutyLogs] = useState<DutyLog[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Filter State: 'all' | 'week' | 'month' | 'custom'
  const [filterType, setFilterType] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dutyRes, caseRes, actRes] = await Promise.all([
        api.get('/duty/my'),
        api.get('/cases'),
        api.get('/activities/police'),
      ]);

      if (dutyRes.data.success) {
        setDutyLogs(dutyRes.data.logs || []);
      }
      if (caseRes.data.success) {
        setCases(caseRes.data.cases || []);
      }
      if (actRes.data.success) {
        setActivities(actRes.data.activities || []);
      }
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลสถิติได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Connect Realtime Updates via EventSource SSE
  useRealtimeCases(fetchData);

  // Date Filtering Helper
  const isDateInFilter = (dateStr?: string) => {
    if (!dateStr) return false;
    if (filterType === 'all') return true;

    const targetDate = new Date(dateStr).getTime();
    if (isNaN(targetDate)) return true;

    const now = new Date();

    if (filterType === 'week') {
      const { sunday, saturday } = getCurrentWeekRange();
      return targetDate >= sunday.getTime() && targetDate <= saturday.getTime();
    }

    if (filterType === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return targetDate >= startOfMonth.getTime() && targetDate <= endOfMonth.getTime();
    }

    if (filterType === 'custom') {
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : 0;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
      return targetDate >= start && targetDate <= end;
    }

    return true;
  };

  const filteredDutyLogs = useMemo(() => dutyLogs.filter((log) => isDateInFilter(log.date)), [dutyLogs, filterType, startDate, endDate]);
  const filteredCases = useMemo(() => cases.filter((c) => isDateInFilter(c.created_at || c.createdAt || c.date)), [cases, filterType, startDate, endDate]);

  const totalFilteredHours = useMemo(() => filteredDutyLogs.reduce((acc, l) => acc + (parseFloat(l.hours as any) || 0), 0), [filteredDutyLogs]);
  const totalFilteredCases = filteredCases.length;

  // Calculate qualified workdays (Days where total duty hours >= 3)
  const totalQualifiedWorkDays = useMemo(() => {
    const hoursPerDay: Record<string, number> = {};
    filteredDutyLogs.forEach((log) => {
      if (!log.date) return;
      const dateKey = log.date.substring(0, 10);
      const hrs = parseFloat(log.hours as any) || 0;
      hoursPerDay[dateKey] = (hoursPerDay[dateKey] || 0) + hrs;
    });
    return Object.values(hoursPerDay).filter((hrs) => hrs >= 3).length;
  }, [filteredDutyLogs]);

  // Calculate Officer Summary Performance Breakdown (คดีปกติ, Take2, ส้มแดง, จัดร้าน)
  const officerPerformanceStats = useMemo(() => {
    if (!user) return { breakdown: [], totalCases: 0 };

    const defaultTypes = ['คดีปกติ', 'Take2', 'ส้มแดง', 'จัดร้าน'];
    const map: Record<string, { selfCount: number; helperCount: number }> = {};
    defaultTypes.forEach((t) => {
      map[t] = { selfCount: 0, helperCount: 0 };
    });

    const userDiscordId = (user.discord_id || '').trim();
    let totalCasesCount = 0;

    filteredCases.forEach((c) => {
      const cType = c.type || c.case_type || 'คดีปกติ';
      if (!map[cType]) {
        map[cType] = { selfCount: 0, helperCount: 0 };
      }

      const cOfficerId = (c.officer_discord_id || c.officerDiscordId || c.officerId || '').trim();
      const isPrimary = Boolean(userDiscordId && cOfficerId === userDiscordId);

      // Check if helper (ถูกแท็ก) strictly by Discord Snowflake ID
      let isHelper = false;
      let helpersList: any[] = [];
      if (Array.isArray(c.helpers)) {
        helpersList = c.helpers;
      } else if (typeof c.helpers === 'string' && (c.helpers as string).trim()) {
        try {
          helpersList = JSON.parse(c.helpers);
        } catch (_) {
          helpersList = (c.helpers as string).split(',').map((h) => ({ id: h.trim(), discord_id: h.trim() }));
        }
      }

      if (!isPrimary && userDiscordId && helpersList.length > 0) {
        isHelper = helpersList.some((h: any) => {
          if (typeof h === 'string') {
            return h.trim() === userDiscordId;
          }
          if (typeof h === 'object' && h !== null) {
            const hId = (h.discord_id || h.discordId || h.id || '').toString().trim();
            return hId === userDiscordId;
          }
          return false;
        });
      }

      if (isPrimary) {
        map[cType].selfCount += 1;
        totalCasesCount += 1;
      } else if (isHelper) {
        map[cType].helperCount += 1;
        totalCasesCount += 1;
      }
    });

    const breakdown: OfficerTypeStat[] = Object.keys(map).map((type) => ({
      type,
      selfCount: map[type].selfCount,
      helperCount: map[type].helperCount,
      totalCount: map[type].selfCount + map[type].helperCount,
    }));

    return { breakdown, totalCases: totalCasesCount };
  }, [filteredCases, user]);

  const filterTypeLabel = useMemo(() => {
    switch (filterType) {
      case 'week':
        return 'สัปดาห์นี้';
      case 'month':
        return 'เดือนนี้';
      case 'custom':
        return 'เลือกช่วงเวลา';
      default:
        return 'ทั้งหมด';
    }
  }, [filterType]);

  if (!user) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Officer Header Profile Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <img
            src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt={user.fullname}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-rose-500/40 shadow-xl"
          />
          <div className="space-y-1.5">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-extrabold text-slate-100">{user.fullname}</h2>
              <Badge rank={user.rank} />
            </div>
            <p className="text-xs text-slate-400 font-mono">Discord ID: {user.discord_id}</p>
            <div className="flex items-center space-x-2 text-xs text-slate-300 pt-1">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              <span>วันที่เริ่มรับราชการ: {formatDate(user.start_date)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
          <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl text-center min-w-[130px]">
            <span className="text-2xl font-black text-rose-400">{totalFilteredHours.toFixed(1)}</span>
            <span className="block text-[10px] uppercase font-bold text-slate-300 mt-1">ชั่วโมงเข้าเวร</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl text-center min-w-[130px]">
            <span className="text-2xl font-black text-amber-400">{totalFilteredCases}</span>
            <span className="block text-[10px] uppercase font-bold text-slate-300 mt-1">จำนวนคดี ({filterTypeLabel})</span>
          </div>

          <div className="bg-slate-950/80 border border-emerald-500/30 bg-emerald-500/5 p-3.5 rounded-xl text-center min-w-[140px] relative">
            <span className="text-2xl font-black text-emerald-400">{totalQualifiedWorkDays} <span className="text-xs text-slate-400 font-normal">วัน</span></span>
            <span className="block text-[10px] uppercase font-bold text-emerald-300 mt-1">วันทำงานสะสม</span>
            <span className="block text-[9px] text-slate-400 font-mono mt-0.5">(เข้าเวร ≥ 3 ชม./วัน)</span>
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
          <Filter className="w-4 h-4 text-amber-400" />
          <span>กรองช่วงเวลาข้อมูล:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'all'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setFilterType('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'week'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            สัปดาห์นี้
          </button>
          <button
            onClick={() => setFilterType('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'month'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            เดือนนี้
          </button>
          <button
            onClick={() => setFilterType('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'custom'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            เลือกช่วงเวลาเอง
          </button>
        </div>

        {filterType === 'custom' && (
          <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-900 text-slate-100 px-2 py-1 rounded border border-slate-800 focus:outline-none"
            />
            <span className="text-slate-500">ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-900 text-slate-100 px-2 py-1 rounded border border-slate-800 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Officer Summary Performance Breakdown Card */}
      <OfficerPerformanceCard
        officerName={user.fullname}
        discordId={user.discord_id}
        breakdown={officerPerformanceStats.breakdown}
        totalCases={officerPerformanceStats.totalCases}
        filterLabel={filterTypeLabel}
      />

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DutyCard logs={filteredDutyLogs} totalHours={totalFilteredHours} />
        <CasesCard cases={filteredCases} totalCount={totalFilteredCases} onRefresh={fetchData} />
      </div>

      {/* Active Operations Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-slate-100">กิจกรรมและโหวตภารกิจที่กำลังดำเนินการ</h3>
          </div>
          <span className="text-xs text-slate-400">{activities.length} กิจกรรม</span>
        </div>

        {activities.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-8 text-center text-slate-500 text-xs">
            ไม่มีภารกิจหรือกิจกรรมฝึกซ้อมที่กำลังเปิดอยู่ในขณะนี้
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activities.slice(0, 2).map((act) => (
              <ActivityCard
                key={act.id}
                activity={act}
                onAnswer={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
