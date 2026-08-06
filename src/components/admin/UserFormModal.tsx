import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { User } from '../../types';
import { POLICE_RANKS } from '../../utils/constants';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  initialData?: User | null;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [discordId, setDiscordId] = useState('');
  const [fullname, setFullname] = useState('');
  const [rank, setRank] = useState<string>(POLICE_RANKS[POLICE_RANKS.length - 1]);
  const [startDate, setStartDate] = useState('');
  const [totalHours, setTotalHours] = useState<string>('0');
  const [totalCases, setTotalCases] = useState<string>('0');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [active, setActive] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setDiscordId(initialData.discord_id);
      setFullname(initialData.fullname);
      setRank(initialData.rank);
      setStartDate(initialData.start_date);
      setTotalHours((initialData.total_hours ?? 0).toString());
      setTotalCases((initialData.total_cases ?? 0).toString());
      setActive(initialData.active === 1);
    } else {
      setDiscordId('');
      setFullname('');
      setRank(POLICE_RANKS[POLICE_RANKS.length - 1]);
      setStartDate(new Date().toISOString().split('T')[0]);
      setTotalHours('0');
      setTotalCases('0');
      setActive(true);
      setAvatarFile(null);
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('discord_id', discordId);
    formData.append('fullname', fullname);
    formData.append('rank', rank);
    formData.append('start_date', startDate);
    formData.append('total_hours', totalHours);
    formData.append('total_cases', totalCases);
    formData.append('active', active ? '1' : '0');
    if (avatarFile) {
      formData.append('avatar', avatarFile);
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
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'แก้ไขข้อมูลเจ้าหน้าที่' : 'ลงทะเบียนเจ้าหน้าที่ใหม่'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Discord ID"
          placeholder="เช่น 100000000000000001"
          value={discordId}
          onChange={(e) => setDiscordId(e.target.value)}
          required
        />

        <Input
          label="ชื่อ-นามสกุล"
          placeholder="เช่น ส.ต.ต. สมชาย ใจดี"
          value={fullname}
          onChange={(e) => setFullname(e.target.value)}
          required
        />

        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">ยศตำแหน่ง</label>
          <select
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
          >
            {POLICE_RANKS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="วันที่เริ่มงาน"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <Input
            label="เวลาปฏิบัติงานสะสมรวม (ชั่วโมง)"
            type="number"
            step="0.5"
            placeholder="เช่น 120"
            value={totalHours}
            onChange={(e) => setTotalHours(e.target.value)}
            required
          />
          <Input
            label="จำนวนเคสคดีสะสมรวม (เคส)"
            type="number"
            step="1"
            placeholder="เช่น 15"
            value={totalCases}
            onChange={(e) => setTotalCases(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">รูปโปรไฟล์ (Avatar)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files && setAvatarFile(e.target.files[0])}
            className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
          />
        </div>

        {initialData && (
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="activeStatus"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="activeStatus" className="text-xs font-semibold text-slate-300">
              เปิดใช้งานบัญชีผู้ใช้
            </label>
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : initialData ? 'บันทึกการแก้ไข' : 'ลงทะเบียนเจ้าหน้าที่'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
