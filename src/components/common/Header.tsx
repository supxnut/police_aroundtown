import React from 'react';
import { Shield, LogOut, Radio } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from './Badge';
import { NotificationBell } from '../notifications/NotificationBell';

export const Header: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="h-16 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Radio Status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <img
            src="/logo.png"
            alt="AROUND TOWN POLICE"
            className="h-10 w-auto object-contain drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]"
          />
          <div>
            <h1 className="text-sm font-extrabold text-slate-100 tracking-wider">AROUND TOWN POLICE</h1>
            <p className="text-[10px] text-slate-400 font-medium">POLICE MANAGEMENT MDT SYSTEM</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>ช่องสื่อสาร 1: ทำงานปกติ</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        <NotificationBell />

        {user && (
          <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
            <img
              src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={user.fullname}
              className="w-9 h-9 rounded-full object-cover border border-slate-700 shadow-md"
            />
            <div className="hidden md:block text-left">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-100">{user.fullname}</span>
                {isAdmin && (
                  <span className="px-1.5 py-0.2 text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                    ADMIN
                  </span>
                )}
              </div>
              <Badge rank={user.rank} />
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="ออกจากระบบ"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
