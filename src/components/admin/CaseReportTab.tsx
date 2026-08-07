import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Calendar,
  Clock,
  Briefcase,
  Search,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  Plus,
  Trash2
} from 'lucide-react';
import api from '../../api/axios';
import { Badge } from '../common/Badge';
import toast from 'react-hot-toast';

interface CaseReportItem {
  id: number;
  date: string;
  time: string;
  case_number: string;
  title: string;
  case_type?: string;
  reporter_name: string;
  officer_in_charge: string;
  assistant_officer: string;
  discord_id: string;
  rank: string;
  status: 'open' | 'closed' | 'pending';
  received_time: string;
  closed_time: string;
  duration: string;
  created_at: string;
  has_alert?: boolean;
  alert_type?: string | null;
  alert_message?: string | null;
}

interface StatsData {
  todayCount: number;
  weekCount: number;
  totalCount: number;
}

interface CaseReportTabProps {
  onOpenCreateCase?: () => void;
}

export const CaseReportTab: React.FC<CaseReportTabProps> = ({ onOpenCreateCase }) => {
  const [range, setRange] = useState<'today' | 'week' | 'all'>('today');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [cases, setCases] = useState<CaseReportItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [stats, setStats] = useState<StatsData>({ todayCount: 0, weekCount: 0, totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Fetch Report Data from Backend API
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/case-report', {
        params: {
          range,
          search,
          page,
          limit,
        },
      });

      if (res.data.success) {
        setCases(res.data.cases || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalRecords(res.data.pagination?.total || 0);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถโหลดรายงานเคสได้');
    } finally {
      setLoading(false);
    }
  }, [range, search, page, limit]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Handle Filter Change
  const handleFilterChange = (newRange: 'today' | 'week' | 'all') => {
    setRange(newRange);
    setPage(1); // Reset to page 1 on filter change
  };

  // Handle Search Input Change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to page 1 on search
  };

  // Export CSV Handler
  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const response = await api.get('/case-report/export', {
        params: { range, search },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const todayStr = new Date().toISOString().split('T')[0];
      
      link.href = url;
      link.setAttribute('download', `Case_Report_${todayStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('ส่งออกรายงาน CSV สำเร็จ');
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาดในการส่งออกไฟล์ CSV');
    } finally {
      setExporting(false);
    }
  };

  // Delete Case Handler
  const handleDeleteCase = async (id: number, title: string) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเคส "${title}" (ID: #${id})?`)) return;
    try {
      const res = await api.delete(`/cases/${id}`);
      if (res.data && res.data.success) {
        toast.success('ลบเคสเรียบร้อยแล้ว');
        fetchReport();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบเคส');
    }
  };

  // Render Status Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            <span>กำลังสืบสวน</span>
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>ปิดคดีแล้ว</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3 h-3" />
            <span>รอตรวจสอบ</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Dashboard Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">จำนวนเคสวันนี้</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-rose-400">{stats.todayCount}</span>
              <span className="text-xs text-slate-500">คดี</span>
            </div>
          </div>
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">จำนวนเคสสัปดาห์นี้</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-amber-400">{stats.weekCount}</span>
              <span className="text-xs text-slate-500">คดี</span>
            </div>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">จำนวนเคสทั้งหมด</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-emerald-400">{stats.totalCount}</span>
              <span className="text-xs text-slate-500">คดี</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search & Export */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Date Filter Buttons */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-bold">
            <span className="text-slate-400 px-2 py-1 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-rose-400" />
              <span>ตัวกรอง:</span>
            </span>
            <button
              onClick={() => handleFilterChange('today')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                range === 'today'
                  ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              วันนี้
            </button>
            <button
              onClick={() => handleFilterChange('week')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                range === 'week'
                  ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              รายสัปดาห์
            </button>
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                range === 'all'
                  ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              ทั้งหมด
            </button>
          </div>
        </div>

        {/* Search Input & Export Button */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <input
              type="text"
              placeholder="ค้นหาชื่อเจ้าหน้าที่, Discord ID, เลขคดี, ประเภท..."
              value={search}
              onChange={handleSearchChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          <button
            onClick={handleExportCsv}
            disabled={exporting || cases.length === 0}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-emerald-600/20 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'กำลังส่งออก...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Main Case Report Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/90 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-3 py-3">วันที่</th>
                <th className="px-3 py-3">เวลา</th>
                <th className="px-3 py-3">ประเภทคดี</th>
                <th className="px-3 py-3">ผู้รับผิดชอบคดี</th>
                <th className="px-3 py-3">ผู้ช่วยปฏิบัติงาน</th>
                <th className="px-3 py-3">Discord ID</th>
                <th className="px-3 py-3">ยศ</th>
                <th className="px-3 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-mono">กำลังโหลดข้อมูลรายงานเคส...</span>
                    </div>
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center space-y-2">
                      <FileText className="w-8 h-8 opacity-30 text-slate-400" />
                      <span>ไม่พบข้อมูลรายงานคดีตามเงื่อนไขที่เลือก</span>
                    </div>
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      c.has_alert ? 'bg-red-950/25 border-l-4 border-l-red-500' : ''
                    }`}
                  >
                    <td className="px-3 py-3 font-mono font-semibold text-slate-300">{c.date}</td>
                    <td className="px-3 py-3 font-mono text-slate-400">{c.time}</td>
                    <td className="px-3 py-3 font-bold text-slate-100 max-w-[240px]">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            c.case_type === 'Take2' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                            c.case_type === 'คดีส้ม-แดงคดี' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' :
                            'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          }`}>
                            📂 {c.case_type || 'คดีปกติ'}
                          </span>
                          {c.title && c.title !== (c.case_type || 'คดีปกติ') && (
                            <span className="text-xs text-slate-300 font-normal truncate max-w-[150px]">{c.title}</span>
                          )}
                        </div>
                        {c.has_alert && (
                          <div>
                            {c.alert_type === 'NO_DUTY_LOG' && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                                ⚠ ไม่มีข้อมูลเข้าเวร
                              </span>
                            )}
                            {c.alert_type === 'CASE_OUTSIDE_DUTY' && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                ⚠ รับคดีนอกเวลาเข้าเวร
                              </span>
                            )}
                            {c.alert_type === 'UNKNOWN_OFFICER' && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-800 text-slate-300 border border-slate-700">
                                ⚠ ไม่พบข้อมูลเจ้าหน้าที่
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-200">{c.officer_in_charge}</td>
                    <td className="px-3 py-3 font-medium text-slate-300">{c.assistant_officer}</td>
                    <td className="px-3 py-3 font-mono text-xs text-rose-300/90 font-semibold">{c.discord_id}</td>
                    <td className="px-3 py-3">
                      <Badge rank={c.rank} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => handleDeleteCase(c.id, c.title)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors border border-rose-500/20 flex items-center space-x-1 ml-auto"
                        title="ลบเคส"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold">ลบ</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span>แสดง</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>รายการต่อหน้า (ทั้งหมด {totalRecords} รายการ)</span>
          </div>

          <div className="flex items-center space-x-3">
            <span>
              หน้า <strong className="text-slate-200">{page}</strong> จาก <strong className="text-slate-200">{totalPages}</strong>
            </span>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors"
                title="หน้าก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors"
                title="หน้าถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
