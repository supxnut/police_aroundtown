import React, { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import api from '../../api/axios';
import { ShopItem } from '../../types';
import { ShopCard } from '../../components/police/ShopCard';
import toast from 'react-hot-toast';

export const PoliceShopPage: React.FC = () => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/shop');
      if (res.data.success) {
        setItems(res.data.items);
      }
    } catch {
      toast.error('Failed to load shop equipment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <ShoppingBag className="w-6 h-6 text-rose-400" />
            <span>คลังอุปกรณ์และยุทธภัณฑ์ตำรวจ</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            เรียกดูยุทธภัณฑ์ ชุดเกราะ อาวุธ และอุปกรณ์เบิกรถปฏิบัติการของสถานีตำรวจ
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">กำลังโหลดรายการอุปกรณ์...</div>
      ) : items.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-xs">
          ไม่มีรายการอุปกรณ์ในร้านค้าในขณะนี้
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <ShopCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
