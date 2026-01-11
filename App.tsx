import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ClipboardList, ChefHat, Plus, Search, ArrowLeft, 
  PackageCheck, UserCheck, ChevronRight, 
  CheckCircle, X, RefreshCw,
  Hospital, Settings, Wifi, WifiOff, QrCode as QrIcon, 
  Printer, ShieldAlert, Sparkles, BrainCircuit, Loader2,
  FileText, Trash2, Paperclip
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { MealLog, MealStatus, AgeGroup, DietTexture, Attachment } from './types';

const STORAGE_KEY = 'hospital_meal_v25_stable';
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
      if (result && result.data) {
        setLogs(prev => {
          if (JSON.stringify(result.data) !== JSON.stringify(prev)) {
            return result.data;
          }
          return prev;
        });
        setOnlineStatus(true);
        if (!silent) notify("อัปเดตข้อมูลแล้ว");
      }
    } catch (e) {
      setOnlineStatus(false);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [cloudId]);

  const pushToCloud = useCallback(async (customLogs?: MealLog[]) => {
    if (!wardCode || !cloudId) return;
    const dataToSend = customLogs || logs;
    setIsSyncing(true);
    try {
      const res = await fetch(`${CLOUD_API}/${cloudId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ward: wardCode, data: dataToSend, lastUpdate: new Date().toISOString() })
      });
      if (res.ok) setOnlineStatus(true);
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
      notify(`เชื่อมวอร์ด ${sharedWardName} แล้ว`);
      pullFromCloud(sharedCloudId);
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setLogs(JSON.parse(saved));
      if (cloudId) pullFromCloud(cloudId, true);
    }
  }, [cloudId, pullFromCloud]);

  useEffect(() => {
    if (cloudId) {
      const interval = setInterval(() => pullFromCloud(cloudId, true), 30000);
      return () => clearInterval(interval);
    }
  }, [cloudId, pullFromCloud]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  const handleInitialSetup = async () => {
    if (!wardCode) { alert("กรุณาระบุชื่อวอร์ด"); return; }
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
        notify("Cloud พร้อมใช้งาน");
      }
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ Cloud");
    } finally {
      setIsSyncing(false);
    }
  };

  const addLog = (newLog: MealLog) => {
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    setShowOrderForm(false);
    notify("ส่งรายการอาหารถึงครัวแล้ว");
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

  const handleUpdateAttachments = (logId: string, attachments: Attachment[]) => {
    const updatedLogs = logs.map(l => l.id === logId ? { ...l, attachments } : l);
    setLogs(updatedLogs);
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
      <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 text-center animate-in fade-in duration-500">
          <div className="inline-flex p-5 bg-white rounded-3xl shadow-xl border-4 border-white">
            <Hospital className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">MealSync<span className="text-blue-600">Pro</span></h1>
          
          <div className="grid grid-cols-1 gap-3 pt-4">
            <RoleCard icon={<ClipboardList />} label="ฝ่ายสั่งอาหาร (Admin)" color="blue" onClick={() => setActiveRole('ADMIN')} />
            <RoleCard icon={<ChefHat />} label="แผนกครัว (Kitchen)" color="orange" onClick={() => setActiveRole('KITCHEN')} />
            <RoleCard icon={<PackageCheck />} label="ฝ่ายนำส่ง (Courier)" color="indigo" onClick={() => setActiveRole('DISPATCH')} />
            <RoleCard icon={<UserCheck />} label="พนักงานบริการ (Service)" color="green" onClick={() => setActiveRole('DELIVERY')} />
            <RoleCard icon={<Settings />} label="ตั้งค่าระบบ Cloud" color="slate" onClick={() => setActiveRole('VIEWER')} />
          </div>

          {wardCode && (
            <div className={`mt-8 p-4 rounded-2xl flex items-center justify-between shadow-lg ${onlineStatus ? 'bg-blue-600' : 'bg-red-500'} text-white transition-all`}>
              <div className="flex items-center gap-3">
                {onlineStatus ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5 animate-pulse" />}
                <p className="font-bold uppercase tracking-widest leading-none">{wardCode}</p>
              </div>
              <button onClick={() => pullFromCloud()} className={`p-2 bg-white/20 rounded-full ${isSyncing ? 'animate-spin' : ''}`}>
                <RefreshCw className="w-4 h-4" />
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
    VIEWER: { title: 'Config', color: 'bg-slate-900' }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-32">
      <header className={`${roleConfigs[activeRole].color} text-white px-6 py-6 sticky top-0 z-50 shadow-xl flex items-center justify-between rounded-b-3xl`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveRole(null)} className="p-2 bg-white/20 rounded-xl"><ArrowLeft className="w-6 h-6" /></button>
          <div className="text-left">
            <h2 className="font-black text-xl italic uppercase leading-none">{roleConfigs[activeRole].title}</h2>
            {wardCode && <p className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-widest">{wardCode}</p>}
          </div>
        </div>
        <button onClick={() => pullFromCloud()} className={`p-2 bg-white/20 rounded-full ${isSyncing ? 'animate-spin' : ''}`}>
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      <main className="p-4 max-w-2xl mx-auto w-full space-y-4">
        {activeRole !== 'VIEWER' && (
          <div className="grid grid-cols-4 gap-2">
            <StatCard label="รอทำ" value={stats.ordered} color="text-blue-600" />
            <StatCard label="รอส่ง" value={stats.ready} color="text-orange-500" />
            <StatCard label="ส่งแล้ว" value={stats.delivering} color="text-indigo-600" />
            <StatCard label="เสิร์ฟ" value={stats.done} color="text-green-600" />
          </div>
        )}

        {activeRole === 'VIEWER' && (
          <div className="bg-white p-6 rounded-3xl shadow-lg space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">ชื่อวอร์ด / แผนก</label>
              <input placeholder="เช่น ICU-2" className="w-full p-4 bg-slate-50 rounded-2xl font-black text-2xl text-center uppercase border-none outline-none focus:ring-2 ring-blue-500" value={wardCode} onChange={e => {setWardCode(e.target.value.toUpperCase()); localStorage.setItem('ward_code', e.target.value.toUpperCase());}} />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={cloudId ? () => pushToCloud() : handleInitialSetup} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold uppercase shadow-lg active:scale-95 transition-all">
                {cloudId ? 'Sync Cloud Now' : 'Start Sync System'}
              </button>
              {cloudId && <button onClick={() => setShowQr(true)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold uppercase flex items-center justify-center gap-2 shadow-lg"><QrIcon className="w-5 h-5"/> Share QR Access</button>}
            </div>
          </div>
        )}

        {activeRole === 'ADMIN' && (
          <button onClick={() => setShowOrderForm(true)} className="w-full py-8 bg-white border-2 border-dashed border-blue-200 rounded-3xl flex flex-col items-center gap-1 text-blue-600 font-bold hover:bg-blue-50 transition-all active:scale-95">
            <Plus className="w-8 h-8" />
            <span className="uppercase italic tracking-tight">เพิ่มใบสั่งอาหารใหม่</span>
          </button>
        )}

        {activeRole !== 'VIEWER' && (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
            <input type="text" placeholder="ค้นหาชื่อ, HN, ห้อง..." className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-none outline-none shadow-sm focus:ring-2 ring-blue-500 transition-all font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        )}

        <div className="space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-20 text-slate-300 font-bold italic uppercase tracking-widest">No Data found</div>
          ) : (
            filteredLogs.map(log => {
              const isUrgent = log.allergyItems || log.omitItems;
              return (
                <div key={log.id} onClick={() => setSelectedLog(log)} className={`bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer active:scale-95 transition-all ${isUrgent ? 'urgent-glow' : ''}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${isUrgent ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{log.roomNumber}</div>
                  <div className="flex-1 min-w-0 text-left">
                    <span className="font-bold text-slate-800 truncate block leading-none mb-1">{log.patientName}</span>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">HN: {log.hn} • {log.mealType}</p>
                  </div>
                  <StatusBadge status={log.status} />
                </div>
              );
            })
          )}
        </div>
      </main>

      {showOrderForm && <OrderForm onSubmit={addLog} onClose={() => setShowOrderForm(false)} />}
      {selectedLog && <DetailModal log={selectedLog} role={activeRole} onClose={() => setSelectedLog(null)} onUpdate={updateStatus} onUpdateAttachments={handleUpdateAttachments} onShowLabel={l => {setSelectedLog(null); setShowLabel(l);}} />}
      {showLabel && <LabelPrint log={showLabel} onClose={() => setShowLabel(null)} />}
      
      {showQr && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[100] flex items-center justify-center p-6" onClick={() => setShowQr(false)}>
          <div className="bg-white p-8 rounded-3xl text-center space-y-6 w-full max-w-sm animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold uppercase tracking-widest">Ward Sharing QR</h3>
            <div className="flex justify-center p-4 bg-white rounded-xl shadow-inner overflow-hidden" ref={el => {
              if (el && !el.innerHTML && typeof (window as any).QRCode !== 'undefined') {
                new (window as any).QRCode(el, { text: `${window.location.origin}${window.location.pathname}?ward_id=${cloudId}&ward_name=${wardCode}`, width: 220, height: 220 });
              }
            }}></div>
            <button onClick={() => setShowQr(false)} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl uppercase tracking-widest">Close</button>
          </div>
        </div>
      )}

      {successMsg && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-full font-bold shadow-2xl z-[200] flex items-center gap-2 animate-in slide-in-from-bottom-5"><CheckCircle className="w-5 h-5 text-green-400" /> {successMsg}</div>}
    </div>
  );
};

