import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 text-center space-y-6">
        <div className="inline-flex p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <ShieldAlert className="w-12 h-12" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-slate-100">จำกัดการเข้าถึง</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            คุณไม่มีสิทธิ์ในการเข้าถึงระบบส่วนนี้
          </p>
        </div>

        <p className="text-xs text-slate-500 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
          หากคุณเชื่อว่าเกิดข้อผิดพลาด โปรดติดต่อผู้บังคับบัญชา AROUND TOWN POLICE เพื่อตรวจสอบการลงทะเบียน Discord ID ของคุณ
        </p>

        <Button variant="primary" onClick={() => navigate('/login')} className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>กลับสู่หน้าล็อกอิน</span>
        </Button>
      </div>
    </div>
  );
};
