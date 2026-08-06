import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { SystemLog } from '../../types';
import { LogsTable } from '../../components/admin/LogsTable';
import toast from 'react-hot-toast';
import { Download, Bot, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const AdminLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [discordLogs, setDiscordLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'audit' | 'discord'>('audit');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [activeTab]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      if (activeTab === 'audit') {
        const res = await api.get('/logs');
        if (res.data.success) setLogs(res.data.logs);
      } else {
        const res = await api.get('/logs/discord');
        if (res.data.success) setDiscordLogs(res.data.discordLogs);
      }
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูล Logs ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const response = await api.get('/logs/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit_logs.csv');
      document.body.appendChild(link);
      link.click();
      toast.success('ดาวน์โหลด CSV สำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการส่งออกไฟล์ CSV');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
            <span>ประวัติการทำรายการของระบบ (Audit Logs & Discord Sync)</span>
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            บันทึกประวัติการทำงานของผู้ดูแลระบบ และประวัติข้อมูลที่ซิงค์จาก Discord Sync Bot
          </p>
        </div>

        <Button variant="secondary" onClick={handleExportCsv} className="shrink-0 text-xs">
          <Download className="w-4 h-4 mr-2" />
          <span>ส่งออกไฟล์ CSV</span>
        </Button>
      </div>

      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center space-x-2 ${
            activeTab === 'audit'
              ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>ประวัติแอดมิน (Admin Logs)</span>
        </button>

        <button
          onClick={() => setActiveTab('discord')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center space-x-2 ${
            activeTab === 'discord'
              ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>บันทึก Discord Sync Bot ({discordLogs.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">กำลังโหลดประวัติการทำรายการ...</div>
      ) : activeTab === 'audit' ? (
        <LogsTable logs={logs} />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-950">
            <h3 className="text-xs font-bold text-slate-200">ประวัติการซิงค์ข้อความ Discord ล่าสุด</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Message ID</th>
                  <th className="px-4 py-3">Channel ID</th>
                  <th className="px-4 py-3">Discord ID</th>
                  <th className="px-4 py-3">ประเภท</th>
                  <th className="px-4 py-3">วันที่ซิงค์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {discordLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      ยังไม่มีข้อมูลการซิงค์จาก Discord Sync Bot
                    </td>
                  </tr>
                ) : (
                  discordLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors font-mono text-[11px]">
                      <td className="px-4 py-3 text-cyan-400">{item.message_id}</td>
                      <td className="px-4 py-3 text-slate-400">{item.channel_id}</td>
                      <td className="px-4 py-3 text-amber-300">{item.discord_id}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-blue-400 border border-slate-700 uppercase">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{item.created_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
