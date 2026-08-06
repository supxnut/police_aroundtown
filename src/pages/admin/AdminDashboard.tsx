import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, Briefcase, Flame, ShieldCheck, FileText, Filter, Calendar, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import { DutyLog, SystemLog, Case } from '../../types';
import { formatDate, getCurrentWeekRange } from '../../utils/constants';

export const AdminDashboard: React.FC = () => {
  const [usersCount, setUsersCount] = useState(0);
  const [dutyLogs, setDutyLogs] = useState<DutyLog[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [activitiesCount, setActivitiesCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState<SystemLog[]>([]);
  const [pendingAlertsCount, setPendingAlertsCount] = useState(0);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        setLoading(true);
        const [uRes, dRes, cRes, aRes, lRes, alertRes] = await Promise.all([
          api.get('/users'),
          api.get('/duty'),
          api.get('/cases'),
          api.get('/activities/admin'),
          api.get('/logs'),
          api.get('/admin/case-alerts/count'),
        ]);

        if (uRes.data.success) setUsersCount(uRes.data.users?.length || 0);
        if (dRes.data.success) setDutyLogs(dRes.data.logs || []);
        if (cRes.data.success) setCases(cRes.data.cases || []);
        if (aRes.data.success) setActivitiesCount(aRes.data.activities?.length || 0);
        if (lRes.data.success) setRecentLogs(lRes.data.logs || []);
        if (alertRes.data.success) setPendingAlertsCount(alertRes.data.count || 0);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStats();
  }, []);

  // Filter Helper
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
  const totalFilteredCasesCount = filteredCases.length;

  const stats = [
    { title: 'จำนวนเจ้าหน้าที่ทั้งหมด', value: `${usersCount} นาย`, icon: Users, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { title: 'ชั่วโมงเข้าเวร (ตามช่วงเวลา)', value: `${totalFilteredHours.toFixed(1)} ชม.`, icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'จำนวนคดี (ตามช่วงเวลา)', value: `${totalFilteredCasesCount} คดี`, icon: Briefcase, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { title: 'กิจกรรมปฏิบัติการที่เปิดอยู่', value: `${activitiesCount} กิจกรรม`, icon: Flame, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">กำลังสืบสวน</span>;
      case 'closed':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">ปิดคดีแล้ว</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">รอตรวจสอบ</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <span>ศูนย์ควบคุมผู้ดูแลระบบ (Admin Control Center)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            ภาพรวมสถิติกิจการตำรวจ จัดการบุคลากร คดีความ เวลาเข้าเวร กิจกรรม และประวัติการทำรายการ
          </p>
        </div>
      </div>

      {/* Pending Case Alerts Admin Notification Banner */}
      {pendingAlertsCount > 0 && (
        <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-900 border-2 border-red-500/80 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl shrink-0">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm font-black text-red-400 flex items-center space-x-2">
                <span>🚨 ตรวจพบความผิดปกติในการรับคดีและการเข้าเวร</span>
                <span className="bg-red-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                  {pendingAlertsCount} รายการ
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                พบเจ้าหน้าที่รับคดีโดยไม่มีข้อมูลเข้าเวร หรือรับคดีนอกเวลาปฏิบัติหน้าที่ โปรดตรวจสอบ
              </p>
            </div>
          </div>
          <Link
            to="/admin/case-alerts"
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-950/60 whitespace-nowrap transition border border-red-400/30"
          >
            ดูรายการ Case Alerts
          </Link>
        </div>
      )}

      {/* Date Filter Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
          <Filter className="w-4 h-4 text-amber-400" />
          <span>กรองข้อมูลแดชบอร์ดตามช่วงเวลา:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterType('week')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'week'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            รายสัปดาห์ (อาทิตย์ 00:00 - เสาร์ 23:59)
          </button>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setFilterType('custom')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'custom'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.title}</p>
                <p className="text-2xl font-black text-slate-100 mt-1">{s.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${s.bg} border border-slate-800`}>
                <Icon className={`w-6 h-6 ${s.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Section 1: Cases Overview List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-pink-400" />
            <h3 className="text-sm font-bold text-slate-100">รายการคดีความและผลการสืบสวน (Cases Records)</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">พบ {filteredCases.length} คดีในช่วงเวลานี้</span>
        </div>

        <div className="overflow-x-auto">
          {filteredCases.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">ไม่พบรายการคดีความในช่วงเวลาที่เลือก</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">เลขคดี</th>
                  <th className="p-3">หัวข้อ / ข้อหา</th>
                  <th className="p-3">ผู้ต้องสงสัย</th>
                  <th className="p-3">ผู้รับผิดชอบ</th>
                  <th className="p-3">ค่าปรับ / รางวัล</th>
                  <th className="p-3">วันที่บันทึก</th>
                  <th className="p-3 text-right">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCases.slice(0, 10).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-950/50 transition-colors">
                    <td className="p-3 font-mono font-bold text-indigo-400">{c.case_number}</td>
                    <td className="p-3 font-bold text-slate-200">{c.title}</td>
                    <td className="p-3 text-slate-300">{c.suspect_name}</td>
                    <td className="p-3 text-slate-300">{c.officer_in_charge}</td>
                    <td className="p-3 text-amber-400 font-mono font-semibold">${c.fine?.toLocaleString() || 0}</td>
                    <td className="p-3 text-slate-400 font-mono">{formatDate(c.created_at || c.date || '')}</td>
                    <td className="p-3 text-right">{getStatusBadge(c.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Section 2: Recent Duty Logs Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">บันทึกเวลาเข้าเวรของเจ้าหน้าที่ (Recent Duty Logs)</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">พบ {filteredDutyLogs.length} บันทึก</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredDutyLogs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center col-span-full py-6">ไม่พบบันทึกการเข้าเวรในช่วงเวลาที่เลือก</p>
          ) : (
            filteredDutyLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-200">{log.fullname || `เจ้าหน้าที่ ID #${log.user_id}`}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    {formatDate(log.date)} ({log.start_time} - {log.end_time || 'กำลังปฏิบัติหน้าที่'})
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                  {log.hours} ชม.
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Section 3: Recent System Audit Trail Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>ประวัติการทำรายการล่าสุด (System Audit Trail)</span>
          </h3>
          <span className="text-xs text-slate-400">การดำเนินการของแอดมิน</span>
        </div>

        <div className="space-y-2.5">
          {recentLogs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">ไม่พบประวัติการทำรายการ</p>
          ) : (
            recentLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-200">{log.action}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Discord ID แอดมิน: <span className="font-mono text-amber-300">{log.admin_discord_id}</span> | ผู้ได้รับผลกระทบ: {log.affected_user}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {log.date} {log.time}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

