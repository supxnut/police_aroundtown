import React, { useState } from 'react';
import { Search, ShieldAlert, Calendar, Clock, User } from 'lucide-react';
import { SystemLog } from '../../types';
import { Input } from '../ui/Input';

interface LogsTableProps {
  logs: SystemLog[];
}

export const LogsTable: React.FC<LogsTableProps> = ({ logs }) => {
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.admin_discord_id.toLowerCase().includes(search.toLowerCase()) ||
      l.affected_user.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">ประวัติการทำรายการของระบบ (Audit Trail)</h3>
            <p className="text-xs text-slate-300">บันทึกการทำงานของแอดมิน</p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Input
            placeholder="ค้นหาตามแอดมิน, กิจกรรม หรือ เจ้าหน้าที่..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">รหัส</th>
              <th className="px-4 py-3">Discord ID แอดมิน</th>
              <th className="px-4 py-3">รายละเอียดการทำรายการ</th>
              <th className="px-4 py-3">ผู้ได้รับผลกระทบ</th>
              <th className="px-4 py-3">วันที่ & เวลา</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  ไม่พบประวัติการทำรายการตามคำค้นหา
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-500">#{log.id}</td>
                  <td className="px-4 py-3 font-mono font-bold text-amber-300">{log.admin_discord_id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-100">{log.action}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{log.affected_user}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {log.date} {log.time}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
