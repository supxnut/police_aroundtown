import React, { useEffect, useState } from 'react';
import { Flame, Plus, Edit3, Trash2, History, Users, Award, Calendar } from 'lucide-react';
import api from '../../api/axios';
import { Activity, ActivityHistoryItem } from '../../types';
import { Button } from '../../components/ui/Button';
import { ActivityFormModal } from '../../components/admin/ActivityFormModal';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/constants';
import toast from 'react-hot-toast';

export const AdminActivitiesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [historyItems, setHistoryItems] = useState<ActivityHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Participant list inspect modal
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [selectedActivityTitle, setSelectedActivityTitle] = useState('');
  const [participants, setParticipants] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [actRes, histRes] = await Promise.all([
        api.get('/activities/admin'),
        api.get('/activities/history'),
      ]);

      if (actRes.data.success) setActivities(actRes.data.activities);
      if (histRes.data.success) setHistoryItems(histRes.data.history);
    } catch {
      toast.error('Failed to load activity management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingActivity(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (act: Activity) => {
    setEditingActivity(act);
    setIsModalOpen(true);
  };

  const handleInspectParticipants = async (act: Activity) => {
    setSelectedActivityTitle(act.title);
    try {
      const res = await api.get(`/activities/${act.id}/participants`);
      if (res.data.success) {
        setParticipants(res.data.participants);
        setIsParticipantsModalOpen(true);
      }
    } catch {
      toast.error('Failed to fetch participant list');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมนี้?')) return;
    try {
      const res = await api.delete(`/activities/${id}`);
      if (res.data.success) {
        toast.success('ลบกิจกรรมเรียบร้อยแล้ว');
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถลบกิจกรรมได้');
    }
  };

  const handleSubmitModal = async (formData: FormData) => {
    if (editingActivity) {
      const res = await api.put(`/activities/${editingActivity.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success('อัปเดตกิจกรรมเรียบร้อยแล้ว');
        fetchData();
      }
    } else {
      const res = await api.post('/activities', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success('สร้างกิจกรรมใหม่เรียบร้อยแล้ว');
        fetchData();
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Flame className="w-6 h-6 text-amber-400" />
            <span>จัดการกิจกรรมและปฏิบัติการตำรวจ</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            สร้างภารกิจปฏิบัติการ และการฝึกอบรม กิจกรรมที่จบลงแล้วจะถูกย้ายเข้าประวัติถาวรอัตโนมัติ
          </p>
        </div>

        <Button variant="primary" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          <span>สร้างกิจกรรมใหม่</span>
        </Button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'current'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>กิจกรรมที่เปิดอยู่ ({activities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'history'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>ประวัติกิจกรรมถาวร ({historyItems.length})</span>
        </button>
      </div>

      {activeTab === 'current' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activities.length === 0 ? (
            <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-xs">
              ยังไม่มีกิจกรรมหรือปฏิบัติการที่ถูกสร้างในขณะนี้
            </div>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col justify-between">
                <div>
                  <div className="relative h-40 overflow-hidden">
                    <img src={act.image} alt={act.title} className="w-full h-full object-cover" />
                    <div className="absolute top-3 right-3">
                      {act.status === 'active' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                          เปิดรับสมัคร
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-500/20 text-slate-300 border border-slate-500/40 backdrop-blur-md">
                          จบกิจกรรมแล้ว
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="text-base font-bold text-slate-100">{act.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{act.description}</p>
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center space-x-2 text-xs text-amber-300 font-semibold">
                      <Award className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>รางวัล: {act.reward}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 flex items-center justify-between border-t border-slate-800/80 mt-2">
                  <button
                    onClick={() => handleInspectParticipants(act)}
                    className="text-xs text-rose-400 hover:underline flex items-center space-x-1.5 font-bold"
                  >
                    <Users className="w-4 h-4" />
                    <span>ดูรายชื่อผู้เข้าร่วม</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenEdit(act)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-rose-400 transition-colors"
                      title="แก้ไขกิจกรรม"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(act.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                      title="ลบกิจกรรม"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">ชื่อกิจกรรม</th>
                  <th className="px-4 py-3">รางวัล</th>
                  <th className="px-4 py-3">วันที่เริ่ม</th>
                  <th className="px-4 py-3">วันที่สิ้นสุด</th>
                  <th className="px-4 py-3">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {historyItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      ไม่พบประวัติกิจกรรมถาวรในคลังข้อมูล
                    </td>
                  </tr>
                ) : (
                  historyItems.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-100">{h.title}</td>
                      <td className="px-4 py-3 text-amber-300 font-semibold">{h.reward}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(h.start_date)}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(h.end_date)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          คลังประวัติถาวร
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activity Create/Edit Modal */}
      <ActivityFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitModal}
        initialData={editingActivity}
      />

      {/* Participant List Modal */}
      <Modal
        isOpen={isParticipantsModalOpen}
        onClose={() => setIsParticipantsModalOpen(false)}
        title={`รายชื่อและผลโหวต/คำตอบของเจ้าหน้าที่: ${selectedActivityTitle}`}
      >
        <div className="space-y-3">
          {participants.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">ยังไม่มีเจ้าหน้าที่ส่งคำตอบ/ลงคะแนนโหวตสำหรับกิจกรรมนี้</p>
          ) : (
            participants.map((p, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={p.fullname}
                      className="w-8 h-8 rounded-full object-cover border border-slate-700"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-200">{p.fullname}</p>
                      <p className="text-[10px] text-slate-400">{p.rank}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    ตอบเมื่อ: {formatDate(p.joined_at)}
                  </span>
                </div>
                {p.answer && (
                  <div className="px-3 py-2 rounded bg-slate-900 border border-slate-800 text-xs">
                    <span className="text-blue-400 font-semibold">ผลโหวต / คำตอบ: </span>
                    <span className="text-slate-100">{p.answer}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};
