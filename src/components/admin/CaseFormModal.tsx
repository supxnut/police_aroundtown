import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Case } from '../../types';

interface CaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: Case | null;
}

export const CaseFormModal: React.FC<CaseFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [caseNumber, setCaseNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [suspectName, setSuspectName] = useState('');
  const [officerInCharge, setOfficerInCharge] = useState('');
  const [status, setStatus] = useState<'open' | 'closed' | 'pending'>('open');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setCaseNumber(initialData.case_number);
      setTitle(initialData.title);
      setDescription(initialData.description);
      setSuspectName(initialData.suspect_name);
      setOfficerInCharge(initialData.officer_in_charge);
      setStatus(initialData.status);
    } else {
      setCaseNumber(`CASE-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      setTitle('');
      setDescription('');
      setSuspectName('Unknown');
      setOfficerInCharge('Unassigned');
      setStatus('open');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        case_number: caseNumber,
        title,
        description,
        suspect_name: suspectName,
        officer_in_charge: officerInCharge,
        status,
      });
      onClose();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'แก้ไขคดีตำรวจ' : 'ลงทะเบียนคดีใหม่'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="หมายเลขคดี" value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} required />

        <Input label="หัวข้อคดี" placeholder="เช่น เหตุปล้นธนาคารแปซิฟิก" value={title} onChange={(e) => setTitle(e.target.value)} required />

        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">รายละเอียดคดี</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="สรุปเหตุการณ์โดยละเอียด หลักฐาน บันทึก..."
            className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="ชื่อผู้ต้องหา / แก๊ง" value={suspectName} onChange={(e) => setSuspectName(e.target.value)} />
          <Input label="เจ้าหน้าที่ผู้รับผิดชอบ" value={officerInCharge} onChange={(e) => setOfficerInCharge(e.target.value)} />
        </div>

        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">สถานะคดี</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'open' | 'closed' | 'pending')}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="open">เปิด (กำลังสืบสวน)</option>
            <option value="pending">รอดำเนินการ (รอหมายจับ/ไต่สวน)</option>
            <option value="closed">ปิดคดี (คลี่คลาย/จัดเก็บ)</option>
          </select>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : initialData ? 'บันทึกการแก้ไข' : 'ลงทะเบียนคดี'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
