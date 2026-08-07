import React from 'react';
import { Award, ShieldCheck, Tag, CheckCircle } from 'lucide-react';
import { OfficerTypeStat } from '../../types';

interface OfficerPerformanceCardProps {
  officerName: string;
  discordId: string;
  breakdown: OfficerTypeStat[];
  totalCases: number;
  totalSelfCases?: number;
  totalHelperCases?: number;
  filterLabel?: string;
}

export const OfficerPerformanceCard: React.FC<OfficerPerformanceCardProps> = ({
  officerName,
  discordId,
  breakdown,
  totalCases,
  totalSelfCases,
  totalHelperCases = 0,
  filterLabel = 'ทั้งหมด',
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden space-y-4">
      {/* Discord Embed Left Accent Border Line */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-rose-500 rounded-l-2xl" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 pl-1">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 flex items-center space-x-2">
              <span>สรุปผลงานตำรวจ</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-mono border border-indigo-500/30">
                {filterLabel}
              </span>
            </h3>
            <p className="text-xs text-slate-400">{officerName} (Discord ID: {discordId})</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black text-rose-400">{totalCases}</span>
          <span className="block text-[10px] uppercase font-bold text-slate-400">จำนวนคดี (ทั้งหมด)</span>
          <div className="flex items-center space-x-2 text-[10px] font-semibold text-slate-400 justify-end mt-0.5">
            <span className="text-emerald-300">ลงเอง {totalSelfCases ?? totalCases}</span>
            <span>•</span>
            <span className="text-indigo-300">ช่วย {totalHelperCases}</span>
          </div>
        </div>
      </div>

      {/* Case Types Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
        {breakdown.map((item) => {
          let badgeColor = 'from-slate-800/80 to-slate-900/80 border-slate-800 text-slate-200';
          let textColor = 'text-slate-300';
          let displayTitle = item.type;

          const lowerType = item.type.toLowerCase();
          if (lowerType === 'take2' || item.type === 'Take2') {
            badgeColor = 'from-purple-950/40 to-slate-900/80 border-purple-500/30 text-purple-300';
            textColor = 'text-purple-300';
            displayTitle = 'Take2';
          } else if (lowerType === 'red' || item.type === 'ส้มแดง') {
            badgeColor = 'from-orange-950/40 to-slate-900/80 border-orange-500/30 text-orange-300';
            textColor = 'text-orange-300';
            displayTitle = 'ส้มแดง';
          } else if (lowerType === 'raid' || item.type === 'จัดร้าน') {
            badgeColor = 'from-blue-950/40 to-slate-900/80 border-blue-500/30 text-blue-300';
            textColor = 'text-blue-300';
            displayTitle = 'จัดร้าน';
          } else if (lowerType === 'normal' || item.type === 'คดีปกติ') {
            badgeColor = 'from-rose-950/40 to-slate-900/80 border-rose-500/30 text-rose-300';
            textColor = 'text-rose-300';
            displayTitle = 'คดีปกติ';
          }

          return (
            <div
              key={item.type}
              className={`p-3 rounded-xl bg-gradient-to-br ${badgeColor} border space-y-2 shadow-md`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black ${textColor} uppercase tracking-wider`}>{displayTitle}</span>
                <span className="text-xs font-extrabold text-slate-100 font-mono">
                  รวม <strong className="text-amber-400">{item.totalCount}</strong> คดี
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800/60">
                <div className="flex items-center justify-between bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>ลงเอง:</span>
                  </span>
                  <strong className="text-emerald-300 font-mono font-bold">{item.selfCount}</strong>
                </div>

                <div className="flex items-center justify-between bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Tag className="w-3 h-3 text-indigo-400" />
                    <span>ช่วยปฏิบัติ:</span>
                  </span>
                  <strong className="text-indigo-300 font-mono font-bold">{item.helperCount}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Embed Footer Total Summary */}
      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs pl-3">
        <div className="flex items-center space-x-2 text-slate-300 font-bold">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>ผลงานปฏิบัติการรวมทั้งหมด</span>
        </div>
        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="text-base font-black text-rose-400">
            {totalCases} <span className="text-xs text-slate-400 font-normal">คดี (รวมทั้งหมด)</span>
          </span>
          <span className="text-xs text-slate-300 border-l border-slate-800 pl-3 space-x-2">
            <span>ลงเอง <strong className="text-emerald-400 font-bold">{totalSelfCases ?? totalCases}</strong></span>
            <span>|</span>
            <span>ช่วยปฏิบัติ <strong className="text-indigo-300 font-bold">{totalHelperCases}</strong></span>
          </span>
        </div>
      </div>
    </div>
  );
};
