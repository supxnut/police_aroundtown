import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Briefcase,
  Plus,
  Edit3,
  Trash2,
  Search,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  Eye,
  DollarSign,
  ArrowUpDown,
  Image as ImageIcon,
  User,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '../../api/axios';
import { Case } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CaseFormModal } from '../../components/admin/CaseFormModal';
import { Modal } from '../../components/common/Modal';
import { formatDate, getCurrentWeekRange } from '../../utils/constants';
import { useRealtimeCases } from '../../hooks/useRealtimeCases';
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
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Date Filter State: 'all' | 'daily' | 'week' | 'month' | 'custom'
  const [filterType, setFilterType] = useState<'all' | 'daily' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Sorting & Pagination State
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'type' | 'helpers'>('newest');
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const fetchCases = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Realtime update listener via SSE
  useRealtimeCases(fetchCases);

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

    const now = new Date();

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

  // Filtered & Sorted dataset
  const filteredAndSortedCases = useMemo(() => {
    let result = cases.filter((c) => {
      const matchesDate = isDateInFilter(c.created_at || c.createdAt || c.date);
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

      const q = search.toLowerCase().trim();
      const caseIdStr = (c.caseId || c.case_number || '').toLowerCase();
      const titleStr = (c.title || '').toLowerCase();
      const suspectStr = (c.suspect_name || '').toLowerCase();
      const officerStr = (c.officerName || c.officer_in_charge || '').toLowerCase();
      const officerIdStr = (c.officerId || c.officer_discord_id || '').toLowerCase();
      const typeStr = (c.type || c.case_type || '').toLowerCase();
      const descStr = (c.description || '').toLowerCase();
      const assistantStr = (c.assistant_officer || '').toLowerCase();

      const matchesSearch =
        !q ||
        caseIdStr.includes(q) ||
        titleStr.includes(q) ||
        suspectStr.includes(q) ||
        officerStr.includes(q) ||
        officerIdStr.includes(q) ||
        typeStr.includes(q) ||
        descStr.includes(q) ||
        assistantStr.includes(q);

      return matchesDate && matchesStatus && matchesSearch;
    });

    // Sorting logic
    result.sort((a, b) => {
      if (sortBy === 'oldest') {
        const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
        const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
        return timeA - timeB;
      }
      if (sortBy === 'type') {
        const typeA = a.type || a.case_type || '';
        const typeB = b.type || b.case_type || '';
        return typeA.localeCompare(typeB, 'th');
      }
      if (sortBy === 'helpers') {
        const countA = Array.isArray(a.helpers) ? a.helpers.length : 0;
        const countB = Array.isArray(b.helpers) ? b.helpers.length : 0;
        return countB - countA;
      }
      // Newest first (default)
      const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
      const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return result;
  }, [cases, filterType, startDate, endDate, statusFilter, search, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredAndSortedCases.length / pageSize) || 1;
  const paginatedCases = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredAndSortedCases.slice(startIdx, startIdx + pageSize);
  }, [filteredAndSortedCases, currentPage, pageSize]);

  // Metrics
  const openCount = filteredAndSortedCases.filter((c) => c.status === 'open').length;
  const closedCount = filteredAndSortedCases.filter((c) => c.status === 'closed').length;
  const pendingCount = filteredAndSortedCases.filter((c) => c.status === 'pending').length;
  const totalFineAmount = filteredAndSortedCases.reduce((sum, c) => sum + (Number(c.fine) || 0), 0);

  // CSV Export for Filtered Cases
  const handleExportFilteredCsv = () => {
    try {
      if (filteredAndSortedCases.length === 0) {
        toast.error('ไม่พบข้อมูลคดีตามเงื่อนไขเพื่อส่งออก CSV');
        return;
      }

      let csvContent = 'ID,Case Number,Type,Date,Title,Officer in Charge,Officer ID,Helpers,Fine ($),Status,Description\n';
      filteredAndSortedCases.forEach((c) => {
        const descClean = (c.description || '').replace(/"/g, '""').replace(/\n/g, ' ');
        const titleClean = (c.title || '').replace(/"/g, '""');
        const officerClean = (c.officerName || c.officer_in_charge || '').replace(/"/g, '""');
        const officerIdClean = (c.officerId || c.officer_discord_id || '').replace(/"/g, '""');
        const typeClean = (c.type || c.case_type || 'คดีปกติ').replace(/"/g, '""');
        const assistantClean = (c.assistant_officer || '').replace(/"/g, '""');
        const dateStr = formatDate(c.created_at || c.createdAt || c.date || '');

        csvContent += `"${c.id}","${c.caseId || c.case_number}","${typeClean}","${dateStr}","${titleClean}","${officerClean}","${officerIdClean}","${assistantClean}","${c.fine || 0}","${c.status}","${descClean}"\n`;
      });

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cases_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`ส่งออกข้อมูล ${filteredAndSortedCases.length} รายการเป็น CSV สำเร็จ`);
    } catch {
      toast.error('เกิดข้อผิดพลาดในการสร้างไฟล์ CSV');
    }
  };

  const getTypeBadge = (type?: string) => {
    const t = type || 'คดีปกติ';
    switch (t) {
      case 'Take2':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40">Take2</span>;
      case 'ส้มแดง':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-orange-500/20 text-orange-300 border border-orange-500/40">ส้มแดง</span>;
      case 'จัดร้าน':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40">จัดร้าน</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">{t}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>กำลังสืบสวน</span>
          </span>
        );
      case 'closed':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>ปิดคดีแล้ว</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 inline-flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>รอตรวจสอบ</span>
          </span>
        );
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
            รายงานสถิติคดีอาญา ข้อมูลส่งตรงจาก Discord Bot พร้อมค้นหา กรอง และส่งออก CSV
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleExportFilteredCsv}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4 mr-2" />
            <span>ส่งออก CSV ({filteredAndSortedCases.length} รายการ)</span>
          </Button>

          <Button variant="primary" onClick={handleOpenCreate} className="text-xs font-bold">
            <Plus className="w-4 h-4 mr-2" />
            <span>เพิ่มคดี</span>
          </Button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
          <Filter className="w-4 h-4 text-amber-400" />
          <span>กรองรายงานช่วงเวลา:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setFilterType('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'all'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => { setFilterType('daily'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'daily'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            วันนี้
          </button>
          <button
            onClick={() => { setFilterType('week'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'week'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            สัปดาห์นี้
          </button>
          <button
            onClick={() => { setFilterType('month'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'month'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            เดือนนี้
          </button>
          <button
            onClick={() => { setFilterType('custom'); setCurrentPage(1); }}
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
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 text-slate-100 px-2 py-1 rounded border border-slate-800 focus:outline-none"
            />
            <span className="text-slate-500">ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 text-slate-100 px-2 py-1 rounded border border-slate-800 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 block font-semibold">จำนวนคดี (ตามเงื่อนไข)</span>
            <span className="text-2xl font-black text-slate-100 mt-1 block">
              {filteredAndSortedCases.length} <span className="text-xs text-slate-400 font-normal">คดี</span>
            </span>
          </div>
          <div className="p-3 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-xl">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 block font-semibold">กำลังสืบสวน (Open)</span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">
              {openCount} <span className="text-xs text-slate-400 font-normal">คดี</span>
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 block font-semibold">ปิดคดีแล้ว (Closed)</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {closedCount} <span className="text-xs text-slate-400 font-normal">คดี</span>
            </span>
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

      {/* Control Bar: Search, Sort, Page Size */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Input
            placeholder="ค้นหาชื่อตำรวจ, Discord ID, ประเภทคดี, รายละเอียด, ผู้ช่วย..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 text-xs"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        {/* Sort & Pagination Options */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Sorting Dropdown */}
          <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400 ml-1" />
            <span className="text-slate-400 text-[11px] font-bold">เรียงตาม:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 text-slate-100 px-2 py-1 rounded focus:outline-none text-xs border border-slate-800"
            >
              <option value="newest">ใหม่ล่าสุด</option>
              <option value="oldest">เก่าสุด</option>
              <option value="type">ประเภทคดี</option>
              <option value="helpers">จำนวนผู้ช่วย</option>
            </select>
          </div>

          {/* Page Size Dropdown */}
          <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 text-[11px] font-bold ml-1">แสดงหน้าละ:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-900 text-slate-100 px-2 py-1 rounded focus:outline-none text-xs border border-slate-800"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">เลขที่คดี</th>
                <th className="px-4 py-3">ประเภทคดี</th>
                <th className="px-4 py-3">ผู้ลงคดี</th>
                <th className="px-4 py-3">ผู้ช่วย (Helpers)</th>
                <th className="px-4 py-3">รายละเอียด / ภาพประกอบ</th>
                <th className="px-4 py-3">วันที่บันทึก</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    ไม่พบข้อมูลคดีตามเงื่อนไขค้นหาหรือช่วงเวลาที่ระบุ
                  </td>
                </tr>
              ) : (
                paginatedCases.map((c: any) => {
                  const officerName = c.officerName || c.officer_in_charge || 'ไม่ระบุ';
                  const officerAvatar = c.officerAvatar || c.officer_avatar;
                  const dateStr = formatDate(c.created_at || c.createdAt || c.date || '');
                  const typeStr = c.type || c.case_type || 'คดีปกติ';
                  const caseIdStr = c.caseId || c.case_number || `CASE-${c.id}`;

                  let helpersList: any[] = [];
                  if (Array.isArray(c.helpers)) {
                    helpersList = c.helpers;
                  } else if (typeof c.helpers === 'string' && c.helpers.trim()) {
                    try {
                      helpersList = JSON.parse(c.helpers);
                    } catch (_) {
                      helpersList = c.helpers.split(',').map((h: string) => ({ name: h.trim() }));
                    }
                  } else if (c.assistant_officer && c.assistant_officer !== 'ไม่มี') {
                    helpersList = c.assistant_officer.split(',').map((h: string) => ({ name: h.trim() }));
                  }

                  const hasImage = Boolean(c.image && c.image.trim().length > 0);

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        c.has_alert ? 'bg-red-950/25 border-l-4 border-l-red-500' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-rose-300">#{caseIdStr}</td>
                      <td className="px-4 py-3">{getTypeBadge(typeStr)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          {officerAvatar ? (
                            <img
                              src={officerAvatar}
                              alt={officerName}
                              className="w-6 h-6 rounded-full object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                              <User className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-200">{officerName}</span>
                            {(c.officerId || c.officer_discord_id) && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                ID: {c.officerId || c.officer_discord_id}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {helpersList.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {helpersList.map((h: any, idx: number) => {
                              const hName = typeof h === 'string' ? h : h.name || h.fullname || h.id || `Helper ${idx + 1}`;
                              return (
                                <span
                                  key={idx}
                                  className="bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded text-[10px] font-medium"
                                >
                                  {hName}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[10px]">ไม่มี</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="space-y-1">
                          <p className="text-slate-300 truncate font-medium">{c.description || c.title || '-'}</p>
                          {hasImage && (
                            <button
                              onClick={() => setViewingImage(c.image)}
                              className="inline-flex items-center space-x-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>ดูรูปหลักฐาน</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">{dateStr}</td>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            แสดงรายการที่ {paginatedCases.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
            {Math.min(currentPage * pageSize, filteredAndSortedCases.length)} จากทั้งหมด{' '}
            <strong className="text-slate-200">{filteredAndSortedCases.length}</strong> คดี
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono font-bold text-slate-200">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Case Details View Modal */}
      {selectedCaseDetail && (
        <Modal
          isOpen={!!selectedCaseDetail}
          onClose={() => setSelectedCaseDetail(null)}
          title={`รายละเอียดสำนวนคดี: ${selectedCaseDetail.caseId || selectedCaseDetail.case_number}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-100">{selectedCaseDetail.title}</h3>
                {getTypeBadge(selectedCaseDetail.type || selectedCaseDetail.case_type)}
              </div>
              {getStatusBadge(selectedCaseDetail.status)}
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[10px]">ผู้ลงคดี</span>
                <span className="text-slate-200 font-bold">
                  {selectedCaseDetail.officerName || selectedCaseDetail.officer_in_charge || 'ไม่ระบุ'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[10px]">ผู้ช่วย</span>
                <span className="text-slate-200 font-bold">
                  {selectedCaseDetail.assistant_officer || 'ไม่มี'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[10px]">ผู้ต้องสงสัย / แก๊ง</span>
                <span className="text-slate-200 font-bold">{selectedCaseDetail.suspect_name || 'ไม่ระบุ'}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[10px]">วันที่ลงบันทึก</span>
                <span className="text-slate-300 font-mono">
                  {formatDate(selectedCaseDetail.created_at || selectedCaseDetail.createdAt || selectedCaseDetail.date || '')}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-bold block mb-1">รายละเอียดคดี:</span>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 min-h-[80px] whitespace-pre-wrap">
                {selectedCaseDetail.description || 'ไม่มีการระบุรายละเอียดเพิ่มเติม'}
              </div>
            </div>

            {selectedCaseDetail.image && (
              <div>
                <span className="text-slate-400 font-bold block mb-1">ภาพหลักฐานประกอบ:</span>
                <img
                  src={selectedCaseDetail.image}
                  alt="Case Evidence"
                  className="max-h-60 rounded-lg object-contain border border-slate-800"
                />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedCaseDetail(null)} className="text-xs font-bold">
                ปิดหน้าต่าง
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Full-size Image Modal */}
      {viewingImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-2 shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 bg-slate-950/80 hover:bg-slate-800 text-slate-300 p-2 rounded-full border border-slate-700 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={viewingImage}
              alt="Case Evidence View"
              className="max-h-[80vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
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
