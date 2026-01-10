import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ClipboardList, ChefHat, Plus, Search, ArrowLeft, 
  PackageCheck, UserCheck, ChevronRight, 
  AlertTriangle, CheckCircle, X, RefreshCw,
  Hospital, Settings, Wifi, WifiOff, QrCode as QrIcon, 
  User, Baby, UtensilsCrossed, Printer, Copy,
  Info, ShieldAlert, Sparkles, BrainCircuit, Loader2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { MealLog, MealStatus, AgeGroup, DietTexture } from './types';

const STORAGE_KEY = 'hospital_meal_v16_final';
const CLOUD_API = 'https://jsonblob.com/api/jsonBlob'; 

const App: React.FC = () => {
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<MealLog | null>(null);
  const [showLabel, setShowLabel] = useState<MealLog | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  
  const [wardCode, setWardCode] = useState<string>(localStorage.getItem('ward_code') || '');
  const [cloudId, setCloudId] = useState<string>(localStorage.getItem('cloud_id') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<boolean>(true);

  const notify = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const pullFromCloud = useCallback(async (targetId: string | any = cloudId, silent = false) => {
    const id = typeof targetId === 'string' ? targetId : cloudId;
    if (!id) return;
    if (!silent) setIsSyncing(true);
    
    try {
      const response = await fetch(`${CLOUD_API}/${id}`);
      if (!response.ok) throw new Error("Fetch failed");
      const result = await response.json();
      if (result.data) {
        if (JSON.stringify(result.data) !== JSON.stringify(logs)) {
          setLogs(result.data);
        }
        setOnlineStatus(true);
        if (!silent) notify("ข้อมูลอัปเดตเรียบร้อย");
      }
    } catch (e) {
      setOnlineStatus(false);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [cloudId, logs]);

  const pushToCloud = useCallback(async (customLogs?: MealLog[]) => {
    if (!wardCode || !cloudId) return;
    const dataToSend = customLogs || logs;
    setIsSyncing(true);
    try {
      await fetch(`${CLOUD_API}/${cloudId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ward: wardCode, data: dataToSend, lastUpdate: new Date().toISOString() })
      });
      setOnlineStatus(true);
    } catch (e) {
      setOnlineStatus(false);
    } finally {
      setIsSyncing(false);
    }
  }, [cloudId, wardCode, logs]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedCloudId = params.get('ward_id');
    const sharedWardName = params.get('ward_name');

    if (sharedCloudId && sharedWardName) {
      setCloudId(sharedCloudId);
      setWardCode(sharedWardName);
      localStorage.setItem('cloud_id', sharedCloudId);
      localStorage.setItem('ward_code', sharedWardName);
      window.history.replaceState({}, document.title, window.location.pathname);
      notify(`เชื่อมต่อวอร์ด ${sharedWardName}`);
      pullFromCloud(sharedCloudId);
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setLogs(JSON.parse(saved));
      if (cloudId) pullFromCloud(cloudId, true);
    }
  }, []);

  useEffect(() => {
    if (!cloudId) return;
    const interval = setInterval(() => pullFromCloud(cloudId, true), 15000);
    return () => clearInterval(interval);
  }, [cloudId, pullFromCloud]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  const handleInitialSetup = async () => {
    if (!wardCode) { alert("กรุณาระบุชื่อวอร์ดก่อนบันทึก"); return; }
    setIsSyncing(true);
    try {
      const response = await fetch(CLOUD_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ward: wardCode, data: logs, lastUpdate: new Date().toISOString() })
      });
      const location = response.headers.get('Location');
      const newId = location?.split('/').pop();
      if (newId) {
        setCloudId(newId);
        localStorage.setItem('cloud_id', newId);
        setOnlineStatus(true);
        notify("เปิดใช้งาน Cloud Sync สำเร็จ");
      }
    } catch (e) {
      alert("ไม่สามารถสร้าง Cloud ID ได้");
    } finally {
      setIsSyncing(false);
    }
  };

  const addLog = (newLog: MealLog) => {
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    setShowOrderForm(false);
    notify("บันทึกข้อมูลเรียบร้อย");
    if (cloudId) pushToCloud(updatedLogs);
  };

  const updateStatus = (id: string, newStatus: MealStatus, staffName: string) => {
    const updatedLogs = logs.map(log => {
      if (log.id === id) {
        const updated = { ...log, status: newStatus };
        const now = new Date().toLocaleString('th-TH');
        if (newStatus === MealStatus.KITCHEN_READY) { updated.kitchenStaffName = staffName; updated.kitchenTimestamp = now; }
        else if (newStatus === MealStatus.DISPATCHED) { updated.dispatchStaffName = staffName; updated.dispatchTimestamp = now; }
        else if (newStatus === MealStatus.DELIVERED) { updated.deliveryStaffName = staffName; updated.deliveryTimestamp = now; }
        return updated;
      }
      return log;
    });
    setLogs(updatedLogs);
    notify("อัปเดตสถานะสำเร็จ");
    setSelectedLog(null);
    if (cloudId) pushToCloud(updatedLogs);
  };

  const filteredLogs = logs.filter(log => 
    log.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.hn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.roomNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    ordered: logs.filter(l => l.status === MealStatus.ORDERED).length,
    ready: logs.filter(l => l.status === MealStatus.KITCHEN_READY).length,
    delivering: logs.filter(l => l.status === MealStatus.DISPATCHED).length,
    done: logs.filter(l => l.status === MealStatus.DELIVERED).length
  };

  if (!activeRole) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-6 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px]">
        <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in duration-700 pb-12">
          <div className="text-center space-y-2">
            <div className="inline-flex p-5 bg-white rounded-[2.5rem] shadow-xl border-4 border-white ring-1 ring-blue-50 mb-4 transform hover:rotate-3 transition-transform">
              <Hospital className="w-12 h-12 text-blue-600" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">MealSync<span className="text-blue-600">Pro</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em]">Integrated Medical Logistics</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <RoleCard icon={<ClipboardList />} label="ฝ่ายจัดการ / สั่งอาหาร" color="blue" onClick={() => setActiveRole('ADMIN')} />
            <RoleCard icon={<ChefHat />} label="แผนกครัว / เตรียม" color="orange" onClick={() => setActiveRole('KITCHEN')} />
            <RoleCard icon={<PackageCheck />} label="เจ้าหน้าที่นำส่ง (Courier)" color="indigo" onClick={() => setActiveRole('DISPATCH')} />
            <RoleCard icon={<UserCheck />} label="พนักงานบริการ (Service)" color="green" onClick={() => setActiveRole('DELIVERY')} />
            <RoleCard icon={<Settings />} label="ตั้งค่าระบบ & Cloud Sync" color="slate" onClick={() => setActiveRole('VIEWER')} />
          </div>

          {wardCode && (
            <div className={`p-5 rounded-[2.5rem] flex items-center justify-between shadow-2xl border-4 border-white ${onlineStatus ? 'bg-blue-600' : 'bg-red-500'} text-white transition-colors`}>
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                  {onlineStatus ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5 animate-pulse" />}
                </div>
                <div className="text-left leading-tight">
                  <p className="text-[9px] font-black opacity-60 uppercase tracking-widest mb-1">Station</p>
                  <p className="text-lg font-black tracking-tight uppercase italic">{wardCode}</p>
                </div>
              </div>
              <button onClick={() => pullFromCloud()} className="p-3 bg-white/20 rounded-full active:scale-90 transition-transform">
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const roleConfigs: any = {
    ADMIN: { title: 'Admin Terminal', color: 'bg-blue-600' },
    KITCHEN: { title: 'Kitchen Hub', color: 'bg-orange-500' },
    DISPATCH: { title: 'Courier Port', color: 'bg-indigo-600' },
    DELIVERY: { title: 'Service Point', color: 'bg-green-600' },
    VIEWER: { title: 'System Setup', color: 'bg-slate-900' }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-32">
      <header className={`${roleConfigs[activeRole].color} text-white px-6 py-8 sticky top-0 z-50 shadow-2xl flex items-center justify-between rounded-b-[2.5rem] no-print transition-colors`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveRole(null)} className="p-3 bg-white/20 rounded-2xl hover:bg-white/30 transition-all"><ArrowLeft className="w-6 h-6" /></button>
          <div className="text-left">
            <h2 className="font-black text-xl leading-none italic tracking-tighter uppercase">{roleConfigs[activeRole].title}</h2>
            {wardCode && <p className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-widest">{wardCode}</p>}
          </div>
        </div>
        <button onClick={() => pullFromCloud()} disabled={isSyncing} className={`p-3 bg-white/20 rounded-full ${isSyncing ? 'animate-spin' : ''}`}>
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      <main className="p-4 max-w-2xl mx-auto w-full space-y-6 no-print">
        {activeRole !== 'VIEWER' && (
          <div className="grid grid-cols-4 gap-2">
            <StatCard label="รอเตรียม" value={stats.ordered} color="text-blue-600" />
            <StatCard label="รอส่ง" value={stats.ready} color="text-orange-500" />
            <StatCard label="ระหว่างนำส่ง" value={stats.delivering} color="text-indigo-600" />
            <StatCard label="เสิร์ฟแล้ว" value={stats.done} color="text-green-600" />
          </div>
        )}

        {activeRole === 'VIEWER' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 space-y-8 animate-in slide-in-from-bottom-4">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อวอร์ด / หน่วยงาน</label>
              <input placeholder="เช่น ICU-7, WARD-5" className="w-full p-6 bg-slate-50 rounded-[2rem] font-black text-3xl border-none outline-none focus:ring-4 ring-blue-50 transition-all text-center uppercase italic" value={wardCode} onChange={e => {setWardCode(e.target.value.toUpperCase()); localStorage.setItem('ward_code', e.target.value.toUpperCase());}} />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button onClick={cloudId ? () => pushToCloud() : handleInitialSetup} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-transform uppercase tracking-tight">
                {cloudId ? 'อัปเดตข้อมูลขึ้น Cloud' : 'บันทึก & เริ่มซิงค์ข้อมูล Cloud'}
              </button>
              {cloudId && (
                <>
                  <button onClick={() => setShowQr(true)} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-lg uppercase italic"><QrIcon className="w-5 h-5"/> โชว์ QR แชร์เครื่องอื่น</button>
                  <button onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?ward_id=${cloudId}&ward_name=${wardCode}`;
                    navigator.clipboard.writeText(url);
                    notify("คัดลอกลิงก์แชร์แล้ว");
                  }} className="w-full py-6 bg-slate-100 text-slate-500 rounded-[2rem] font-black flex items-center justify-center gap-3 uppercase text-xs border border-slate-200"><Copy className="w-4 h-4"/> คัดลอกลิงก์แชร์</button>
                </>
              )}
            </div>
          </div>
        )}

        {activeRole === 'ADMIN' && (
          <button onClick={() => setShowOrderForm(true)} className="w-full py-10 bg-white border-4 border-dashed border-blue-100 rounded-[3rem] flex flex-col items-center gap-2 text-blue-600 font-black hover:bg-blue-50 transition-all active:scale-[0.98] group">
            <div className="p-4 bg-blue-50 rounded-full group-hover:scale-110 transition-transform"><Plus className="w-8 h-8" /></div>
            <span className="text-xl italic uppercase tracking-tighter">สร้างใบสั่งอาหารใหม่</span>
          </button>
        )}

        {activeRole !== 'VIEWER' && (
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6" />
            <input type="text" placeholder="ค้นหา HN หรือ เลขห้อง..." className="w-full pl-16 pr-8 py-6 bg-white rounded-[2.2rem] border-none font-bold outline-none shadow-sm focus:ring-4 ring-blue-50 transition-all text-lg" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        )}

        <div className="space-y-3">
          {filteredLogs.length === 0 && <div className="py-20 opacity-20 text-center"><UtensilsCrossed className="w-16 h-16 mx-auto mb-2" /><p className="font-black italic uppercase">ไม่มีข้อมูลใบสั่ง</p></div>}
          {filteredLogs.map(log => {
            const isUrgent = log.allergyItems || log.omitItems;
            return (
              <div key={log.id} onClick={() => setSelectedLog(log)} className={`bg-white p-5 rounded-[2.2rem] border border-slate-100 shadow-sm cursor-pointer flex items-center gap-4 transition-all active:scale-[0.98] hover:shadow-md ${isUrgent ? 'urgent-glow' : ''}`}>
                <div className={`w-14 h-14 rounded-[1.8rem] flex items-center justify-center font-black text-xl shrink-0 shadow-inner ${isUrgent ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{log.roomNumber}</div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-800 text-lg block truncate italic">{log.patientName}</span>
                    {log.ageGroup === AgeGroup.CHILD && <Baby className="w-4 h-4 text-pink-500" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">HN: {log.hn} • {log.mealType}</span>
                    {isUrgent && <ShieldAlert className="w-3 h-3 text-red-500 animate-pulse" />}
                  </div>
                </div>
                <StatusBadge status={log.status} />
              </div>
            );
          })}
        </div>
      </main>

      {showOrderForm && <OrderForm onSubmit={addLog} onClose={() => setShowOrderForm(false)} />}
      {selectedLog && <DetailModal log={selectedLog} role={activeRole} onClose={() => setSelectedLog(null)} onUpdate={updateStatus} onShowLabel={l => {setSelectedLog(null); setShowLabel(l);}} />}
      {showLabel && <LabelPrint log={showLabel} onClose={() => setShowLabel(null)} />}

      {showQr && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6" onClick={() => setShowQr(false)}>
          <div className="bg-white p-10 rounded-[4rem] text-center space-y-8 w-full max-w-sm border-8 border-white shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black italic tracking-tighter uppercase">Sync Station Access</h3>
            <div className="flex justify-center p-6 bg-slate-50 rounded-[3rem] shadow-inner" id="qr-station" ref={el => {
              if (el && !el.innerHTML) {
                // @ts-ignore
                new QRCode(el, { text: `${window.location.origin}${window.location.pathname}?ward_id=${cloudId}&ward_name=${wardCode}`, width: 220, height: 220, colorDark: "#0f172a" });
              }
            }}></div>
            <div className="space-y-1">
              <p className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">{wardCode}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">สแกนเพื่อเชื่อมต่อวอร์ดนี้</p>
            </div>
            <button onClick={() => setShowQr(false)} className="w-full py-6 bg-slate-900 text-white font-black rounded-[2rem] active:scale-95 transition-transform uppercase italic">ปิดหน้านี้</button>
          </div>
        </div>
      )}

      {successMsg && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl animate-in slide-in-from-bottom-5 z-[200] flex items-center gap-3 border border-slate-700"><CheckCircle className="w-6 h-6 text-green-400" /> {successMsg}</div>}
    </div>
  );
};

const StatCard = ({ label, value, color }: any) => (
  <div className="bg-white p-3 rounded-[1.5rem] text-center shadow-sm border border-slate-100 flex flex-col justify-center min-h-[70px]">
    <p className={`text-xl font-black ${color} leading-none`}>{value}</p>
    <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mt-1 leading-tight">{label}</p>
  </div>
);

const RoleCard = ({ icon, label, color, onClick }: any) => {
  const themes: any = { 
    blue: 'text-blue-600 border-blue-50 hover:bg-blue-50',
    orange: 'text-orange-600 border-orange-50 hover:bg-orange-50',
    indigo: 'text-indigo-600 border-indigo-50 hover:bg-indigo-50',
    green: 'text-green-600 border-green-50 hover:bg-green-50',
    slate: 'text-slate-600 border-slate-50 hover:bg-slate-50'
  };
  return (
    <button onClick={onClick} className={`p-6 bg-white border-2 rounded-[2.5rem] flex items-center gap-5 transition-all active:scale-[0.97] group shadow-xl shadow-slate-200/50 ${themes[color]}`}>
      <div className="p-4 bg-slate-50 rounded-[1.5rem] group-hover:scale-110 transition-transform shadow-inner">{icon}</div>
      <span className="font-black text-lg text-slate-800 tracking-tight italic uppercase">{label}</span>
      <ChevronRight className="ml-auto opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
    </button>
  );
};

const StatusBadge = ({ status }: any) => {
  const cfg: any = {
    ORDERED: { label: 'รอทำ', color: 'bg-blue-50 text-blue-700' },
    KITCHEN_READY: { label: 'รอส่ง', color: 'bg-orange-50 text-orange-700' },
    DISPATCHED: { label: 'นำส่ง', color: 'bg-indigo-50 text-indigo-700' },
    DELIVERED: { label: 'สำเร็จ', color: 'bg-green-50 text-green-700' }
  };
  return <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase border border-current opacity-90 ${cfg[status].color}`}>{cfg[status].label}</span>;
};

const OrderForm = ({ onSubmit, onClose }: any) => {
  const [f, setF] = useState({ 
    hn: '', patientName: '', roomNumber: '', 
    mealType: 'มื้อเช้า', ageGroup: AgeGroup.ADULT, dietTexture: DietTexture.NORMAL,
    menuItems: '', omitItems: '', allergyItems: '', adminName: 'Staff', aiNote: '' 
  });
  const [isAiLoading, setIsAiLoading] = useState(false);

  const checkWithAI = async () => {
    if (!f.menuItems) { alert("กรุณาใส่เมนูอาหารก่อนตรวจสอบ"); return; }
    setIsAiLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `ในฐานะนักโภชนาการโรงพยาบาล ตรวจสอบความปลอดภัยของเมนูนี้สำหรับผู้ป่วย:
    เมนู: ${f.menuItems}
    เนื้อสัมผัสที่ระบุ: ${f.dietTexture}
    กลุ่มอายุ: ${f.ageGroup}
    สิ่งที่งด: ${f.omitItems || 'ไม่มี'}
    สิ่งที่แพ้: ${f.allergyItems || 'ไม่มี'}
    
    ให้คำแนะนำสั้นๆ 1-2 ประโยคว่าเหมาะสมหรือไม่ (ถ้าไม่เหมาะสมให้เตือนเป็นตัวหนา) และมีข้อควรระวังอะไรไหม (ภาษาไทย)`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setF({ ...f, aiNote: response.text || "ตรวจสอบสำเร็จแต่ไม่มีคำแนะนำเพิ่มเติม" });
    } catch (e) {
      setF({ ...f, aiNote: "ขออภัย ระบบ AI ไม่สามารถวิเคราะห์ได้ในขณะนี้" });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] p-4 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-20 border-8 border-white">
        <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
          <h3 className="font-black text-2xl tracking-tighter italic uppercase">Meal Requisition</h3>
          <button onClick={onClose} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X /></button>
        </div>
        <div className="p-8 space-y-4 overflow-y-auto no-scrollbar bg-slate-50/50 text-left">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="HN Number" value={f.hn} onChange={(v:any)=>setF({...f, hn:v})}/>
            <FormInput label="Room No." value={f.roomNumber} onChange={(v:any)=>setF({...f, roomNumber:v})}/>
          </div>
          <FormInput label="Patient Name" value={f.patientName} onChange={(v:any)=>setF({...f, patientName:v})}/>
          <div className="grid grid-cols-3 gap-2">
            <SelectInput label="Meal" value={f.mealType} options={['มื้อเช้า', 'มื้อกลางวัน', 'มื้อเย็น']} onChange={v=>setF({...f, mealType:v})}/>
            <SelectInput label="Age" value={f.ageGroup} options={[AgeGroup.ADULT, AgeGroup.CHILD]} onChange={v=>setF({...f, ageGroup:v as AgeGroup})}/>
            <SelectInput label="Texture" value={f.dietTexture} options={Object.values(DietTexture)} onChange={v=>setF({...f, dietTexture:v as DietTexture})}/>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Menu Items</label>
              <button onClick={checkWithAI} disabled={isAiLoading} className="text-[10px] font-black text-indigo-600 flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-full active:scale-95 transition-all">
                {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
                ตรวจทานด้วย AI
              </button>
            </div>
            <textarea placeholder="เช่น ข้าวต้มหมู, นมจืด..." className="w-full p-5 bg-white rounded-[1.8rem] font-bold h-24 border border-slate-100 outline-none focus:ring-4 ring-blue-50 shadow-inner" value={f.menuItems} onChange={e=>setF({...f, menuItems:e.target.value})}/>
          </div>
          
          {f.aiNote && (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3 animate-in fade-in duration-500">
               <Sparkles className="w-5 h-5 text-indigo-500 shrink-0" />
               <p className="text-[11px] font-medium text-indigo-900 italic leading-relaxed">{f.aiNote}</p>
            </div>
          )}

          <div className="p-5 bg-red-50 rounded-[2.5rem] space-y-3 border-2 border-red-100/50">
             <FormInput label="OMIT (งดเว้น)" value={f.omitItems} onChange={(v:any)=>setF({...f, omitItems:v})} isRed />
             <FormInput label="ALLERGY (แพ้)" value={f.allergyItems} onChange={(v:any)=>setF({...f, allergyItems:v})} isRed />
          </div>
        </div>
        <div className="p-8 border-t flex gap-4 bg-white">
          <button onClick={onClose} className="flex-1 font-black text-slate-400 uppercase text-xs italic">Cancel</button>
          <button onClick={() => onSubmit({...f, id: Date.now().toString(), status: MealStatus.ORDERED, orderTimestamp: new Date().toLocaleString('th-TH'), orderNumber: 'ORD-'+Math.floor(Math.random()*9000+1000)})} className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-[2rem] shadow-lg active:scale-95 transition-transform uppercase italic tracking-tighter text-lg">Confirm Order</button>
        </div>
      </div>
    </div>
  );
};

const FormInput = ({ label, value, onChange, isRed }: any) => (
  <div className="space-y-1">
    <label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${isRed ? 'text-red-500' : 'text-slate-400'}`}>{label}</label>
    <input className={`w-full p-4 rounded-[1.2rem] font-bold border-none outline-none transition-all ${isRed ? 'bg-white text-red-600 focus:ring-4 ring-red-50 shadow-inner' : 'bg-white focus:ring-4 ring-blue-50 shadow-sm border border-slate-100'}`} value={value} onChange={e=>onChange(e.target.value)}/>
  </div>
);

const SelectInput = ({ label, value, options, onChange }: any) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">{label}</label>
    <select className="w-full p-3 bg-white rounded-xl font-bold border border-slate-100 text-[10px] outline-none" value={value} onChange={e=>onChange(e.target.value)}>
      {options.map((opt:string)=><option key={opt}>{opt}</option>)}
    </select>
  </div>
);

const DetailModal = ({ log, role, onClose, onUpdate, onShowLabel }: any) => {
  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border-8 border-white" onClick={e => e.stopPropagation()}>
        <div className="p-10 space-y-8 text-left">
          <div className="flex justify-between items-start">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center text-4xl font-black shadow-inner border-2 border-white uppercase italic">{log.roomNumber}</div>
            <button onClick={onClose} className="p-4 bg-slate-50 rounded-full text-slate-400 active:scale-90 transition-transform"><X className="w-6 h-6" /></button>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h3 className="text-3xl font-black text-slate-900 leading-none italic tracking-tighter uppercase">{log.patientName}</h3>
              {log.ageGroup === AgeGroup.CHILD && <Baby className="w-8 h-8 text-pink-500" />}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">HN: {log.hn} • {log.mealType}</p>
          </div>

          <div className="p-8 bg-slate-50 rounded-[2.5rem] space-y-5 border border-slate-100 shadow-inner relative">
            <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50/50 w-fit px-3 py-1 rounded-full"><Info className="w-3 h-3"/> {log.dietTexture}</div>
            <p className="text-2xl font-black text-slate-800 leading-snug tracking-tight italic">"{log.menuItems}"</p>
            {log.aiNote && (
              <div className="p-4 bg-indigo-50/80 border border-indigo-100 rounded-2xl flex gap-3 italic text-[11px] text-indigo-900">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                {log.aiNote}
              </div>
            )}
            {(log.omitItems || log.allergyItems) && (
              <div className="space-y-2 pt-4 border-t border-slate-200">
                {log.omitItems && <div className="p-4 bg-red-50 rounded-2xl text-[10px] font-black text-red-600 border border-red-100 uppercase tracking-widest flex items-center gap-2 italic">⚠️ OMIT: {log.omitItems}</div>}
                {log.allergyItems && <div className="p-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest animate-pulse flex items-center gap-2 shadow-lg shadow-red-200"><ShieldAlert className="w-4 h-4"/> ALLERGY: {log.allergyItems}</div>}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-2">
            {role === 'KITCHEN' && log.status === MealStatus.ORDERED && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => onUpdate(log.id, MealStatus.KITCHEN_READY, 'Chef-Main')} className="py-6 bg-orange-500 text-white font-black text-xl rounded-[2rem] shadow-xl uppercase italic active:scale-95 transition-transform">Ready for Dispatch</button>
                <button onClick={() => onShowLabel(log)} className="py-6 bg-slate-900 text-white font-black text-xl rounded-[2rem] flex items-center justify-center gap-2 uppercase italic shadow-xl active:scale-95 transition-transform"><Printer className="w-5 h-5"/> Label</button>
              </div>
            )}
            {role === 'DISPATCH' && log.status === MealStatus.KITCHEN_READY && (
              <button onClick={() => onUpdate(log.id, MealStatus.DISPATCHED, 'Courier-Unit')} className="w-full py-7 bg-indigo-600 text-white font-black text-2xl rounded-[2.2rem] shadow-2xl uppercase italic tracking-widest active:scale-95 transition-transform">Start Delivery</button>
            )}
            {role === 'DELIVERY' && log.status === MealStatus.DISPATCHED && (
              <button onClick={() => onUpdate(log.id, MealStatus.DELIVERED, 'Service-Unit')} className="w-full py-7 bg-green-600 text-white font-black text-2xl rounded-[2.2rem] shadow-2xl uppercase italic tracking-widest active:scale-95 transition-transform">Confirm Served</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const LabelPrint = ({ log, onClose }: any) => (
  <div className="fixed inset-0 bg-white z-[300] flex flex-col items-center justify-center p-8 animate-in zoom-in-95">
    <div className="w-full max-w-[320px] bg-white border-4 border-black p-8 space-y-5 text-black text-left shadow-2xl relative">
      <div className="absolute top-4 right-4 text-[9px] font-black"># {log.orderNumber}</div>
      <div className="border-b-4 border-black pb-4">
        <h4 className="text-6xl font-black italic tracking-tighter">{log.roomNumber}</h4>
        <p className="text-xl font-black mt-2 uppercase">{log.patientName}</p>
        <p className="text-sm font-bold opacity-60">HN: {log.hn} ({log.ageGroup})</p>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <p className="text-sm font-black uppercase bg-black text-white px-3 py-1">{log.mealType}</p>
          <p className="text-[10px] font-bold opacity-50">{log.orderTimestamp}</p>
        </div>
        <p className="text-2xl font-black leading-tight italic py-2">"{log.menuItems}"</p>
        <div className="bg-slate-100 p-2 text-[10px] font-black uppercase">Diet: {log.dietTexture}</div>
      </div>
      {(log.allergyItems || log.omitItems) && (
        <div className="bg-black text-white p-4 rounded space-y-1">
          {log.allergyItems && <p className="text-xs font-black uppercase">🚨 ALLERGY: {log.allergyItems}</p>}
          {log.omitItems && <p className="text-xs font-black uppercase italic">⚠️ OMIT: {log.omitItems}</p>}
        </div>
      )}
    </div>
    <div className="mt-12 flex gap-4 no-print">
      <button onClick={() => window.print()} className="px-10 py-5 bg-blue-600 text-white font-black rounded-[2rem] flex items-center gap-3 shadow-xl active:scale-95 transition-transform uppercase italic"><Printer className="w-6 h-6"/> Print Label</button>
      <button onClick={onClose} className="px-10 py-5 bg-slate-100 font-black rounded-[2rem] uppercase italic">Close</button>
    </div>
  </div>
);

export default App;
