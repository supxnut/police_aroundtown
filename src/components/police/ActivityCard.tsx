import React from 'react';
import { Flame, Award, Calendar, CheckCircle2, MessageSquare, Vote } from 'lucide-react';
import { Activity } from '../../types';
import { formatDate } from '../../utils/constants';

interface ActivityCardProps {
  activity: Activity;
  onAnswer: (activity: Activity) => void;
  submitting?: boolean;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onAnswer, submitting }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all duration-200">
      <div>
        <div className="relative h-44 overflow-hidden">
          <img
            src={activity.image || 'https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?w=600'}
            alt={activity.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
              <Flame className="w-3 h-3 text-amber-400 mr-1 animate-pulse" />
              <span>โหวต / ตอบคำถามภารกิจ</span>
            </span>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <h3 className="text-base font-bold text-slate-100">{activity.title}</h3>
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{activity.description}</p>

          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center space-x-2.5 text-xs text-amber-300 font-semibold">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <span>รางวัล / ผลตอบแทน: {activity.reward}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-400">
              <Vote className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>คำถาม / หัวข้อโหวต:</span>
            </div>
            <p className="text-xs text-slate-200 font-medium">
              {activity.question || 'โปรดตอบคำถามหรือแสดงความคิดเห็นเพื่อเข้าร่วมกิจกรรม'}
            </p>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {formatDate(activity.start_date)} — {formatDate(activity.end_date)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 pt-0">
        {activity.has_joined ? (
          <div className="space-y-2">
            <button
              disabled
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center space-x-2 cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>ตอบคำถาม / โหวตเรียบร้อยแล้ว</span>
            </button>
            {activity.user_answer && (
              <p className="text-[11px] text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded border border-slate-800/80 truncate">
                <span className="text-emerald-400 font-semibold">คำตอบของคุณ:</span> {activity.user_answer}
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={() => onAnswer(activity)}
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 font-bold text-xs transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <MessageSquare className="w-4 h-4" />
            <span>ตอบคำถาม / โหวตคำตอบ</span>
          </button>
        )}
      </div>
    </div>
  );
};