const StatCard = ({ label, value, color }: any) => (
  <div className="bg-white p-3 rounded-2xl text-center shadow-sm border border-slate-100 flex flex-col justify-center min-h-[70px]">
    <p className={`text-xl font-black ${color} leading-none`}>{value}</p>
    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 leading-none">{label}</p>
  </div>
);

const RoleCard = ({ icon, label, color, onClick }: any) => {
  const themes: any = { 
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    orange: 'text-orange-600 bg-orange-50 border-orange-100',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    green: 'text-green-600 bg-green-50 border-green-100',
    slate: 'text-slate-600 bg-slate-50 border-slate-100'
  };
  return (
    <button onClick={onClick} className={`p-5 rounded-2xl flex items-center gap-4 transition-all border shadow-sm w-full active:scale-95 ${themes[color]}`}>
      <div className="p-3 bg-white rounded-xl shadow-sm">{icon}</div>
      <span className="font-bold text-slate-800 uppercase tracking-tight italic">{label}</span>
      <ChevronRight className="ml-auto opacity-20" />
    </button>
  );
};

const StatusBadge = ({ status }: any) => {
  const cfg: any = {
    ORDERED: { label: 'รอทำ', color: 'bg-blue-100 text-blue-700' },
    KITCHEN_READY: { label: 'รอส่ง', color: 'bg-orange-100 text-orange-700' },
    DISPATCHED: { label: 'กำลังส่ง', color: 'bg-indigo-100 text-indigo-700' },
    DELIVERED: { label: 'เสิร์ฟแล้ว', color: 'bg-green-100 text-green-700' }
  };
  return <span className={`px-2 py-1 rounded-lg text-[8px] font-bold uppercase ${cfg[status].color}`}>{cfg[status].label}</span>;
};

