import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { DutyLog, User } from '../../types';
import { sortUsersByRankAndName } from '../../utils/constants';

interface DutyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  users: User[];
  initialData?: DutyLog | null;
}

export const DutyFormModal: React.FC<DutyFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  users,
  initialData,
}) => {
  const [userId, setUserId] = useState<number>(users[0]?.id || 0);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [hours, setHours] = useState('8.0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setUserId(initialData.user_id);
      setDate(initialData.date);
      setStartTime(initialData.start_time);
      setEndTime(initialData.end_time);
      setHours(initialData.hours.toString());
    } else {
      setUserId(users[0]?.id || 0);
      setDate(new Date().toISOString().split('T')[0]);
      setStartTime('08:00');
      setEndTime('16:00');
      setHours('8.0');
    }
  }, [initialData, isOpen, users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        user_id: userId,
        date,
        start_time: startTime,
        end_time: endTime,
        hours: parseFloat(hours),
      });
      onClose();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'แก้ไขบันทึกเวลาเข้าเวร' : 'เพิ่มบันทึกเวลาเข้าเวร'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!initialData && (
          <div className="flex flex-col space-y-1.5 w-full">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">เลือกเจ้าหน้าที่ตำรวจ</label>
            <select
              value={userId}
              onChange={(e) => setUserId(parseInt(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {sortUsersByRankAndName(users).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullname} ({u.rank})
                </option>
              ))}
            </select>
          </div>
        )}

        <Input label="วันที่เข้าเวร" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

        <div className="grid grid-cols-2 gap-3">
          <Input label="เวลาเริ่ม" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          <Input label="เวลาออก" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
        </div>

        <Input
          label="จำนวนชั่วโมงรวม"
          type="number"
          step="0.1"
          placeholder="เช่น 8.0"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          required
        />

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : initialData ? 'บันทึกการแก้ไข' : 'เพิ่มบันทึกเวลาเข้าเวร'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
