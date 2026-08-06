import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  Flame,
  Users,
  ShieldCheck,
  FileText,
  History,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';

export const Sidebar: React.FC = () => {
  const { isAdmin } = useAuth();
  const [alertCount, setAlertCount] = useState<number>(0);

  useEffect(() => {
    if (isAdmin) {
      const fetchAlertCount = async () => {
        try {
          const res = await api.get('/admin/case-alerts/count');
          if (res.data && res.data.success) {
            setAlertCount(res.data.count || 0);
          }
        } catch (err) {
          // silent fail
        }
      };

      fetchAlertCount();
      const interval = setInterval(fetchAlertCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const policeNav = [
    { name: 'แดชบอร์ดตำรวจ', path: '/police/dashboard', icon: LayoutDashboard },
    { name: 'กิจกรรมการปฏิบัติงาน', path: '/police/activities', icon: Flame },
  ];

  const adminNav = [
    { name: 'ภาพรวมระบบแอดมิน', path: '/admin/dashboard', icon: ShieldCheck },
    { name: 'ตรวจสอบความสอดคล้อง', path: '/admin/case-alerts', icon: AlertTriangle, badge: alertCount },
    { name: 'จัดการบุคลากร', path: '/admin/users', icon: Users },
    { name: 'จัดการกิจกรรมปฏิบัติงาน', path: '/admin/activities', icon: Flame },
    { name: 'บันทึกประวัติระบบ (Audit Logs)', path: '/admin/logs', icon: FileText },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Sidebar Logo Branding */}
      <div className="p-4 pb-2 flex items-center space-x-3 border-b border-slate-900/80">
        <img
          src="/logo.png"
          alt="AROUND TOWN POLICE"
          className="h-10 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]"
        />
        <div>
          <h2 className="text-xs font-black text-slate-100 tracking-wider">AROUND TOWN</h2>
          <p className="text-[10px] font-bold text-rose-400">POLICE MDT SYSTEM</p>
        </div>
      </div>

      <div className="p-4 space-y-6 flex-1">
        {/* Police Section */}
        <div>
          <h3 className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
            ระบบตำรวจ (POLICE MDT)
          </h3>
          <nav className="space-y-1">
            {policeNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40 shadow-md shadow-rose-950/40 font-bold'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Admin Section */}
        {isAdmin ? (
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-amber-500">
                ระบบจัดการผู้ดูแล (ADMIN)
              </h3>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            </div>
            <nav className="space-y-1">
              {adminNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md shadow-amber-900/20'
                          : 'text-slate-400 hover:text-amber-200/80 hover:bg-slate-900'
                      }`
                    }
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-4 h-4 shrink-0 text-amber-400/80" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && item.badge > 0 ? (
                      <span className="bg-red-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full animate-bounce">
                        {item.badge}
                      </span>
                    ) : null}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ) : (
          <div className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>สงวนสิทธิ์เฉพาะแอดมิน</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/50 text-[10px] text-slate-500 text-center">
        <p>AROUND TOWN POLICE MDT</p>
        <p className="mt-0.5 text-slate-600">ระบบจัดการสถานีตำรวจ</p>
      </div>
    </aside>
  );
};
