import React from 'react';
import { Briefcase, ShieldAlert, FolderOpen } from 'lucide-react';
import { Case } from '../../types';

interface CasesCardProps {
  cases: Case[];
  totalCount: number;
  onRefresh?: () => void;
}

export const CasesCard: React.FC<CasesCardProps> = ({ cases, totalCount }) => {
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
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl relative">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">ประวัติและข้อมูลคดีความ</h3>
            <p className="text-xs text-slate-400">ดึงข้อมูลจาก Log คดีอัตโนมัติ (แก้ไขได้โดย Admin เท่านั้น)</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black text-indigo-400">{totalCount}</span>
          <span className="block text-[10px] uppercase font-semibold text-slate-400">คดีทั้งหมด</span>
        </div>
      </div>

      <div className="mt-4 space-y-2.5 max-h-64 overflow-y-auto pr-1">
        {cases.length === 0 ? (
          <div className="text-center py-6 space-y-1 text-slate-500">
            <FolderOpen className="w-8 h-8 mx-auto opacity-40 mb-2" />
            <p className="text-xs">ยังไม่มีรายการคดีในระบบ</p>
          </div>
        ) : (
          cases.slice(0, 6).map((c) => (
            <div key={c.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-indigo-300">{c.case_number}</span>
                {getStatusBadge(c.status)}
              </div>
              <p className="text-xs font-bold text-slate-200 truncate">{c.title}</p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span>ผู้ต้องสงสัย: <strong className="text-slate-300">{c.suspect_name || 'ไม่ระบุ'}</strong></span>
                <span>ผู้รับผิดชอบ: <strong className="text-slate-300">{c.officer_in_charge || 'ไม่ระบุ'}</strong></span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

