import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, KeyRound, Lock, LogIn, UserX } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

export const LoginPage: React.FC = () => {
  const { user, isAdmin, loading: authLoading, loginWithDiscordId } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [discordIdInput, setDiscordIdInput] = useState('');
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/police/dashboard', { replace: true });
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const res = await api.get('/auth/system-status');
        if (res.data && typeof res.data.hasUsers === 'boolean') {
          setHasUsers(res.data.hasUsers);
        }
      } catch (_) {
        // ignore
      }
    };
    checkSystemStatus();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = discordIdInput.trim();
    if (!cleanId) {
      setError('กรุณากรอก Discord ID เพื่อเข้าสู่ระบบ');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await loginWithDiscordId(cleanId);
    setLoading(false);

    if (result.success) {
      if (result.isAdmin) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/police/dashboard', { replace: true });
      }
    } else {
      setError(result.message || 'คุณไม่มีสิทธิ์ในการเข้าถึงระบบนี้ (ไม่พบ Discord ID ในระบบ)');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Subtle Police MDT Aesthetics */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-xl relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-2">
            <img
              src="/logo.png"
              alt="AROUND TOWN POLICE"
              className="h-24 w-auto object-contain filter drop-shadow-[0_0_16px_rgba(244,63,94,0.6)]"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-100 tracking-wider">AROUND TOWN POLICE</h1>
            <p className="text-xs uppercase font-bold text-rose-400 tracking-widest mt-1">POLICE MANAGEMENT MDT SYSTEM</p>
          </div>
        </div>

        {/* System Empty Alert Box if no officers exist */}
        {hasUsers === false && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start space-x-3 text-xs animate-in fade-in">
            <UserX className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-200">ยังไม่มีเจ้าหน้าที่ในระบบ</p>
              <p className="mt-0.5 text-amber-300/90 leading-relaxed">
                ยังไม่มีเจ้าหน้าที่ในระบบ กรุณาเพิ่มเจ้าหน้าที่ก่อนใช้งาน
              </p>
            </div>
          </div>
        )}

        {/* Security Notification Banner */}
        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-slate-200 flex items-start space-x-3">
          <Lock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-slate-200">
            ระบบตรวจสอบสิทธิ์ด้วย <strong className="text-rose-300">Discord ID</strong> กรุณากรอก Discord ID ของเจ้าหน้าที่เพื่อเข้าใช้งานระบบ
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start space-x-3 text-xs animate-in fade-in slide-in-from-top-2">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-200">ปฏิเสธการเข้าสู่ระบบ</p>
              <p className="mt-0.5 text-rose-300/90 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Main Discord ID Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Discord ID ของเจ้าหน้าที่:</span>
              <span className="text-[10px] text-slate-400 font-mono">18 หลัก</span>
            </label>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={discordIdInput}
                onChange={(e) => setDiscordIdInput(e.target.value)}
                placeholder="กรอก Discord ID ของคุณ..."
                required
                className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl py-3 pl-10 pr-3 text-xs text-slate-100 placeholder-slate-400 font-mono focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !discordIdInput.trim()}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs transition-all duration-200 shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบ MDT'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};


