import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ShopItem } from '../../types';

interface ShopItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  initialData?: ShopItem | null;
}

export const ShopItemModal: React.FC<ShopItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('1000');
  const [status, setStatus] = useState<'available' | 'out_of_stock'>('available');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description);
      setPrice(initialData.price.toString());
      setStatus(initialData.status);
    } else {
      setName('');
      setDescription('');
      setPrice('1000');
      setStatus('available');
      setImageFile(null);
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('status', status);
    if (imageFile) {
      formData.append('shopImage', imageFile);
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
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'แก้ไขข้อมูลอุปกรณ์' : 'เพิ่มรายการอุปกรณ์ยุทธภัณฑ์'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="ชื่อรายการอุปกรณ์" placeholder="เช่น เสื้อเกราะยุทธวิธีหนัก" value={name} onChange={(e) => setName(e.target.value)} required />

        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">รายละเอียดอุปกรณ์</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="สเปกอุปกรณ์ คุณสมบัติ กฎการใช้งาน..."
            required
            className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        <Input label="ราคา ($)" type="number" step="1" value={price} onChange={(e) => setPrice(e.target.value)} required />

        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">รูปภาพสินค้า</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files && setImageFile(e.target.files[0])}
            className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
          />
        </div>

        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">สถานะสินค้าในสต็อก</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'available' | 'out_of_stock')}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="available">มีสินค้า (พร้อมจำหน่าย)</option>
            <option value="out_of_stock">สินค้าหมด</option>
          </select>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : initialData ? 'บันทึกการแก้ไข' : 'เพิ่มอุปกรณ์'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
