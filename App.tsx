import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ClipboardList, ChefHat, Plus, Search, 
  PackageCheck, UserCheck, ChevronRight, 
  CheckCircle, X, RefreshCw,
  Hospital, Settings, QrCode as QrIcon, 
  Printer, ShieldAlert, Sparkles, BrainCircuit, Loader2,
  Bell, ChevronLeft, ArrowRightLeft, History, AlertCircle
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { MealLog, MealStatus, AgeGroup, DietTexture } from './types';

const STORAGE_KEY = 'mealsync_pro_v7_data';
const CLOUD_API = 'https://jsonblob.com/api/jsonBlob';

const App: React.FC = () => {
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<MealLog | null>(null);
  const [showLabel, setShowLabel] = useState<MealLog | null>(null);
  const [notif, setNotif] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [showQr, setShowQr] = useState(false);
  
  const [wardCode, setWardCode] = useState<string>(localStorage.getItem('ward_code') || '');
  const [cloudId, setCloudId] = useState<string>(localStorage.getItem('cloud_id') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3000);
  };

  const syncDown = useCallback(async (id: string = cloudId, silent = false) => {
    if (!id) return;
    if (!silent) setIsSyncing(true);
    try {
      const res = await fetch(`${CLOUD_API}/${id}`);
      if (!res.ok) throw new Error();
      const result = await res.json();
      if (result?.data) {
        setLogs(result.data);
        setIsOnline(true);
        if (!silent) notify("ข้อมูลอัปเดตเรียบร้อย");
      }
    } catch (e) {
      setIsOnline(false);
      if (!silent) notify("เชื่อมต่อฐานข้อมูลล้มเหลว", 'error');
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [cloudId]);

  const syncUp = useCallback(async (data: MealLog[] = logs) => {
    if (!cloudId || !wardCode) return;
    setIsSyncing(true);
    try {
      await fetch(`${CLOUD_API}/${cloudId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ward: wardCode, data, lastUpdate: new Date().toISOString() })
      });
      setIsOnline(true);
    } catch (e) {
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
    }
  }, [cloudId, wardCode, logs]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qId = params.get('ward_id');
    const qName = params.get('ward_name');

    if (qId && qName) {
      setCloudId(qId);
      setWardCode(qName);
      localStorage.setItem('cloud_id', qId);
      localStorage.setItem('ward_code', qName);
      window.history.replaceState({}, '', window.location.pathname);
      syncDown(qId);
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setLogs(JSON.parse(saved));
      if (cloudId) syncDown(cloudId, true);
    }
  }, [cloudId, syncDown]);

  useEffect(() => {
    if (cloudId) {
      const timer = setInterval(() => syncDown(cloudId, true), 20000);
      return () => clearInterval(timer);
    }
  }, [cloudId, syncDown]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  const initCloud = async () => {
    if (!wardCode) return alert("กรุณาระบุชื่อหอผู้ป่วย");
    setIsSyncing(true);
    try {
      const res = await fetch(CLOUD_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ward: wardCode, data: logs, lastUpdate: new Date().toISOString() })
      });
      const locationHeader = res.headers.get('Location');
      const id = locationHeader?.split('/').pop();
      if (id) {
        setCloudId(id);
        localStorage.setItem('cloud_id', id);
        notify("เชื่อมต่อคลาวด์สำเร็จ");
      }
    } catch (e) {
      notify("ไม่สามารถสร้างฐานข้อมูลคลาวด์ได้", 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddLog = (log: MealLog) => {
    const updated = [log, ...logs];
    setLogs(updated);
    setShowOrderForm(false);
    notify("ส่งออเดอร์เข้าครัวแล้ว");
    if (cloudId) syncUp(updated);
  };

  const handleUpdateStatus = (id: string, status: MealStatus, staff: string) => {
    const updated = logs.map(l => {
      if (l.id === id) {
        const item = { ...l, status };
        const time = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        if (status === MealStatus.KITCHEN_READY) { item.kitchenStaffName = staff; item.kitchenTimestamp = time; }
        if (status === MealStatus.DISPATCHED) { item.dispatchStaffName = staff; item.dispatchTimestamp = time; }
        if (status === MealStatus.DELIVERED) { item.deliveryStaffName = staff; item.deliveryTimestamp = time; }
        return item;
      }
      return l;
    });
    setLogs(updated);
    setSelectedLog(null);
    notify("อัปเดตสถานะสำเร็จ");
    if (cloudId) syncUp(updated);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(l => 
      l.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.hn.includes(searchTerm) ||
      l.roomNumber.includes(searchTerm)
    );
  }, [logs, searchTerm]);

  if (!activeRole) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl -ml-48 -mb-48"></div>

        <div className="w-full max-w-sm space-y-12 text-center z-10 animate-in fade-in duration-700">
          <div className="space-y-4">
            <div className="inline-flex p-6 bg-white rounded-[2rem] shadow-2xl ring-12 ring-blue-50/50">
              <Hospital className="w-14 h-14 text-blue-600" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">MealSync <span className="text-blue-600">Pro</span></h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[9px]">Hospital Food Logistics System</p>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            <RoleButton icon={<ClipboardList />} label="แผนกผู้ป่วย (Ward)" sub="สั่งอาหาร & ติดตาม" color="bg-blue-600" onClick={() => setActiveRole('ADMIN')} />
            <RoleButton icon={<ChefHat />} label="ฝ่ายโภชนาการ (Kitchen)" sub="จัดเตรียม & ปรุง" color="bg-orange-500" onClick={() => setActiveRole('KITCHEN')} />
            <RoleButton icon={<PackageCheck />} label="หน่วยเคลื่อนย้าย (Porter)" sub="รับอาหาร & ขนส่ง" color="bg-indigo-600" onClick={() => setActiveRole('DISPATCH')} />
            <RoleButton icon={<UserCheck />} label="บริการอาหาร (Service)" sub="เสิร์ฟถึงเตียงผู้ป่วย" color="bg-emerald-600" onClick={() => setActiveRole('DELIVERY')} />
            <RoleButton icon={<Settings />} label="ตั้งค่าระบบ" sub="Cloud Sync Setup" color="bg-slate-800" onClick={() => setActiveRole('SETUP')} />
          </div>

          {wardCode && (
            <div className={`p-4 rounded-3xl flex items-center justify-between text-white shadow-2xl ${isOnline ? 'bg-slate-900' : 'bg-red-500'} transition-all`}>
              <div className="flex items-center gap-3 ml-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-white'}`}></div>
                <span className="font-black text-[10px] uppercase tracking-widest">{wardCode}</span>
              </div>
              <button onClick={() => syncDown()} className={`p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all ${isSyncing ? 'animate-spin' : ''}`}>
                <RefreshCw className="w-4 h-4"/>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-24">
      <header className="bg-slate-900 text-white p-6 pt-14 sticky top-0 z-40 flex items-center justify-between rounded-b-[3rem] shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveRole(null)} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 active:scale-90 transition-all">
            <ChevronLeft className="w-6 h-6"/>
          </button>
          <div>
            <h2 className="font-black text-xl tracking-tight">{activeRole === 'SETUP' ? 'ตั้งค่าระบบ' : 'Dashboard'}</h2>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{activeRole}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           {isSyncing && <Loader2 className="w-6 h-6 animate-spin text-blue-400" />}
           <div className="relative p-2.5 bg-white/5 rounded-2xl border border-white/5">
              <Bell className="w-5 h-5 opacity-60" />
              {logs.some(l => l.status === MealStatus.ORDERED) && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-slate-900 animate-bounce"></span>}
           </div>
        </div>
      </header>

      <main className="p-5 max-w-lg mx-auto space-y-6 mt-4">
        {activeRole === 'SETUP' ? (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl space-y-8 animate-in slide-in-from-bottom-6 duration-500">
            <div className="space-y-3">
               <h3 className="font-black text-2xl text-slate-900 tracking-tight">Cloud Integration</h3>
               <p className="text-slate-400 text-xs font-bold leading-relaxed">เปิดการใช้งานฐานข้อมูลร่วมกันเพื่อให้ทุกแผนกได้รับข้อมูลที่ตรงกันแบบเรียลไทม์ผ่าน QR Code</p>
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Ward Name / Department</label>
              <input 
                value={wardCode} 
                onChange={e => setWardCode(e.target.value.toUpperCase())} 
                placeholder="ระบุชื่อหอผู้ป่วย เช่น 7A, ICU" 
                className="w-full p-6 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-[1.5rem] font-black text-3xl uppercase text-center transition-all outline-none" 
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={cloudId ? () => syncUp() : initCloud} 
                className="py-6 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition-all uppercase text-sm tracking-widest"
              >
                {cloudId ? 'Sync Updates to Cloud' : 'Initialize Cloud Connection'}
              </button>
              
              {cloudId && (
                <button 
                  onClick={() => setShowQr(true)} 
                  className="py-6 bg-slate-100 text-slate-700 font-black rounded-2xl flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest hover:bg-slate-200 active:scale-95 transition-all"
                >
                  <QrIcon className="w-5 h-5"/> Share QR Access
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-3">
               <div className="relative flex-1 group">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                 <input 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    placeholder="ค้นหา HN, เตียง, ชื่อ..." 
                    className="w-full pl-14 pr-6 py-5 bg-white rounded-3xl border-none shadow-sm focus:ring-4 ring-blue-500/10 font-bold transition-all text-sm" 
                 />
               </div>
               {activeRole === 'ADMIN' && (
                 <button 
                  onClick={() => setShowOrderForm(true)} 
                  className="p-5 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-200 active:scale-90 transition-all"
                 >
                   <Plus className="w-7 h-7"/>
                 </button>
               )}
            </div>

            <div className="space-y-4">
              {filteredLogs.length === 0 ? (
                <div className="py-24 text-center space-y-6">
                  <div className="inline-flex p-8 bg-slate-100 rounded-full text-slate-300"><History className="w-12 h-12 opacity-50"/></div>
                  <p className="text-slate-400 font-bold text-sm tracking-tight">ยังไม่มีรายการอาหารในขณะนี้</p>
                </div>
              ) : (
                filteredLogs.map(l => (
                  <div 
                    key={l.id} 
                    onClick={() => setSelectedLog(l)} 
                    className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50 flex items-center gap-5 cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-300 ${l.allergyItems || l.omitItems ? 'ring-2 ring-red-500 ring-offset-4' : ''}`}
                  >
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-xl italic ${l.allergyItems || l.omitItems ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'}`}>
                      {l.roomNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-800 truncate leading-none mb-2 text-lg">{l.patientName}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                         <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">{l.mealType}</span>
                         <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">HN: {l.hn}</span>
                      </div>
                    </div>
                    <StatusTag status={l.status} />
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>

      {/* Forms & Modals */}
      {showOrderForm && <OrderFormModal onSubmit={handleAddLog} onClose={() => setShowOrderForm(false)} />}
      {selectedLog && <MealDetailModal log={selectedLog} role={activeRole} onClose={() => setSelectedLog(null)} onUpdate={handleUpdateStatus} onLabel={(l:any) => {setShowLabel(l); setSelectedLog(null);}} />}
      {showLabel && <LabelPreview log={showLabel} onClose={() => setShowLabel(null)} />}
      {showQr && <QRDisplayModal code={cloudId} name={wardCode} onClose={() => setShowQr(false)} />}
      
      {/* Toast Notifications */}
      {notif && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-10 py-5 rounded-[2rem] font-black text-[11px] shadow-2xl animate-in slide-in-from-bottom-8 flex items-center gap-4 z-[100] border border-white/10 uppercase tracking-widest ${notif.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
          {notif.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-200" /> : <CheckCircle className="w-5 h-5 text-emerald-400" />} 
          {notif.msg}
        </div>
      )}
    </div>
  );
};

// --- Sub Components ---

const RoleButton = ({ icon, label, sub, color, onClick }: any) => (
  <button onClick={onClick} className="w-full p-5 bg-white rounded-[2rem] border border-slate-50 shadow-sm flex items-center gap-5 hover:bg-slate-50 active:scale-95 transition-all group overflow-hidden relative">
    <div className={`p-4 rounded-2xl text-white ${color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>{icon}</div>
    <div className="text-left">
      <span className="block font-black text-slate-800 text-[15px] tracking-tight">{label}</span>
      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{sub}</span>
    </div>
    <ChevronRight className="ml-auto opacity-20 w-6 h-6 group-hover:translate-x-1 group-hover:opacity-40 transition-all" />
  </button>
);

const StatusTag = ({ status }: { status: MealStatus }) => {
  const cfg = {
    [MealStatus.ORDERED]: { label: 'เตรียม', color: 'bg-blue-100 text-blue-700' },
    [MealStatus.KITCHEN_READY]: { label: 'เสร็จ', color: 'bg-orange-100 text-orange-700' },
    [MealStatus.DISPATCHED]: { label: 'ขนส่ง', color: 'bg-indigo-100 text-indigo-700' },
    [MealStatus.DELIVERED]: { label: 'เสิร์ฟ', color: 'bg-emerald-100 text-emerald-700' }
  };
  return <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${cfg[status].color}`}>{cfg[status].label}</span>;
};

const OrderFormModal = ({ onSubmit, onClose }: any) => {
  const [f, setF] = useState({ 
    hn: '', patientName: '', roomNumber: '', mealType: 'มื้อกลางวัน', 
    ageGroup: AgeGroup.ADULT, dietTexture: DietTexture.NORMAL,
    menuItems: '', omitItems: '', allergyItems: '', aiNote: '' 
  });
  const [verifying, setVerifying] = useState(false);

  const verifyWithAI = async () => {
    if (!f.menuItems) return;
    setVerifying(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `ตรวจสอบรายการอาหาร "${f.menuItems}" กับข้อจำกัดผู้ป่วยที่แพ้ "${f.allergyItems || 'ไม่มี'}" และต้องงด "${f.omitItems || 'ไม่มี'}" ให้คำแนะนำสั้นๆ ว่ากินได้ไหมและระวังอะไร สรุปไม่เกิน 12 คำภาษาไทย`,
      });
      setF({ ...f, aiNote: response.text || "ตรวจสอบเรียบร้อย" });
    } catch (e) {
      setF({ ...f, aiNote: "AI Busy" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[60] flex items-center justify-center p-5">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
          <h3 className="font-black text-xl uppercase tracking-tight flex items-center gap-3"><Plus className="w-6 h-6"/> สร้างใบสั่งอาหาร</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6"/></button>
        </div>
        <div className="p-8 space-y-5 max-h-[65vh] overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-2 gap-4">
             <InputField label="HN ผู้ป่วย" val={f.hn} set={(v:any)=>setF({...f, hn:v.toUpperCase()})} />
             <InputField label="เตียง / ห้อง" val={f.roomNumber} set={(v:any)=>setF({...f, roomNumber:v.toUpperCase()})} />
          </div>
          <InputField label="ชื่อ-นามสกุล ผู้ป่วย" val={f.patientName} set={(v:any)=>setF({...f, patientName:v})} />
          
          <div className="grid grid-cols-2 gap-4">
             <SelectField label="มื้ออาหาร" val={f.mealType} opt={['มื้อเช้า', 'มื้อกลางวัน', 'มื้อเย็น']} set={(v:any)=>setF({...f, mealType:v})} />
             <SelectField label="ลักษณะอาหาร" val={f.dietTexture} opt={Object.values(DietTexture)} set={(v:any)=>setF({...f, dietTexture:v})} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">รายการเมนูอาหาร</label>
              <button onClick={verifyWithAI} disabled={verifying} className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-2xl flex items-center gap-2 hover:bg-indigo-100 disabled:opacity-50 transition-all border border-indigo-100 shadow-sm">
                {verifying ? <Loader2 className="w-4 h-4 animate-spin"/> : <BrainCircuit className="w-4 h-4"/>} Nutri-Scan AI
              </button>
            </div>
            <textarea 
              value={f.menuItems} 
              onChange={e=>setF({...f, menuItems:e.target.value})} 
              className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-[1.5rem] h-28 focus:ring-4 ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none font-bold text-sm transition-all" 
              placeholder="กรอกรายการอาหาร..." 
            />
          </div>

          {f.aiNote && (
            <div className="p-4 bg-indigo-50 rounded-[1.5rem] text-[11px] font-bold text-indigo-900 flex gap-3 border border-indigo-100 animate-in fade-in zoom-in-95">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0"/> {f.aiNote}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <InputField label="ประวัติแพ้อาหาร" val={f.allergyItems} set={(v:any)=>setF({...f, allergyItems:v})} isRed />
            <InputField label="อาหารที่ต้องงด" val={f.omitItems} set={(v:any)=>setF({...f, omitItems:v})} isRed />
          </div>
        </div>
        <div className="p-8 pt-2">
           <button 
            onClick={() => onSubmit({...f, id: Date.now().toString(), status: MealStatus.ORDERED, orderTimestamp: new Date().toLocaleTimeString('th-TH')})} 
            className="w-full py-5 bg-blue-600 text-white font-black rounded-[1.5rem] shadow-2xl shadow-blue-200 active:scale-95 transition-all uppercase tracking-[0.2em] text-sm"
           >
             ยืนยันส่งครัว
           </button>
        </div>
      </div>
    </div>
  );
};

const InputField = ({ label, val, set, isRed }: any) => (
  <div className="space-y-1.5">
    <label className={`text-[10px] font-black uppercase tracking-widest ml-2 ${isRed ? 'text-red-500' : 'text-slate-400'}`}>{label}</label>
    <input 
      value={val} 
      onChange={e=>set(e.target.value)} 
      className={`w-full p-4 rounded-2xl border-2 font-black transition-all outline-none text-xs ${isRed ? 'bg-red-50 border-red-50 text-red-600 focus:border-red-500 focus:bg-white' : 'bg-slate-50 border-slate-50 focus:border-blue-500 focus:bg-white'}`} 
    />
  </div>
);

const SelectField = ({ label, val, opt, set }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label>
    <select 
      value={val} 
      onChange={e=>set(e.target.value)} 
      className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-50 focus:border-blue-500 focus:bg-white font-black text-[11px] outline-none transition-all"
    >
      {opt.map((o:any)=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const MealDetailModal = ({ log, role, onClose, onUpdate, onLabel }: any) => (
  <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[70] flex items-center justify-center p-5" onClick={onClose}>
    <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500" onClick={e=>e.stopPropagation()}>
      <div className="p-8 space-y-8 max-h-[85vh] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-start">
           <div className="w-20 h-20 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center text-3xl font-black italic shadow-2xl">
            {log.roomNumber}
           </div>
           <button onClick={onClose} className="p-3 bg-slate-100 rounded-full text-slate-400 active:scale-90 transition-all"><X className="w-6 h-6"/></button>
        </div>
        
        <div className="space-y-2">
           <h3 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">{log.patientName}</h3>
           <div className="flex gap-3">
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-blue-100">HN: {log.hn}</span>
              <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-slate-200">{log.mealType}</span>
           </div>
        </div>

        <div className="p-8 bg-slate-50 rounded-[2.5rem] space-y-5 border-2 border-slate-100 shadow-inner">
           <p className="text-2xl font-black italic text-slate-800 leading-relaxed tracking-tight">"{log.menuItems}"</p>
           <div className="flex flex-wrap gap-2">
            <span className="inline-block bg-white px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-500 border border-slate-200 uppercase tracking-widest">{log.dietTexture}</span>
           </div>
           
           {(log.allergyItems || log.omitItems) && (
             <div className="p-5 bg-red-600 text-white rounded-[1.5rem] space-y-3 shadow-xl shadow-red-200 animate-pulse border-2 border-red-400/30">
               <div className="flex items-center gap-3">
                 <ShieldAlert className="w-8 h-8 shrink-0"/> 
                 <p className="text-[10px] font-black uppercase tracking-widest leading-none">High Alert Warning</p>
               </div>
               <div className="space-y-1">
                 {log.allergyItems && <p className="font-black uppercase text-[15px]">แพ้: {log.allergyItems}</p>}
                 {log.omitItems && <p className="font-black uppercase text-[15px]">งด: {log.omitItems}</p>}
               </div>
             </div>
           )}
           
           {log.aiNote && <div className="p-4 bg-white rounded-[1.5rem] text-[11px] font-bold text-indigo-900 flex gap-3 border-2 border-indigo-100"><Sparkles className="w-5 h-5 text-indigo-400 shrink-0"/> {log.aiNote}</div>}
        </div>

        <div className="pt-2">
           {role === 'KITCHEN' && log.status === MealStatus.ORDERED && (
             <div className="grid grid-cols-1 gap-4">
               <button onClick={() => onUpdate(log.id, MealStatus.KITCHEN_READY, 'Chef โภชนาการ')} className="py-6 bg-orange-500 text-white font-black rounded-3xl uppercase tracking-[0.2em] shadow-xl shadow-orange-100 active:scale-95 transition-all text-sm">พร้อมจัดส่ง (Ready)</button>
               <button onClick={() => onLabel(log)} className="py-5 bg-slate-900 text-white font-black rounded-3xl flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest active:scale-95 transition-all"><Printer className="w-5 h-5"/> Print Label Sticker</button>
             </div>
           )}
           {role === 'DISPATCH' && log.status === MealStatus.KITCHEN_READY && (
             <button onClick={() => onUpdate(log.id, MealStatus.DISPATCHED, 'หน่วย Porter')} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all text-sm">รับอาหารไปส่ง (Dispatch)</button>
           )}
           {role === 'DELIVERY' && log.status === MealStatus.DISPATCHED && (
             <button onClick={() => onUpdate(log.id, MealStatus.DELIVERED, 'Staff หอผู้ป่วย')} className="w-full py-6 bg-emerald-600 text-white font-black rounded-3xl uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all text-sm">เสิร์ฟเรียบร้อย (Delivered)</button>
           )}
        </div>
      </div>
    </div>
  </div>
);

const LabelPreview = ({ log, onClose }: any) => (
  <div className="fixed inset-0 bg-white z-[100] p-8 flex flex-col items-center justify-center">
    <div className="w-[350px] border-[6px] border-black p-8 space-y-6 shadow-2xl print-card">
       <div className="border-b-[6px] border-black pb-6 flex justify-between items-end">
          <h1 className="text-8xl font-black italic">{log.roomNumber}</h1>
          <div className="text-right text-[11px] font-black uppercase leading-tight">HN: {log.hn}<br/>{log.mealType}</div>
       </div>
       <div className="space-y-2">
          <p className="text-xl font-black uppercase truncate">{log.patientName}</p>
          <p className="text-3xl font-black italic leading-tight tracking-tight">"{log.menuItems}"</p>
          <p className="text-[12px] font-black uppercase tracking-[0.1em] opacity-60 mt-2">ลักษณะ: {log.dietTexture}</p>
       </div>
       {(log.allergyItems || log.omitItems) && (
         <div className="bg-black text-white p-4 font-black text-center text-[15px] uppercase tracking-[0.2em] space-y-1">
           {log.allergyItems && <p>!! แพ้: {log.allergyItems} !!</p>}
           {log.omitItems && <p>!! งด: {log.omitItems} !!</p>}
         </div>
       )}
       <div className="text-[10px] font-black opacity-30 text-center uppercase pt-4 border-t-2 border-black/10 tracking-widest">MealSync Pro Logistics • {new Date().toLocaleTimeString('th-TH')}</div>
    </div>
    <div className="mt-14 flex gap-5 no-print">
       <button onClick={() => window.print()} className="px-12 py-5 bg-slate-900 text-white font-black rounded-2xl flex items-center gap-3 shadow-2xl uppercase text-[11px] tracking-widest active:scale-95 transition-all"><Printer className="w-5 h-5"/> PRINT LABEL</button>
       <button onClick={onClose} className="px-12 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl uppercase text-[11px] tracking-widest active:scale-95 transition-all">BACK</button>
    </div>
  </div>
);

const QRDisplayModal = ({ code, name, onClose }: any) => (
  <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[80] flex items-center justify-center p-8" onClick={onClose}>
    <div className="bg-white p-12 rounded-[4rem] text-center space-y-8 w-full max-w-sm animate-in zoom-in-95 shadow-2xl" onClick={e=>e.stopPropagation()}>
      <div className="space-y-2">
        <h3 className="text-3xl font-black uppercase tracking-tight">Access Link</h3>
        <p className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em]">WARD: {name}</p>
      </div>
      <div className="flex justify-center p-8 bg-slate-50 rounded-[3rem] border-4 border-slate-100 overflow-hidden shadow-inner" ref={el => {
        if (el && !el.innerHTML && (window as any).QRCode) {
          const url = `${window.location.origin}${window.location.pathname}?ward_id=${code}&ward_name=${name}`;
          new (window as any).QRCode(el, { text: url, width: 220, height: 220, colorDark : "#0f172a", colorLight : "#f8fafc" });
        }
      }}></div>
      <p className="text-[10px] text-slate-400 font-bold px-4 leading-relaxed italic">"สแกน QR Code นี้ด้วยมือถือของแผนกอื่นเพื่อเชื่อมต่อฐานข้อมูลร่วมกัน"</p>
      <button onClick={onClose} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all">Close</button>
    </div>
  </div>
);

export default App;
