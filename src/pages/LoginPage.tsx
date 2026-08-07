import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, KeyRound, Lock, LogIn, UserX } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

export const LoginPage: React.FC = () => {
  const { user, isAdmin, loading: authLoading, loginWithDiscordId, checkAuth } = useAuth();
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

    // Listen for OAuth success message from popup window if opened via OAuth redirect
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'DISCORD_AUTH_SUCCESS' && event.data.token) {
        localStorage.setItem('auth_token', event.data.token);
        checkAuth();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkAuth]);

  const handleDiscordOAuthLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/auth/discord/url');
      if (res.data && res.data.success && res.data.url) {
        window.location.href = res.data.url;
      } else if (res.data && !res.data.configured) {
        setError('ยังไม่ได้ตั้งค่า DISCORD_CLIENT_ID และ DISCORD_CLIENT_SECRET ในไฟล์ระบบ');
      } else {
        setError(res.data.message || 'ไม่สามารถเชื่อมต่อ Discord OAuth2 ได้ในขณะนี้');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Discord OAuth2');
    } finally {
      setLoading(false);
    }
  };

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
                ยังไม่มีเจ้าหน้าที่ในระบบ กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มข้อมูลเจ้าหน้าที่
              </p>
            </div>
          </div>
        )}

        {/* Security Notification Banner */}
        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-slate-200 flex items-start space-x-3">
          <Lock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-slate-200">
            ระบบตรวจสอบสิทธิ์ด้วย <strong className="text-rose-300">Discord OAuth2</strong> กรุณาเข้าสู่ระบบเพื่อยืนยันตัวตนเจ้าหน้าที่
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

        {/* Discord OAuth2 Button */}
        <div className="space-y-4 pt-2">
          <button
            type="button"
            onClick={handleDiscordOAuthLogin}
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-extrabold text-xs transition-all duration-200 shadow-lg shadow-[#5865F2]/30 flex items-center justify-center space-x-3 group disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-5 h-5 fill-current text-white group-hover:scale-110 transition-transform" viewBox="0 0 127.14 96.36">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a74.57,74.57,0,0,0,64.3,0c.87.68,1.76,1.36,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c2.64-27.38-4.51-51.11-18.83-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.91,96.12,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
            <span>{loading ? 'กำลังเชื่อมต่อ Discord...' : 'Login with Discord'}</span>
          </button>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider absolute">หรือเข้าใช้งานด้วย Discord ID</span>
          </div>

          {/* Direct Discord ID Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Discord ID ของเจ้าหน้าที่:</span>
                <span className="text-[10px] text-slate-400 font-mono">18-19 หลัก</span>
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
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs transition-all duration-200 shadow-lg shadow-rose-600/20 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบด้วย Discord ID'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};




