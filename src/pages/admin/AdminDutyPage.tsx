import React, { useEffect, useState } from 'react';
import { Clock, Plus, Edit3, Trash2, Calendar, User as UserIcon, Download, Users, UserPlus, FileText, Search, CheckCircle, XCircle, Filter } from 'lucide-react';
import api from '../../api/axios';
import { DutyLog, User } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/common/Badge';
import { DutyFormModal } from '../../components/admin/DutyFormModal';
import { UserFormModal } from '../../components/admin/UserFormModal';
import { CaseFormModal } from '../../components/admin/CaseFormModal';
import { CaseReportTab } from '../../components/admin/CaseReportTab';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, sortUsersByRankAndName } from '../../utils/constants';
import toast from 'react-hot-toast';

export const AdminDutyPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'duty' | 'case-report'>('duty');
  const [dutyRange, setDutyRange] = useState<'today' | 'week' | 'all'>('today');
  
  const [logs, setLogs] = useState<DutyLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Duty Modal State
  const [isDutyModalOpen, setIsDutyModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<DutyLog | null>(null);

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Case Modal State
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [caseReportRefreshKey, setCaseReportRefreshKey] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [lRes, uRes] = await Promise.all([api.get('/duty'), api.get('/users')]);
      if (lRes.data.success) setLogs(lRes.data.logs);
      if (uRes.data.success) setUsers(uRes.data.users);
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลเวลาเข้าเวรและบุคลากรได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Duty Handlers
  const handleOpenCreateDuty = () => {
    setEditingLog(null);
    setIsDutyModalOpen(true);
  };

  const handleOpenEditDuty = (log: DutyLog) => {
    setEditingLog(log);
    setIsDutyModalOpen(true);
  };

  const handleDeleteDuty = async (id: number) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบันทึกเวลาเข้าเวรนี้?')) return;
    try {
      const res = await api.delete(`/duty/${id}`);
      if (res.data.success) {
        toast.success('ลบบันทึกเวลาเข้าเวรเรียบร้อยแล้ว');
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถลบบันทึกเวลาเข้าเวรได้');
    }
  };

  const handleSubmitDutyModal = async (data: any) => {
    if (editingLog) {
      const res = await api.put(`/duty/${editingLog.id}`, data);
      if (res.data.success) {
        toast.success('อัปเดตบันทึกเวลาเข้าเวรเรียบร้อยแล้ว');
        fetchData();
      }
    } else {
      const res = await api.post('/duty', data);
      if (res.data.success) {
        toast.success('บันทึกเวลาเข้าเวรสำเร็จ');
        fetchData();
      }
    }
  };

  const handleExportDutyCsv = async () => {
    try {
      const response = await api.get('/duty/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'duty_logs.csv');
      document.body.appendChild(link);
      link.click();
      toast.success('ดาวน์โหลด CSV สำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการส่งออกไฟล์ CSV');
    }
  };

  const handleExportUsersCsv = async () => {
    try {
      const response = await api.get('/users/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'officers_list.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('ดาวน์โหลดรายชื่อเจ้าหน้าที่ CSV สำเร็จ');
    } catch {
      try {
        let csv = 'ID,ชื่อ-นามสกุล,Discord ID,ยศตำแหน่ง,วันที่เริ่มงาน,วันทำงานสะสม (>=3ชม.),ชั่วโมงรวม,เคสรวม,สถานะบัญชี\n';
        filteredUsers.forEach((u) => {
          const daysWorked = getUserQualifiedWorkDays(u.id);
          const statusStr = u.active ? 'ใช้งานปกติ' : 'ระงับสิทธิ์';
          const cleanName = (u.fullname || '').replace(/"/g, '""');
          const cleanRank = (u.rank || '').replace(/"/g, '""');
          csv += `"${u.id}","${cleanName}","${u.discord_id || ''}","${cleanRank}","${u.start_date || ''}","${daysWorked}","${u.total_hours || 0}","${u.total_cases || 0}","${statusStr}"\n`;
        });
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'officers_list.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success('ดาวน์โหลดรายชื่อเจ้าหน้าที่ CSV สำเร็จ');
      } catch {
        toast.error('เกิดข้อผิดพลาดในการส่งออกไฟล์ CSV');
      }
    }
  };

  // User Handlers
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีเจ้าหน้าที่นี้?')) return;
    try {
      const res = await api.delete(`/users/${id}`);
      if (res.data.success) {
        toast.success('ลบบัญชีเจ้าหน้าที่เรียบร้อยแล้ว');
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถลบข้อมูลผู้ใช้ได้');
    }
  };

  const handleSubmitUserModal = async (formData: FormData) => {
    if (editingUser) {
      const res = await api.put(`/users/${editingUser.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success('อัปเดตข้อมูลเจ้าหน้าที่เรียบร้อยแล้ว');
        fetchData();
      }
    } else {
      const res = await api.post('/users', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success('ลงทะเบียนเจ้าหน้าที่ใหม่เรียบร้อยแล้ว');
        fetchData();
      }
    }
  };

  // Case Handlers
  const handleOpenCreateCase = () => {
    setIsCaseModalOpen(true);
  };

  const handleSubmitCaseModal = async (data: any) => {
    try {
      const res = await api.post('/cases', data);
      if (res.data.success) {
        toast.success('เพิ่มเคสใหม่เรียบร้อยแล้ว');
        setCaseReportRefreshKey((prev) => prev + 1);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถเพิ่มเคสได้');
    }
  };

  const getUserQualifiedWorkDays = (userId: number) => {
    const hoursPerDay: Record<string, number> = {};
    logs.filter((l) => l.user_id === userId).forEach((l) => {
      if (!l.date) return;
      const dateKey = l.date.substring(0, 10);
      const hrs = parseFloat(l.hours as any) || 0;
      hoursPerDay[dateKey] = (hoursPerDay[dateKey] || 0) + hrs;
    });
    return Object.values(hoursPerDay).filter((hrs) => hrs >= 3).length;
  };

  const filteredUsers = sortUsersByRankAndName(
    users.filter(
      (u) =>
        u.fullname.toLowerCase().includes(search.toLowerCase()) ||
        u.discord_id.toLowerCase().includes(search.toLowerCase()) ||
        u.rank.toLowerCase().includes(search.toLowerCase())
    )
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = now.getDate() - day;
  const startOfWeek = new Date(now.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);

  const dutyTodayHours = logs
    .filter((l) => {
      const logDateStr = l.date ? l.date.substring(0, 10) : '';
      return logDateStr === todayStr || (l.created_at && l.created_at.startsWith(todayStr));
    })
    .reduce((sum, l) => sum + (parseFloat(l.hours as any) || 0), 0);

  const dutyWeekHours = logs
    .filter((l) => {
      const logDateStr = l.date ? l.date.substring(0, 10) : '';
      const logDate = new Date(logDateStr || l.created_at || '');
      return logDate >= startOfWeek;
    })
    .reduce((sum, l) => sum + (parseFloat(l.hours as any) || 0), 0);

  const filterDutyByRange = (log: DutyLog) => {
    if (dutyRange === 'all') return true;

    const logDateStr = log.date ? log.date.substring(0, 10) : '';

    if (dutyRange === 'today') {
      return logDateStr === todayStr || (log.created_at && log.created_at.startsWith(todayStr));
    }

    if (dutyRange === 'week') {
      const logDate = new Date(logDateStr || log.created_at || '');
      return logDate >= startOfWeek;
    }

    return true;
  };

  const filteredDuty = logs.filter((log) => {
    const matchesSearch =
      (log.fullname && log.fullname.toLowerCase().includes(search.toLowerCase())) ||
      formatDate(log.date).includes(search);
    const matchesRange = filterDutyByRange(log);
    return matchesSearch && matchesRange;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Clock className="w-6 h-6 text-emerald-400" />
            <span>ระบบจัดการปฏิบัติงานและรายงานคดี</span>
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            จัดการรายชื่อเจ้าหน้าที่ บันทึกเวลาเข้าเวรปฏิบัติงาน และสรุปรายงานสถิติคดี
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'users' && (
            <>
              <Button variant="secondary" onClick={handleExportUsersCsv} className="text-xs">
                <Download className="w-4 h-4 mr-2" />
                <span>ส่งออก CSV</span>
              </Button>
              <Button variant="primary" onClick={handleOpenCreateUser}>
                <UserPlus className="w-4 h-4 mr-2" />
                <span>ลงทะเบียนเจ้าหน้าที่ใหม่</span>
              </Button>
            </>
          )}

          {activeTab === 'duty' && (
            <Button variant="primary" onClick={handleOpenCreateDuty}>
              <Plus className="w-4 h-4 mr-2" />
              <span>เพิ่มบันทึกเวลาเข้าเวร</span>
            </Button>
          )}

          {activeTab === 'case-report' && (
            <Button variant="primary" onClick={handleOpenCreateCase}>
              <Plus className="w-4 h-4 mr-2" />
              <span>เพิ่มเคส</span>
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'users'
              ? 'bg-rose-600/20 text-rose-300 border border-rose-500/50 shadow-md shadow-rose-600/20 font-extrabold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>รายการเจ้าหน้าที่ ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('duty')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'duty'
              ? 'bg-rose-600/20 text-rose-300 border border-rose-500/50 shadow-md shadow-rose-600/20 font-extrabold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>บันทึกเวลาเข้าเวร ({logs.length})</span>
        </button>

        {/* Tab 3: รายงานเคส - Visible strictly to ADMIN */}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('case-report')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'case-report'
                ? 'bg-rose-600/20 text-rose-300 border border-rose-500/50 shadow-md shadow-rose-600/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>รายงานเคส</span>
          </button>
        )}
      </div>

      {/* TAB 1: USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Input
                placeholder="ค้นหาชื่อเจ้าหน้าที่, ยศ หรือ Discord ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
            <span className="text-xs text-slate-400 font-semibold">พบ {filteredUsers.length} รายชื่อ</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="px-4 py-3.5 text-slate-300">ชื่อ-นามสกุล เจ้าหน้าที่</th>
                  <th className="px-4 py-3.5 text-slate-400">Discord ID</th>
                  <th className="px-4 py-3.5 text-slate-400">ยศตำแหน่ง</th>
                  <th className="px-4 py-3.5 text-slate-400">วันที่เริ่มงาน</th>
                  <th className="px-4 py-3.5 text-slate-400">วันทำงานสะสม (≥3ชม.)</th>
                  <th className="px-4 py-3.5 text-slate-400">ชั่วโมงรวม</th>
                  <th className="px-4 py-3.5 text-slate-400">เคสรวม</th>
                  <th className="px-4 py-3.5 text-slate-400">สถานะบัญชี</th>
                  <th className="px-4 py-3.5 text-right text-slate-400">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500 font-medium">
                      ไม่พบข้อมูลเจ้าหน้าที่ตามคำค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const daysWorked = getUserQualifiedWorkDays(u.id);
                    return (
                      <tr key={u.id} className="hover:bg-slate-800/50 transition-colors group">
                        <td className="px-4 py-3 font-semibold text-slate-100 flex items-center space-x-3">
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                            alt={u.fullname}
                            className="w-9 h-9 rounded-full object-cover border border-slate-700/80 shadow-sm group-hover:border-rose-500/40 transition-colors"
                          />
                          <span className="group-hover:text-rose-200 transition-colors">{u.fullname}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-rose-300/90 font-semibold">{u.discord_id}</td>
                        <td className="px-4 py-3">
                          <Badge rank={u.rank} />
                        </td>
                        <td className="px-4 py-3 text-slate-300 font-medium whitespace-nowrap">{formatDate(u.start_date)}</td>
                        <td className="px-4 py-3 font-mono">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold text-xs shadow-sm">
                            {daysWorked} วัน
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/25 text-blue-400 font-bold text-xs shadow-sm">
                            {Number(u.total_hours || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ชม.
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-400 font-bold text-xs shadow-sm">
                            {Number(u.total_cases || 0).toLocaleString()} เคส
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {u.active ? (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>ใช้งานปกติ</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>ระงับสิทธิ์</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-rose-300 hover:bg-slate-700 hover:border-slate-600 transition-all shadow-sm"
                            title="แก้ไขข้อมูลเจ้าหน้าที่"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 transition-all shadow-sm"
                            title="ลบบัญชีเจ้าหน้าที่"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DUTY SHIFT LOGS */}
      {activeTab === 'duty' && (
        <div className="space-y-6">
          {/* Stat Cards for Shift Log / Duty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">ชม.รวมวันนี้</span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-black text-rose-400">
                    {Number(dutyTodayHours.toFixed(2))}
                  </span>
                  <span className="text-xs text-slate-500">ชม.</span>
                </div>
              </div>
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">ชม.รวมสัปดาห์นี้</span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-black text-amber-400">
                    {Number(dutyWeekHours.toFixed(2))}
                  </span>
                  <span className="text-xs text-slate-500">ชม.</span>
                </div>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Range Filter Buttons */}
            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-bold">
              <span className="text-slate-400 px-2 py-1 flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5 text-rose-400" />
                <span>ตัวกรอง:</span>
              </span>
              <button
                onClick={() => setDutyRange('today')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  dutyRange === 'today'
                    ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                วันนี้
              </button>
              <button
                onClick={() => setDutyRange('week')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  dutyRange === 'week'
                    ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                รายสัปดาห์
              </button>
              <button
                onClick={() => setDutyRange('all')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  dutyRange === 'all'
                    ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                ทั้งหมด
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative w-full md:w-72">
                <Input
                  placeholder="ค้นหาชื่อเจ้าหน้าที่ หรือวันที่เข้าเวร..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
              <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">พบ {filteredDuty.length} รายการ</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">ชื่อเจ้าหน้าที่</th>
                  <th className="px-4 py-3">วันที่เข้าเวร</th>
                  <th className="px-4 py-3">เวลาเริ่ม</th>
                  <th className="px-4 py-3">เวลาออก</th>
                  <th className="px-4 py-3">ชั่วโมงรวม</th>
                  <th className="px-4 py-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDuty.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      ไม่พบรายการบันทึกเวลาเข้าเวรในระบบ
                    </td>
                  </tr>
                ) : (
                  filteredDuty.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-100 flex items-center space-x-2">
                        <UserIcon className="w-4 h-4 text-rose-400" />
                        <span>{log.fullname || `เจ้าหน้าที่ #${log.user_id}`}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-200 font-semibold">{formatDate(log.date)}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">{log.start_time}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">{log.end_time}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-extrabold">
                          {log.hours} ชม.
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditDuty(log)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                          title="แก้ไขบันทึก"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDuty(log.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                          title="ลบบันทึก"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* TAB 3: CASE REPORT (ADMIN ONLY) */}
      {activeTab === 'case-report' && isAdmin && (
        <CaseReportTab
          key={caseReportRefreshKey}
          onOpenCreateCase={handleOpenCreateCase}
        />
      )}

      {/* Duty Form Modal */}
      <DutyFormModal
        isOpen={isDutyModalOpen}
        onClose={() => setIsDutyModalOpen(false)}
        onSubmit={handleSubmitDutyModal}
        users={users}
        initialData={editingLog}
      />

      {/* User Form Modal */}
      <UserFormModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSubmit={handleSubmitUserModal}
        initialData={editingUser}
      />

      {/* Case Form Modal */}
      <CaseFormModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        onSubmit={handleSubmitCaseModal}
      />
    </div>
  );
};
