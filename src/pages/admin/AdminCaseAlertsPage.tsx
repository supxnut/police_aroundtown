import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Search, RefreshCw, Clock, User, ShieldAlert, FileText, Check } from 'lucide-react';
import api from '../../api/axios';

interface CaseAlert {
  id: number;
  officer_id: number | null;
  case_id: number;
  case_number: string;
  alert_type: 'NO_DUTY_LOG' | 'CASE_OUTSIDE_DUTY' | 'UNKNOWN_OFFICER';
  message: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'REVIEWED';
  duty_start_time: string;
  duty_end_time: string;
  case_time: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  created_at?: string;
  fullname?: string;
  rank?: string;
  discord_id?: string;
  avatar?: string;
  case_title?: string;
}

export const AdminCaseAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<CaseAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [search, setSearch] = useState<string>('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/case-alerts?status=${filterStatus}`);
      if (res.data && res.data.success) {
        setAlerts(res.data.alerts || []);
      }
    } catch (err) {
      console.error('Failed to load case alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filterStatus]);

  const handleReview = async (alertId: number) => {
    setProcessingId(alertId);
    try {
      const res = await api.patch(`/admin/case-alerts/${alertId}/review`);
      if (res.data && res.data.success) {
        fetchAlerts();
      }
    } catch (err) {
      console.error('Failed to review alert:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    const query = search.toLowerCase();
    return (
      (a.case_number || '').toLowerCase().includes(query) ||
      (a.fullname || '').toLowerCase().includes(query) ||
      (a.discord_id || '').toLowerCase().includes(query) ||
      (a.message || '').toLowerCase().includes(query)
    );
  });

  const pendingCount = alerts.filter(a => a.status === 'PENDING').length;
  const reviewedCount = alerts.filter(a => a.status === 'REVIEWED').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-900 border border-red-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 bg-red-500/20 border border-red-500/40 text-red-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
              <span>Duty & Case Log Validation Layer</span>
            </div>
            <h1 className="text-2xl font-black text-slate-100 tracking-wide">
              ระบบตรวจสอบความสอดคล้องการเข้าเวรและรับคดี
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              ตรวจสอบคดีที่มีข้อสงสัย เช่น รับคดีโดยไม่มีข้อมูลเข้าเวร หรือรับคดีนอกเวลาปฏิบัติหน้าที่
            </p>
          </div>

          <button
            onClick={fetchAlerts}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">รายการแจ้งเตือนทั้งหมด</p>
            <p className="text-2xl font-black text-slate-100 mt-1">{alerts.length}</p>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-xl text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-red-900/40 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-red-400">รอการตรวจสอบ (Pending)</p>
            <p className="text-2xl font-black text-red-400 mt-1">{pendingCount}</p>
          </div>
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertTriangle className="w-6 h-6 animate-bounce" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-emerald-900/40 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-400">ตรวจสอบแล้ว (Reviewed)</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{reviewedCount}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {['PENDING', 'ALL', 'REVIEWED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                filterStatus === st
                  ? st === 'PENDING'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-950/50'
                    : 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'PENDING' ? '🚨 รอตรวจสอบ' : st === 'REVIEWED' ? '✅ ตรวจสอบแล้ว' : 'ทั้งหมด'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาเลขคดี, ชื่อตำรวจ, Discord ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-3.5">สถานะ</th>
                <th className="p-3.5">ประเภทแจ้งเตือน</th>
                <th className="p-3.5">เลขคดี</th>
                <th className="p-3.5">เจ้าหน้าที่</th>
                <th className="p-3.5">เวลารับคดี</th>
                <th className="p-3.5">เวลาเข้าเวรล่าสุด</th>
                <th className="p-3.5">รายละเอียดข้อผิดพลาด</th>
                <th className="p-3.5 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-mono">
                    กำลังโหลดข้อมูลความผิดปกติ...
                  </td>
                </tr>
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <div className="flex flex-col items-center space-y-2">
                      <CheckCircle className="w-8 h-8 text-emerald-500/50" />
                      <p className="font-semibold text-slate-400">ไม่พบรายการแจ้งเตือนความผิดปกติ</p>
                      <p className="text-[11px] text-slate-600">การเข้าเวรและการรับคดีของเจ้าหน้าที่สอดคล้องกันดี</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className={`transition hover:bg-slate-800/40 ${
                      alert.status === 'PENDING' ? 'bg-red-950/20 border-l-4 border-l-red-500' : ''
                    }`}
                  >
                    <td className="p-3.5">
                      {alert.status === 'PENDING' ? (
                        <span className="inline-flex items-center space-x-1.5 bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-full text-[11px] font-extrabold animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          <span>PENDING</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold">
                          <CheckCircle className="w-3 h-3" />
                          <span>REVIEWED</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      {alert.alert_type === 'NO_DUTY_LOG' && (
                        <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-1 rounded-lg font-bold text-[11px] inline-block">
                          🚨 ไม่มีข้อมูลเข้าเวร
                        </span>
                      )}
                      {alert.alert_type === 'CASE_OUTSIDE_DUTY' && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg font-bold text-[11px] inline-block">
                          ⚠️ รับคดีนอกเวลาเข้าเวร
                        </span>
                      )}
                      {alert.alert_type === 'UNKNOWN_OFFICER' && (
                        <span className="bg-slate-700/50 text-slate-300 border border-slate-600 px-2 py-1 rounded-lg font-bold text-[11px] inline-block">
                          ❓ ไม่พบข้อมูลเจ้าหน้าที่
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 font-mono font-bold text-rose-400">
                      {alert.case_number}
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 overflow-hidden shrink-0">
                          {alert.avatar ? (
                            <img src={alert.avatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-100">{alert.fullname || 'ไม่ทราบชื่อ'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {alert.rank || 'Officer'} • ID: {alert.discord_id || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono text-slate-300">
                      <div className="flex items-center space-x-1 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-rose-400" />
                        <span>{alert.case_time}</span>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono text-xs">
                      {alert.duty_start_time !== 'N/A' ? (
                        <span className="text-amber-300/90 bg-amber-950/30 border border-amber-800/40 px-2 py-0.5 rounded">
                          {alert.duty_start_time} - {alert.duty_end_time}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">ไม่มีข้อมูล</span>
                      )}
                    </td>

                    <td className="p-3.5 max-w-xs text-slate-300 text-xs">
                      {alert.message}
                    </td>

                    <td className="p-3.5 text-right">
                      {alert.status === 'PENDING' ? (
                        <button
                          onClick={() => handleReview(alert.id)}
                          disabled={processingId === alert.id}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs inline-flex items-center space-x-1 transition shadow-md shadow-emerald-950/40 border border-emerald-400/30 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{processingId === alert.id ? 'กำลังทำรายการ...' : 'รับทราบ / ตรวจสอบแล้ว'}</span>
                        </button>
                      ) : (
                        <div className="text-[11px] text-emerald-400/80 font-mono text-right">
                          <span>อนุมัติโดย {alert.reviewed_by || 'Admin'}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
