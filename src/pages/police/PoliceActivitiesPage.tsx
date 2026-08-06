import React, { useEffect, useState } from 'react';
import { Flame, CheckCircle, Vote } from 'lucide-react';
import api from '../../api/axios';
import { Activity } from '../../types';
import { ActivityCard } from '../../components/police/ActivityCard';
import { AnswerActivityModal } from '../../components/police/AnswerActivityModal';
import toast from 'react-hot-toast';

export const PoliceActivitiesPage: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await api.get('/activities/police');
      if (res.data.success) {
        setActivities(res.data.activities);
      }
    } catch {
      toast.error('Failed to load active operations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleOpenAnswerModal = (act: Activity) => {
    setSelectedActivity(act);
    setIsAnswerModalOpen(true);
  };

  const handleAnswerSubmit = async (activityId: number, answer: string) => {
    try {
      const res = await api.post(`/activities/${activityId}/join`, { answer });
      if (res.data.success) {
        toast.success('บันทึกคำตอบ / การโหวตของคุณเรียบร้อยแล้ว!');
        fetchActivities();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถส่งคำตอบ/โหวตได้');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Vote className="w-6 h-6 text-amber-400" />
            <span>ตอบคำถามและโหวตกิจกรรมปฏิบัติการ</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            เจ้าหน้าที่สามารถเลือกตอบคำถามหรือลงคะแนนโหวตในแต่ละกิจกรรมได้ 1 ครั้ง
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">กำลังโหลดรายการกิจกรรม...</div>
      ) : activities.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-3">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
          <p className="text-sm font-bold text-slate-200">ไม่มีกิจกรรมที่เปิดรับในขณะนี้</p>
          <p className="text-xs text-slate-400">กิจกรรมทั้งหมดที่กำหนดไว้เสร็จสิ้นหรือปิดรับการโหวต/ตอบคำถามแล้ว</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((act) => (
            <ActivityCard
              key={act.id}
              activity={act}
              onAnswer={handleOpenAnswerModal}
            />
          ))}
        </div>
      )}

      <AnswerActivityModal
        isOpen={isAnswerModalOpen}
        onClose={() => setIsAnswerModalOpen(false)}
        activity={selectedActivity}
        onSubmit={handleAnswerSubmit}
      />
    </div>
  );
};
