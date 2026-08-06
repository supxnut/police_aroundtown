import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Activity } from '../../types';

interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  initialData?: Activity | null;
}

export const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [question, setQuestion] = useState('');
  const [optionsStr, setOptionsStr] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'active' | 'finished'>('active');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setReward(initialData.reward);
      setQuestion(initialData.question || 'โปรดเลือกโหวตหรือแสดงความคิดเห็นสำหรับกิจกรรมนี้');
      if (initialData.options) {
        if (typeof initialData.options === 'string') {
          try {
            const arr = JSON.parse(initialData.options);
            setOptionsStr(Array.isArray(arr) ? arr.join(', ') : initialData.options);
          } catch (_) {
            setOptionsStr(initialData.options);
          }
        } else if (Array.isArray(initialData.options)) {
          setOptionsStr(initialData.options.join(', '));
        }
      } else {
        setOptionsStr('เห็นด้วย / เข้าร่วม, ไม่เห็นด้วย / ไม่สะดวก, ข้อเสนอแนะเพิ่มเติม');
      }
      setStartDate(initialData.start_date);
      setEndDate(initialData.end_date);
      setStatus(initialData.status);
    } else {
      setTitle('');
      setDescription('');
      setReward('$10,000 + Commendation');
      setQuestion('โปรดเลือกโหวตหรือตอบคำถามสำหรับกิจกรรมนี้');
      setOptionsStr('เห็นด้วย / เข้าร่วม, ไม่เห็นด้วย / ไม่สะดวก, ข้อเสนอแนะเพิ่มเติม');
      setStartDate(new Date().toISOString().split('T')[0]);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setEndDate(nextWeek.toISOString().split('T')[0]);
      setStatus('active');
      setImageFile(null);
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('reward', reward);
    formData.append('question', question);
    const parsedOptions = optionsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    formData.append('options', JSON.stringify(parsedOptions));
    formData.append('start_date', startDate);
    formData.append('end_date', endDate);
    formData.append('status', status);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'แก้ไขกิจกรรมปฏิบัติการ' : 'สร้างกิจกรรม / ภารกิจปฏิบัติการใหม่'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="ชื่อกิจกรรม / ภารกิจ" placeholder="เช่น กิจกรรมลาดตระเวนเมือง" value={title} onChange={(e) => setTitle(e.target.value)} required />

        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">รายละเอียดกิจกรรม / สรุปภารกิจ</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="เป้าหมายยุทธวิธี กฎระเบียบ..."
            required
            className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        <Input label="รางวัล / ของตอบแทน" placeholder="เช่น $15,000 + เข็มเกียรติยศ" value={reward} onChange={(e) => setReward(e.target.value)} required />

        <Input label="คำถาม / หัวข้อการโหวต" placeholder="เช่น คุณเห็นด้วยกับการจัดกำลังระเวนเพิ่มในยามวิกาลหรือไม่?" value={question} onChange={(e) => setQuestion(e.target.value)} required />

        <Input label="ตัวเลือกการโหวต (คั่นด้วยเครื่องหมายจุลภาค ,)" placeholder="เห็นด้วย / เข้าร่วม, ไม่เห็นด้วย / ไม่สะดวก, ข้อเสนอแนะเพิ่มเติม" value={optionsStr} onChange={(e) => setOptionsStr(e.target.value)} required />

        <div className="grid grid-cols-2 gap-3">
          <Input label="วันที่เริ่มต้น" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          <Input label="วันที่สิ้นสุด" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>

        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">ภาพแบนเนอร์กิจกรรม</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files && setImageFile(e.target.files[0])}
            className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
          />
        </div>

        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">สถานะกิจกรรม</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'finished')}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="active">เปิดกิจกรรม (แสดงให้เจ้าหน้าที่ตำรวจเห็น)</option>
            <option value="finished">จบกิจกรรมแล้ว (ย้ายเข้าประวัติถาวรอัตโนมัติ)</option>
          </select>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : initialData ? 'บันทึกการแก้ไข' : 'สร้างกิจกรรมใหม่'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