const OrderForm = ({ onSubmit, onClose }: any) => {
  const [f, setF] = useState({ 
    hn: '', patientName: '', roomNumber: '', 
    mealType: 'มื้อเช้า', ageGroup: AgeGroup.ADULT, dietTexture: DietTexture.NORMAL,
    menuItems: '', omitItems: '', allergyItems: '', adminName: 'Staff', aiNote: '' 
  });
  const [isAiLoading, setIsAiLoading] = useState(false);

  const checkWithAI = async () => {
    if (!f.menuItems) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `ตรวจสอบโภชนาการสั้นๆ 1 ประโยค (ไทย): เมนู ${f.menuItems}, เนื้อ ${f.dietTexture}, งด ${f.omitItems}, แพ้ ${f.allergyItems}.`,
      });
      setF({ ...f, aiNote: response.text || "ตรวจสอบความเหมาะสมแล้ว" });
    } catch (e) {
      setF({ ...f, aiNote: "AI analysis unavailable" });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] p-4 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-5">
        <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
          <h3 className="font-bold text-xl uppercase italic tracking-tight">เพิ่มใบสั่งอาหาร</h3>
          <button onClick={onClose} className="p-2 bg-white/20 rounded-full"><X /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto bg-slate-50 text-left no-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="HN" value={f.hn} onChange={(v:any)=>setF({...f, hn:v})}/>
            <FormInput label="Room" value={f.roomNumber} onChange={(v:any)=>setF({...f, roomNumber:v})}/>
          </div>
          <FormInput label="ชื่อผู้ป่วย" value={f.patientName} onChange={(v:any)=>setF({...f, patientName:v})}/>
          <div className="grid grid-cols-3 gap-2">
            <SelectInput label="มื้อ" value={f.mealType} options={['มื้อเช้า', 'กลางวัน', 'มื้อเย็น']} onChange={(v:any)=>setF({...f, mealType:v})}/>
            <SelectInput label="เนื้อ" value={f.dietTexture} options={Object.values(DietTexture)} onChange={(v:any)=>setF({...f, dietTexture:v as DietTexture})}/>
            <SelectInput label="กลุ่ม" value={f.ageGroup} options={[AgeGroup.ADULT, AgeGroup.CHILD]} onChange={(v:any)=>setF({...f, ageGroup:v as AgeGroup})}/>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">เมนูอาหาร</label>
              <button onClick={checkWithAI} disabled={isAiLoading} className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full flex items-center gap-1 active:scale-95 transition-all">
                {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />} AI ตรวจ
              </button>
            </div>
            <textarea placeholder="รายการเมนู..." className="w-full p-4 bg-white rounded-xl h-24 border border-slate-200 outline-none focus:ring-2 ring-blue-500 shadow-inner" value={f.menuItems} onChange={e=>setF({...f, menuItems:e.target.value})}/>
          </div>
          {f.aiNote && <div className="p-3 bg-indigo-50 rounded-xl text-[10px] italic text-indigo-900 border border-indigo-100 flex gap-2 animate-in fade-in"><Sparkles className="w-4 h-4 text-indigo-400 shrink-0"/> {f.aiNote}</div>}
          <div className="p-4 bg-red-50 rounded-2xl space-y-3 border border-red-100">
             <FormInput label="งด (OMIT)" value={f.omitItems} onChange={(v:any)=>setF({...f, omitItems:v})} isRed />
             <FormInput label="แพ้ (ALLERGY)" value={f.allergyItems} onChange={(v:any)=>setF({...f, allergyItems:v})} isRed />
          </div>
        </div>
        <div className="p-6 bg-white border-t">
          <button onClick={() => onSubmit({...f, id: Date.now().toString(), status: MealStatus.ORDERED, orderTimestamp: new Date().toLocaleString('th-TH'), orderNumber: 'ORD-'+Math.floor(Math.random()*9000), attachments: []})} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg uppercase tracking-widest active:scale-95 transition-transform">Confirm Order</button>
        </div>
      </div>
    </div>
  );
};

