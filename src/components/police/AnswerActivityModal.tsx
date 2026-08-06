import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../ui/Button';
import { Activity } from '../../types';
import { Vote, MessageSquare, Award, CheckCircle2 } from 'lucide-react';

interface AnswerActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
  onSubmit: (activityId: number, answer: string) => Promise<void>;
}

export const AnswerActivityModal: React.FC<AnswerActivityModalProps> = ({
  isOpen,
  onClose,
  activity,
  onSubmit,
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [customText, setCustomText] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const getParsedOptions = (): string[] => {
    if (!activity?.options) {
      return ['เห็นด้วย / เข้าร่วม', 'ไม่เห็นด้วย / ไม่สะดวก', 'ข้อเสนอแนะเพิ่มเติม'];
    }
    if (Array.isArray(activity.options)) return activity.options;
    try {
      const parsed = JSON.parse(activity.options);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (_) {}
    return ['เห็นด้วย / เข้าร่วม', 'ไม่เห็นด้วย / ไม่สะดวก', 'ข้อเสนอแนะเพิ่มเติม'];
  };

  const optionsList = getParsedOptions();

  useEffect(() => {
    if (activity) {
      const options = getParsedOptions();
      setSelectedOption(options[0] || '');
      setCustomText('');
    }
  }, [activity, isOpen]);

  if (!activity) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAnswer = selectedOption === 'อื่นๆ (โปรดระบุ)'
      ? customText.trim() || selectedOption
      : selectedOption + (customText.trim() ? ` (${customText.trim()})` : '');

    if (!finalAnswer) return;

    setSubmitting(true);
    try {
      await onSubmit(activity.id, finalAnswer);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ตอบคำถาม / โหวตกิจกรรม">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold">
            <Award className="w-4 h-4" />
            <span>รางวัล: {activity.reward}</span>
          </div>
          <h4 className="text-sm font-bold text-slate-100">{activity.title}</h4>
          <p className="text-xs text-slate-400 leading-relaxed">{activity.description}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-400">
            <Vote className="w-4 h-4 text-blue-400" />
            <span>คำถาม / หัวข้อโหวต:</span>
          </div>
          <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-xl text-xs text-blue-200 font-semibold leading-relaxed">
            {activity.question || 'โปรดเลือกตัวเลือกเพื่อแสดงความคิดเห็นหรือโหวตคำตอบกิจกรรมนี้'}
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              ตัวเลือกการโหวต / คำตอบ:
            </label>
            <div className="space-y-2">
              {optionsList.map((opt, idx) => (
                <label
                  key={idx}
                  className={`flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedOption === opt
                      ? 'bg-blue-600/15 border-blue-500 text-slate-100 shadow-md shadow-blue-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="activity_option"
                    value={opt}
                    checked={selectedOption === opt}
                    onChange={() => setSelectedOption(opt)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs font-medium">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>ความคิดเห็นเพิ่มเติม (ถ้ามี):</span>
            </label>
            <textarea
              rows={2}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="พิมพ์เหตุผล ความคิดเห็น หรือรายละเอียดคำตอบเพิ่มเติม..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={!selectedOption && !customText}>
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            <span>ยืนยันส่งคำตอบ / ลงคะแนนโหวต</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
