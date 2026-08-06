import React from 'react';
import { ShoppingBag, Check, XCircle } from 'lucide-react';
import { ShopItem } from '../../types';
import { formatCurrency } from '../../utils/constants';

interface ShopCardProps {
  item: ShopItem;
}

export const ShopCard: React.FC<ShopCardProps> = ({ item }) => {
  const isAvailable = item.status === 'available';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all">
      <div>
        <div className="relative h-44 overflow-hidden bg-slate-950">
          <img
            src={item.image || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600'}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 right-3">
            {isAvailable ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                มีสินค้า
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 backdrop-blur-md">
                สินค้าหมด
              </span>
            )}
          </div>
        </div>

        <div className="p-5 space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-bold text-slate-100">{item.name}</h3>
            <span className="text-base font-black text-amber-400">{formatCurrency(item.price)}</span>
          </div>
          <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{item.description}</p>
        </div>
      </div>

      <div className="p-5 pt-0">
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>อุปกรณ์กรมตำรวจ</span>
          <span className="font-mono text-slate-300">รหัส: #{item.id}</span>
        </div>
      </div>
    </div>
  );
};
