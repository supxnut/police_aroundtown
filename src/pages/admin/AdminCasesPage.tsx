import React, { useEffect, useState } from 'react';
import { Briefcase, Plus, Edit3, Trash2, Search, Download, Filter, Calendar, CheckCircle2, Clock, FileSpreadsheet, Eye, DollarSign } from 'lucide-react';
import api from '../../api/axios';
import { Case } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CaseFormModal } from '../../components/admin/CaseFormModal';
import { Modal } from '../../components/common/Modal';
import { formatDate, getCurrentWeekRange, formatCurrency } from '../../utils/constants';
import toast from 'react-hot-toast';

export const AdminCasesPage: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed' | 'pending'>('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<Case | null>(null);

  // Date Filter State: 'daily' | 'week' | 'all' | 'custom'
  const [filterType, setFilterType] = useState<'daily' | 'week' | 'all' | 'custom'>('daily');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cases');
      if (res.data.success) {
        setCases(res.data.cases || []);
        setTotalCount(res.data.totalCount || 0);
      }
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลคดีได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleOpenCreate = () => {
    setEditingCase(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Case) => {
    setEditingCase(c);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสำนวนคดีนี้?')) return;
    try {
      const res = await api.delete(`/cases/${id}`);
      if (res.data.success) {
        toast.success('ลบสำนวนคดีเรียบร้อยแล้ว');
        fetchCases();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถลบสำนวนคดีได้');
    }
  };

  const handleSubmitModal = async (data: any) => {
    if (editingCase) {
      const res = await api.put(`/cases/${editingCase.id}`, data);
      if (res.data.success) {
        toast.success('อัปเดตสำนวนคดีเรียบร้อยแล้ว');
        fetchCases();
      }
    } else {
      const res = await api.post('/cases', data);
      if (res.data.success) {
        toast.success('บันทึกคดีใหม่เรียบร้อยแล้ว');
        fetchCases();
      }
    }
  };

  // Date Filtering logic
  const isDateInFilter = (dateStr?: string) => {
    if (!dateStr) return true;
    if (filterType === 'all') return true;

    const targetDate = new Date(dateStr).getTime();
    if (isNaN(targetDate)) return true;

    if (filterType === 'daily') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      return targetDate >= todayStart.getTime() && targetDate <= todayEnd.getTime();
    }

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

  // Filtered dataset
  const filteredCases = cases.filter((c) => {
    const matchesDate = isDateInFilter(c.created_at || c.date);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.case_number.toLowerCase().includes(search.toLowerCase()) ||
      (c.suspect_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.officer_in_charge || '').toLowerCase().includes(search.toLowerCase());

    return matchesDate && matchesStatus && matchesSearch;
  });

  // Calculate Metrics
  const openCount = filteredCases.filter((c) => c.status === 'open').length;
  const closedCount = filteredCases.filter((c) => c.status === 'closed').length;
  const pendingCount = filteredCases.filter((c) => c.status === 'pending').length;
  const totalFineAmount = filteredCases.reduce((sum, c) => sum + (Number(c.fine) || 0), 0);

  // CSV Export for Filtered Cases
  const handleExportFilteredCsv = () => {
    try {
      if (filteredCases.length === 0) {
        toast.error('ไม่พบข้อมูลคดีตามเงื่อนไขเพื่อส่งออก CSV');
        return;
      }

      let csvContent = 'ID,Case Number,Date,Title,Suspect Name,Officer in Charge,Fine ($),Status,Description\n';
      filteredCases.forEach((c) => {
        const descClean = (c.description || '').replace(/"/g, '""').replace(/\n/g, ' ');
        const titleClean = (c.title || '').replace(/"/g, '""');
        const suspectClean = (c.suspect_name || '').replace(/"/g, '""');
        const officerClean = (c.officer_in_charge || '').replace(/"/g, '""');
        const dateStr = formatDate(c.created_at || c.date || '');

        csvContent += `"${c.id}","${c.case_number}","${dateStr}","${titleClean}","${suspectClean}","${officerClean}","${c.fine || 0}","${c.status}","${descClean}"\n`;
      });

      // UTF-8 BOM prefix \uFEFF for Thai encoding in Excel
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timeTag = filterType === 'daily' ? 'daily' : filterType === 'week' ? 'weekly' : 'report';
      link.setAttribute('download', `cases_report_${timeTag}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`ส่งออกข้อมูล ${filteredCases.length} รายการเป็น CSV สำเร็จ`);
    } catch {
      toast.error('เกิดข้อผิดพลาดในการสร้างไฟล์ CSV');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center space-x-1"><Clock className="w-3 h-3" /><span>กำลังสืบสวน</span></span>;
      case 'closed':
        return <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center space-x-1"><CheckCircle2 className="w-3 h-3" /><span>ปิดคดีแล้ว</span></span>;
      default:
        return <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 inline-flex items-center space-x-1"><Clock className="w-3 h-3" /><span>รอตรวจสอบ</span></span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Bar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Briefcase className="w-6 h-6 text-pink-400" />
            <span>ระบบรายงานและบันทึกคดีความ (Case Logs & Reports)</span>
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            รายงานสถิติคดีอาญา การสืบสวน และส่งออกข้อมูลสำหรับผู้ดูแลระบบ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleExportFilteredCsv}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4 mr-2" />
            <span>ส่งออก CSV ({filteredCases.length} รายการ)</span>
          </Button>

          <Button variant="primary" onClick={handleOpenCreate} className="text-xs font-bold">
            <Plus className="w-4 h-4 mr-2" />
            <span>เพิ่มเคส</span>
          </Button>
        </div>
      </div>

      {/* Date Filter Selection Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
          <Filter className="w-4 h-4 text-amber-400" />
          <span>กรองรายงานช่วงเวลา:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterType('daily')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'daily'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            รายวัน (วันนี้)
          </button>
          <button
            onClick={() => setFilterType('week')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'week'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            รายสัปดาห์ (อาทิตย์ 00:00 - เสาร์ 23:59)
          </button>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'all'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setFilterType('custom')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
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

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 block font-semibold">จำนวนคดี (ตามช่วงเวลา)</span>
            <span className="text-2xl font-black text-slate-100 mt-1 block">{filteredCases.length} <span className="text-xs text-slate-400 font-normal">คดี</span></span>
          </div>
          <div className="p-3 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-xl">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 block font-semibold">กำลังสืบสวน (Open)</span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">{openCount} <span className="text-xs text-slate-400 font-normal">คดี</span></span>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 block font-semibold">ปิดคดีแล้ว (Closed)</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">{closedCount} <span className="text-xs text-slate-400 font-normal">คดี</span></span>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 block font-semibold">ค่าปรับสะสม ($ Fines)</span>
            <span className="text-2xl font-black text-amber-300 mt-1 block">${totalFineAmount.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl space-y-0">
        {/* Search & Status Tab Bar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Input
              placeholder="ค้นหาเลขคดี, หัวข้อ, ผู้ต้องสงสัย, เจ้าหน้าที่..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-slate-100 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ทั้งหมด ({filteredCases.length})
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'open'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              กำลังสืบสวน ({openCount})
            </button>
            <button
              onClick={() => setStatusFilter('closed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'closed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ปิดคดีแล้ว ({closedCount})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'pending'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              รอตรวจสอบ ({pendingCount})
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">เลขที่คดี</th>
                <th className="px-4 py-3">วันที่บันทึก</th>
                <th className="px-4 py-3">ชื่อคดี / ข้อหา</th>
                <th className="px-4 py-3">ผู้ต้องสงสัย</th>
                <th className="px-4 py-3">เจ้าหน้าที่รับผิดชอบ</th>
                <th className="px-4 py-3">ค่าปรับ ($)</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    ไม่พบข้อมูลแฟ้มคดีตามเงื่อนไขช่วงเวลาหรือคำค้นหาที่ระบุ
                  </td>
                </tr>
              ) : (
                filteredCases.map((c: any) => (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      c.has_alert ? 'bg-red-950/25 border-l-4 border-l-red-500' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-rose-300">{c.case_number}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{formatDate(c.created_at || c.date || '')}</td>
                    <td className="px-4 py-3 font-bold text-slate-100 max-w-[240px]">
                      <div className="flex flex-col space-y-1">
                        <span>{c.title}</span>
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
                    <td className="px-4 py-3 text-slate-200 font-medium">{c.suspect_name || 'ไม่ระบุ'}</td>
                    <td className="px-4 py-3 text-slate-300">{c.officer_in_charge || 'ไม่ระบุ'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">${(Number(c.fine) || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">{getStatusBadge(c.status)}</td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedCaseDetail(c)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-indigo-400 hover:bg-slate-700 transition-colors"
                        title="ดูรายละเอียดคดี"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                        title="แก้ไขคดี"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                        title="ลบคดี"
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

      {/* Case Details View Modal */}
      {selectedCaseDetail && (
        <Modal
          isOpen={!!selectedCaseDetail}
          onClose={() => setSelectedCaseDetail(null)}
          title={`รายละเอียดสำนวนคดี: ${selectedCaseDetail.case_number}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-100">{selectedCaseDetail.title}</h3>
              {getStatusBadge(selectedCaseDetail.status)}
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[10px]">ผู้ต้องสงสัย / แก๊ง</span>
                <span className="text-slate-200 font-bold">{selectedCaseDetail.suspect_name || 'ไม่ระบุ'}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[10px]">เจ้าหน้าที่รับผิดชอบ</span>
                <span className="text-slate-200 font-bold">{selectedCaseDetail.officer_in_charge || 'ไม่ระบุ'}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[10px]">ค่าปรับ / ค่าเสียหาย</span>
                <span className="text-amber-400 font-mono font-bold">${(Number(selectedCaseDetail.fine) || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[10px]">วันที่ลงบันทึก</span>
                <span className="text-slate-300 font-mono">{formatDate(selectedCaseDetail.created_at || selectedCaseDetail.date || '')}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-bold block mb-1">บันทึกรายละเอียดคดี / พฤติการณ์:</span>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 min-h-[80px] whitespace-pre-wrap">
                {selectedCaseDetail.description || 'ไม่มีการระบุรายละเอียดเพิ่มเติม'}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedCaseDetail(null)} className="text-xs font-bold">
                ปิดหน้าต่าง
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit / Create Modal */}
      <CaseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitModal}
        initialData={editingCase}
      />
    </div>
  );
};