const FormInput = ({ label, value, onChange, isRed }: any) => (
  <div className="space-y-1">
    <label className={`text-[9px] font-bold uppercase ml-1 ${isRed ? 'text-red-500' : 'text-slate-400'}`}>{label}</label>
    <input className={`w-full p-3 rounded-xl font-bold border outline-none ${isRed ? 'bg-white border-red-200 text-red-600' : 'bg-white border-slate-200 shadow-sm'}`} value={value} onChange={e=>onChange(e.target.value)}/>
  </div>
);

const SelectInput = ({ label, value, options, onChange }: any) => (
  <div className="space-y-1">
    <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 leading-none">{label}</label>
    <select className="w-full p-3 bg-white rounded-xl font-bold border border-slate-200 text-[10px] outline-none" value={value} onChange={e=>onChange(e.target.value)}>
      {options.map((opt:string)=><option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const DetailModal = ({ log, role, onClose, onUpdate, onUpdateAttachments, onShowLabel }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      const newAttachment: Attachment = { id: Date.now().toString(), name: file.name, type: file.type, data: base64Data };
      onUpdateAttachments(log.id, [...(log.attachments || []), newAttachment]);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="p-8 space-y-6 text-left overflow-y-auto max-h-[90vh] no-scrollbar">
          <div className="flex justify-between items-start">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl font-black shadow-inner italic">{log.roomNumber}</div>
            <button onClick={onClose} className="p-3 bg-slate-50 rounded-full text-slate-400"><X /></button>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 italic uppercase leading-none">{log.patientName}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">HN: {log.hn} • {log.mealType}</p>
          </div>
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 shadow-inner">
            <div className="text-[10px] font-bold text-blue-600 uppercase bg-blue-100 w-fit px-2 py-1 rounded-lg">{log.dietTexture}</div>
            <p className="text-xl font-bold text-slate-800 italic leading-snug">"{log.menuItems}"</p>
            {log.aiNote && <div className="p-3 bg-white/80 rounded-xl text-[9px] italic text-indigo-900 border border-indigo-50 flex gap-2"><Sparkles className="w-4 h-4 text-indigo-400 shrink-0"/> {log.aiNote}</div>}
            {(log.omitItems || log.allergyItems) && (
              <div className="space-y-2 pt-4 border-t border-slate-200">
                {log.omitItems && <div className="text-[10px] font-bold text-red-600">⚠️ OMIT: {log.omitItems}</div>}
                {log.allergyItems && <div className="p-3 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase flex items-center gap-2 animate-pulse shadow-lg"><ShieldAlert className="w-4 h-4"/> ALLERGY: {log.allergyItems}</div>}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase text-slate-400 italic">Attachments</h4>
              <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full active:scale-95 transition-all">+ Add File</button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {log.attachments?.map((file) => (
                <div key={file.id} className="bg-slate-50 rounded-xl p-2 flex items-center gap-2 border shadow-sm">
                   {file.type.startsWith('image/') ? <img src={file.data} className="w-8 h-8 rounded object-cover" /> : <FileText className="w-5 h-5 text-slate-400" />}
                   <p className="text-[8px] font-bold truncate flex-1">{file.name}</p>
                   <button onClick={() => onUpdateAttachments(log.id, log.attachments!.filter(a=>a.id!==file.id))} className="text-red-400 hover:scale-110 active:scale-90 transition-transform"><Trash2 className="w-3 h-3"/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            {role === 'KITCHEN' && log.status === MealStatus.ORDERED && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onUpdate(log.id, MealStatus.KITCHEN_READY, 'Staff')} className="py-5 bg-orange-500 text-white font-bold rounded-xl shadow-lg uppercase active:scale-95 transition-all">Ready to Ship</button>
                <button onClick={() => onShowLabel(log)} className="py-5 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95"><Printer className="w-4 h-4"/> Label</button>
              </div>
            )}
            {role === 'DISPATCH' && log.status === MealStatus.KITCHEN_READY && <button onClick={() => onUpdate(log.id, MealStatus.DISPATCHED, 'Courier')} className="w-full py-5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg uppercase active:scale-95">Pick Up Item</button>}
            {role === 'DELIVERY' && log.status === MealStatus.DISPATCHED && <button onClick={() => onUpdate(log.id, MealStatus.DELIVERED, 'Service')} className="w-full py-5 bg-green-600 text-white font-bold rounded-xl shadow-lg uppercase active:scale-95 transition-all">Delivered Successfully</button>}
          </div>
        </div>
      </div>
    </div>
  );
};

const LabelPrint = ({ log, onClose }: any) => (
  <div className="fixed inset-0 bg-white z-[300] flex flex-col items-center justify-center p-8">
    <div className="w-full max-w-[300px] bg-white border-2 border-black p-6 space-y-4 text-black text-left relative shadow-2xl">
      <div className="border-b-2 border-black pb-4">
        <h4 className="text-5xl font-black italic">{log.roomNumber}</h4>
        <p className="text-lg font-bold mt-1 uppercase">{log.patientName}</p>
        <p className="text-xs font-bold opacity-60">HN: {log.hn}</p>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase bg-black text-white px-2 py-0.5 w-fit leading-none mb-1">{log.mealType}</p>
        <p className="text-lg font-bold italic leading-tight py-1">"{log.menuItems}"</p>
        <div className="text-[9px] font-bold uppercase">DIET: {log.dietTexture}</div>
      </div>
    </div>
    <div className="mt-8 flex gap-3 no-print">
      <button onClick={() => window.print()} className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg uppercase italic"><Printer className="w-5 h-5"/> Print</button>
      <button onClick={onClose} className="px-8 py-4 bg-slate-100 font-bold rounded-xl uppercase italic">Back</button>
    </div>
  </div>
);

export default App;
