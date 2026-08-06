import React from 'react';
import { Clock, Calendar, ShieldCheck } from 'lucide-react';
import { DutyLog } from '../../types';
import { formatDate } from '../../utils/constants';

interface DutyCardProps {
  logs: DutyLog[];
  totalHours: number;
}

export const DutyCard: React.FC<DutyCardProps> = ({ logs, totalHours }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">ประวัติการเข้าปฏิบัติหน้าที่</h3>
            <p className="text-xs text-slate-300">บันทึกเวลาเข้าเวรของเจ้าหน้าที่</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black text-rose-400">{totalHours.toFixed(1)}</span>
          <span className="block text-[10px] uppercase font-semibold text-slate-300">ชั่วโมงรวม</span>
        </div>
      </div>

      <div className="mt-4 space-y-2.5 max-h-60 overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">ไม่พบประวัติการเข้าเวร</p>
        ) : (
          logs.slice(0, 5).map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-100">{formatDate(log.date)}</p>
                  <p className="text-[11px] text-slate-300 font-mono">
                    {log.start_time} - {log.end_time}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-extrabold text-xs">
                {log.hours} ชม.
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
