import React, { useState } from 'react';
import { Briefcase, FolderOpen, Calendar, User, Users, Image as ImageIcon, X } from 'lucide-react';
import { Case } from '../../types';
import { formatDate } from '../../utils/constants';

interface CasesCardProps {
  cases: Case[];
  totalCount: number;
  onRefresh?: () => void;
}

export const CasesCard: React.FC<CasesCardProps> = ({ cases, totalCount }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">ประวัติและข้อมูลคดีความ</h3>
            <p className="text-xs text-slate-400">สร้างและส่งข้อมูลอัตโนมัติจาก Discord Bot</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black text-indigo-400">{totalCount}</span>
          <span className="block text-[10px] uppercase font-semibold text-slate-400">จำนวนคดี</span>
        </div>
      </div>

      {/* Case Logs List */}
      <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
        {cases.length === 0 ? (
          <div className="text-center py-8 space-y-2 text-slate-500">
            <FolderOpen className="w-8 h-8 mx-auto opacity-40 mb-1" />
            <p className="text-xs">ยังไม่มีรายการคดีในระบบ</p>
          </div>
        ) : (
          cases.map((c) => {
            const officerName = c.officerName || c.officer_in_charge || 'ไม่ระบุ';
            const officerAvatar = c.officerAvatar || c.officer_avatar;
            const dateStr = formatDate(c.created_at || c.createdAt || c.date || '');
            const typeStr = c.type || c.case_type || 'คดีปกติ';
            const caseIdStr = c.caseId || c.case_number || `CASE-${c.id}`;

            // Helpers formatting
            let helpersList: any[] = [];
            if (Array.isArray(c.helpers)) {
              helpersList = c.helpers;
            } else if (typeof c.helpers === 'string' && (c.helpers as string).trim()) {
              try {
                helpersList = JSON.parse(c.helpers);
              } catch (_) {
                helpersList = (c.helpers as string).split(',').map((h) => ({ name: h.trim() }));
              }
            } else if (c.assistant_officer && c.assistant_officer !== 'ไม่มี') {
              helpersList = c.assistant_officer.split(',').map((h) => ({ name: h.trim() }));
            }

            const hasHelpers = helpersList.length > 0;
            const hasImage = Boolean(c.image && c.image.trim().length > 0);

            return (
              <div
                key={c.id}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors shadow-sm"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Column Left (70% Desktop, Top Mobile) */}
                  <div className="w-full md:w-[70%] space-y-2.5">
                    {/* Top Row: Case ID, Type, Date */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-mono font-extrabold text-indigo-400">#{caseIdStr}</span>
                        {getTypeBadge(typeStr)}
                      </div>
                      <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-mono">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{dateStr}</span>
                      </div>
                    </div>

                    {/* Primary Officer Info */}
                    <div className="flex items-center space-x-2.5">
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
                      <div className="text-xs">
                        <span className="text-slate-400 text-[10px]">ผู้ลงคดี: </span>
                        <strong className="text-slate-200 font-semibold">{officerName}</strong>
                      </div>
                    </div>

                    {/* Helpers Section (Only shown if helpers exist) */}
                    {hasHelpers && (
                      <div className="flex items-start space-x-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                        <Users className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 block font-semibold">ผู้ช่วย:</span>
                          <div className="flex flex-wrap gap-1">
                            {helpersList.map((h: any, idx: number) => {
                              const hName = typeof h === 'string' ? h : h.name || h.fullname || h.id || `Helper ${idx + 1}`;
                              const hAvatar = typeof h === 'object' ? h.avatar : undefined;
                              return (
                                <span
                                  key={idx}
                                  className="inline-flex items-center space-x-1 bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                >
                                  {hAvatar && (
                                    <img src={hAvatar} alt={hName} className="w-3 h-3 rounded-full object-cover" />
                                  )}
                                  <span>{hName}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {c.description && (
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-2 rounded border border-slate-800/40 whitespace-pre-wrap">
                        {c.description}
                      </p>
                    )}
                  </div>

                  {/* Column Right (30% Desktop, Bottom Mobile) */}
                  <div className="w-full md:w-[30%] flex-shrink-0 flex flex-col justify-center">
                    {hasImage ? (
                      <div
                        onClick={() => setSelectedImage(c.image!)}
                        className="group relative w-full aspect-[4/3] cursor-pointer overflow-hidden rounded-[12px] border border-slate-800 hover:border-indigo-500/50 transition-all shadow-md"
                      >
                        <img
                          src={c.image}
                          alt="Case Evidence"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold space-x-1 p-2 text-center">
                          <ImageIcon className="w-4 h-4 flex-shrink-0" />
                          <span>คลิกเพื่อดูภาพเต็ม</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full aspect-[4/3] bg-slate-900/60 rounded-[12px] border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 gap-1.5 p-2 text-center">
                        <ImageIcon className="w-6 h-6 text-slate-600" />
                        <span className="text-[11px] text-slate-500 font-medium">ไม่มีรูปหลักฐาน</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Image Full-Size Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-2 shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-slate-950/80 hover:bg-slate-800 text-slate-300 p-2 rounded-full border border-slate-700 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage}
              alt="Full Case View"
              className="max-h-[80vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
