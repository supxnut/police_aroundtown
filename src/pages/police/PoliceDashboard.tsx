import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import { DutyLog, Case, Activity } from '../../types';
import { DutyCard } from '../../components/police/DutyCard';
import { CasesCard } from '../../components/police/CasesCard';
import { ActivityCard } from '../../components/police/ActivityCard';
import { Badge } from '../../components/common/Badge';
import { Calendar, Flame, Filter, Clock, Briefcase } from 'lucide-react';
import { formatDate, getCurrentWeekRange } from '../../utils/constants';
import toast from 'react-hot-toast';

export const PoliceDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dutyLogs, setDutyLogs] = useState<DutyLog[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);

  // Date Filter State
  const [filterType, setFilterType] = useState<'week' | 'all' | 'custom'>('week');
  const [startDate, setStartDate] = useState<string>(() => {
    const { sunday } = getCurrentWeekRange();
    return sunday.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const { saturday } = getCurrentWeekRange();
    return saturday.toISOString().split('T')[0];
  });

  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleJoinActivity = async (id: number) => {
    try {
      setJoiningId(id);
      const res = await api.post(`/activities/${id}/join`);
      if (res.data.success) {
        toast.success('เข้าร่วมกิจกรรมปฏิบัติการเรียบร้อยแล้ว');
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถเข้าร่วมกิจกรรมได้');
    } finally {
      setJoiningId(null);
    }
  };

  // Date Filtering Helpers
  const isDateInFilter = (dateStr?: string) => {
    if (!dateStr) return false;
    if (filterType === 'all') return true;

    const targetDate = new Date(dateStr).getTime();
    if (isNaN(targetDate)) return true;

    if (filterType === 'week') {
      const { sunday, saturday } = getCurrentWeekRange();
      return targetDate >= sunday.getTime() && targetDate <= saturday.getTime();
    }

    if (filterType === 'custom') {
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : 0;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
      return targetDate >= start && targetDate <= end;
    }

    return true;
  };

  const filteredDutyLogs = dutyLogs.filter((log) => isDateInFilter(log.date));
  const filteredCases = cases.filter((c) => isDateInFilter(c.created_at || c.date));

  const totalFilteredHours = filteredDutyLogs.reduce((acc, l) => acc + (parseFloat(l.hours as any) || 0), 0);
  const totalFilteredCases = filteredCases.length;

  // Calculate qualified workdays (Days where total duty hours >= 3)
  const totalQualifiedWorkDays = React.useMemo(() => {
    const hoursPerDay: Record<string, number> = {};
    dutyLogs.forEach((log) => {
      if (!log.date) return;
      const dateKey = log.date.substring(0, 10);
      const hrs = parseFloat(log.hours as any) || 0;
      hoursPerDay[dateKey] = (hoursPerDay[dateKey] || 0) + hrs;
    });
    return Object.values(hoursPerDay).filter((hrs) => hrs >= 3).length;
  }, [dutyLogs]);

  const filteredQualifiedWorkDays = React.useMemo(() => {
    const hoursPerDay: Record<string, number> = {};
    filteredDutyLogs.forEach((log) => {
      if (!log.date) return;
      const dateKey = log.date.substring(0, 10);
      const hrs = parseFloat(log.hours as any) || 0;
      hoursPerDay[dateKey] = (hoursPerDay[dateKey] || 0) + hrs;
    });
    return Object.values(hoursPerDay).filter((hrs) => hrs >= 3).length;
  }, [filteredDutyLogs]);

  if (!user) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Officer Header Card */}
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
            <span className="block text-[10px] uppercase font-bold text-slate-300 mt-1">จำนวนคดี</span>
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
            onClick={() => setFilterType('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'week'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            รายสัปดาห์ (อาทิตย์ 00:00 - เสาร์ 23:59)
          </button>
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

