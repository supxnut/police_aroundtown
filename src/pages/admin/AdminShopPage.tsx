import React, { useEffect, useState } from 'react';
import { ShoppingBag, Plus, Edit3, Trash2, Search } from 'lucide-react';
import api from '../../api/axios';
import { ShopItem } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ShopItemModal } from '../../components/admin/ShopItemModal';
import { formatCurrency } from '../../utils/constants';
import toast from 'react-hot-toast';

export const AdminShopPage: React.FC = () => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/shop');
      if (res.data.success) {
        setItems(res.data.items);
      }
    } catch {
      toast.error('Failed to load shop products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ShopItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการสินค้าอุปกรณ์นี้?')) return;
    try {
      const res = await api.delete(`/shop/${id}`);
      if (res.data.success) {
        toast.success('ลบรายการสินค้าเรียบร้อยแล้ว');
        fetchItems();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถลบรายการสินค้าได้');
    }
  };

  const handleSubmitModal = async (formData: FormData) => {
    if (editingItem) {
      const res = await api.put(`/shop/${editingItem.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success('อัปเดตข้อมูลอุปกรณ์เรียบร้อยแล้ว');
        fetchItems();
      }
    } else {
      const res = await api.post('/shop', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success('เพิ่มรายการอุปกรณ์ใหม่เรียบร้อยแล้ว');
        fetchItems();
      }
    }
  };

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <ShoppingBag className="w-6 h-6 text-rose-400" />
            <span>จัดการคลังอุปกรณ์ยุทธภัณฑ์และร้านค้า</span>
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            สร้าง แก้ไข และอัปเดตรายการอุปกรณ์ ราคา และสถานะสินค้าในสต็อก
          </p>
        </div>

        <Button variant="primary" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          <span>เพิ่มรายการอุปกรณ์ใหม่</span>
        </Button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Input
              placeholder="ค้นหารายการอุปกรณ์ยุทธภัณฑ์..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          </div>
          <span className="text-xs text-slate-400 font-semibold">จำนวน {filtered.length} รายการ</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">ชื่อรายการอุปกรณ์</th>
                <th className="px-4 py-3">ราคา</th>
                <th className="px-4 py-3">สถานะสต็อก</th>
                <th className="px-4 py-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    ไม่พบรายการอุปกรณ์ตามคำค้นหา
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-100 flex items-center space-x-3">
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600'}
                        alt={item.name}
                        className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                      />
                      <div>
                        <p>{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-normal line-clamp-1">{item.description}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-amber-300">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-3">
                      {item.status === 'available' ? (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          มีสินค้า
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          สินค้าหมด
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                        title="แก้ไขอุปกรณ์"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                        title="ลบอุปกรณ์"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ShopItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitModal}
        initialData={editingItem}
      />
    </div>
  );
};
