import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ClipboardList, ChefHat, Plus, Search, ArrowLeft, 
  PackageCheck, UserCheck, ChevronRight, 
  CheckCircle, X, RefreshCw,
  Hospital, Settings, Wifi, WifiOff, QrCode as QrIcon, 
  Baby, UtensilsCrossed, Printer, Copy,
  Info, ShieldAlert, Sparkles, BrainCircuit, Loader2,
  FileText, Image as ImageIcon, Trash2, Paperclip
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { MealLog, MealStatus, AgeGroup, DietTexture, Attachment } from './types';

const STORAGE_KEY = 'hospital_meal_v20_stable';
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
        if (!silent) notify("ซิงค์ข้อมูลสำเร็จ");
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
      notify(`เชื่อมต่อวอร์ด ${sharedWardName}`);
      pullFromCloud(sharedCloudId);
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setLogs(JSON.parse(saved));
      if (cloudId) pullFromCloud(cloudId, true);
    }
  }, [cloudId, pullFromCloud]);

  useEffect(() => {
    if (!cloudId) return;
    const interval = setInterval(() => pullFromCloud(cloudId, true), 15000);
    return () => clearInterval(interval);
  }, [cloudId, pullFromCloud]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  const handleInitialSetup = async () => {
    if (!wardCode) { alert("ระบุชื่อวอร์ด"); return; }
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
        notify("Cloud Sync พร้อมใช้งาน");
      }
    } catch (e) {
      alert("Error creating Cloud ID");
    } finally {
      setIsSyncing(false);
    }
  };

  const addLog = (newLog: MealLog) => {
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    setShowOrderForm(false);
    notify("บันทึกสำเร็จ");
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
      <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-6 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px]">
        <div className="w-full max-w-md space-y-6 text-center animate-in fade-in zoom-in duration-500">
          <div className="inline-flex p-5 bg-white rounded-[2.5rem] shadow-xl border-4 border-white transform hover:rotate-3 transition-transform">
            <Hospital className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">MealSync<span className="text-blue-600">Pro</span></h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em]">Healthcare Logistics</p>

          <div className="grid grid-cols-1 gap-3">
            <RoleCard icon={<ClipboardList />} label="ฝ่ายสั่งอาหาร (Admin)" color="blue" onClick={() => setActiveRole('ADMIN')} />
            <RoleCard icon={<ChefHat />} label="แผนกครัว (Kitchen)" color="orange" onClick={() => setActiveRole('KITCHEN')} />
            <RoleCard icon={<PackageCheck />} label="ฝ่ายนำส่ง (Courier)" color="indigo" onClick={() => setActiveRole('DISPATCH')} />
            <RoleCard icon={<UserCheck />} label="พนักงานบริการ (Service)" color="green" onClick={() => setActiveRole('DELIVERY')} />
            <RoleCard icon={<Settings />} label="ตั้งค่า Cloud" color="slate" onClick={() => setActiveRole('VIEWER')} />
          </div>

          {wardCode && (
            <div className={`p-5 rounded-[2.5rem] flex items-center justify-between shadow-2xl border-4 border-white ${onlineStatus ? 'bg-blue-600' : 'bg-red-500'} text-white transition-all`}>
              <div className="flex items-center gap-4 text-left">
                {onlineStatus ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5 animate-pulse" />}
                <div>
                  <p className="text-[9px] font-black opacity-60 uppercase tracking-widest leading-none mb-1">Ward</p>
                  <p className="text-lg font-black tracking-tight uppercase italic leading-none">{wardCode}</p>
                </div>
              </div>
              <button onClick={() => pullFromCloud()} className={`p-3 bg-white/20 rounded-full ${isSyncing ? 'animate-spin' : ''}`}>
                <RefreshCw className="w-5 h-5" />
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
    VIEWER: { title: 'Cloud Configuration', color: 'bg-slate-900' }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-32">
      <header className={`${roleConfigs[activeRole].color} text-white px-6 py-8 sticky top-0 z-50 shadow-2xl flex items-center justify-between rounded-b-[2.5rem]`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveRole(null)} className="p-3 bg-white/20 rounded-2xl active:scale-95 transition-transform"><ArrowLeft className="w-6 h-6" /></button>
          <div className="text-left">
            <h2 className="font-black text-xl italic tracking-tighter uppercase leading-none">{roleConfigs[activeRole].title}</h2>
            {wardCode && <p className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-widest">{wardCode}</p>}
          </div>
        </div>
        <button onClick={() => pullFromCloud()} className={`p-3 bg-white/20 rounded-full ${isSyncing ? 'animate-spin' : ''}`}>
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      <main className="p-4 max-w-2xl mx-auto w-full space-y-6">
        {activeRole !== 'VIEWER' && (
          <div className="grid grid-cols-4 gap-2 animate-in fade-in duration-500">
            <StatCard label="รอทำ" value={stats.ordered} color="text-blue-600" />
            <StatCard label="รอส่ง" value={stats.ready} color="text-orange-500" />
            <StatCard label="กำลังส่ง" value={stats.delivering} color="text-indigo-600" />
            <StatCard label="สำเร็จ" value={stats.done} color="text-green-600" />
          </div>
        )}

        {activeRole === 'VIEWER' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 space-y-8 animate-in slide-in-from-bottom-4">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ward Name</label>
              <input placeholder="เช่น ICU-1" className="w-full p-6 bg-slate-50 rounded-[2rem] font-black text-3xl border-none outline-none focus:ring-4 ring-blue-50 text-center uppercase italic" value={wardCode} onChange={e => {setWardCode(e.target.value.toUpperCase()); localStorage.setItem('ward_code', e.target.value.toUpperCase());}} />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button onClick={cloudId ? () => pushToCloud() : handleInitialSetup} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black shadow-lg uppercase italic active:scale-95 transition-all">
                {cloudId ? 'Sync Manual' : 'Start Cloud Sync'}
              </button>
              {cloudId && <button onClick={() => setShowQr(true)} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black shadow-lg uppercase italic flex items-center justify-center gap-2"><QrIcon className="w-5 h-5"/> Show Share QR</button>}
            </div>
          </div>
        )}

        {activeRole === 'ADMIN' && (
          <button onClick={() => setShowOrderForm(true)} className="w-full py-10 bg-white border-4 border-dashed border-blue-100 rounded-[3rem] flex flex-col items-center gap-2 text-blue-600 font-black hover:bg-blue-50 transition-all active:scale-98 group">
            <Plus className="w-8 h-8 group-hover:scale-125 transition-transform" />
            <span className="text-xl italic uppercase tracking-tighter">New Order</span>
          </button>
        )}

        {activeRole !== 'VIEWER' && (
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6" />
            <input type="text" placeholder="Search Patient, HN, Room..." className="w-full pl-16 pr-8 py-6 bg-white rounded-[2.2rem] border-none font-bold outline-none shadow-sm focus:ring-4 ring-blue-50 transition-all text-lg" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        )}

        <div className="space-y-3">
          {filteredLogs.map(log => {
            const isUrgent = log.allergyItems || log.omitItems;
            return (
              <div key={log.id} onClick={() => setSelectedLog(log)} className={`bg-white p-5 rounded-[2.2rem] border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all active:scale-99 cursor-pointer ${isUrgent ? 'urgent-glow' : ''}`}>
                <div className={`w-14 h-14 rounded-[1.8rem] flex items-center justify-center font-black text-xl shrink-0 ${isUrgent ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{log.roomNumber}</div>
                <div className="flex-1 min-w-0 text-left">
                  <span className="font-black text-slate-800 text-lg block truncate italic leading-tight">{log.patientName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">HN: {log.hn} • {log.mealType}</span>
                    {log.attachments && log.attachments.length > 0 && <Paperclip className="w-3 h-3 text-blue-500" />}
                  </div>
                </div>
                <StatusBadge status={log.status} />
              </div>
            );
          })}
        </div>
      </main>

      {showOrderForm && <OrderForm onSubmit={addLog} onClose={() => setShowOrderForm(false)} />}
      {selectedLog && <DetailModal log={selectedLog} role={activeRole} onClose={() => setSelectedLog(null)} onUpdate={updateStatus} onUpdateAttachments={handleUpdateAttachments} onShowLabel={l => {setSelectedLog(null); setShowLabel(l);}} />}
      {showLabel && <LabelPrint log={showLabel} onClose={() => setShowLabel(null)} />}
      
      {showQr && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6" onClick={() => setShowQr(false)}>
          <div className="bg-white p-10 rounded-[4rem] text-center space-y-8 w-full max-w-sm border-8 border-white animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black italic uppercase">Sync Access QR</h3>
            <div className="flex justify-center p-6 bg-slate-50 rounded-[3rem] shadow-inner" id="qr-station" ref={el => {
              if (el && !el.innerHTML) {
                // @ts-ignore
                new QRCode(el, { text: `${window.location.origin}${window.location.pathname}?ward_id=${cloudId}&ward_name=${wardCode}`, width: 220, height: 220, colorDark: "#0f172a" });
              }
            }}></div>
            <button onClick={() => setShowQr(false)} className="w-full py-6 bg-slate-900 text-white font-black rounded-[2rem] uppercase italic">Close</button>
          </div>
        </div>
      )}

      {successMsg && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl z-[200] flex items-center gap-3 animate-in slide-in-from-bottom-5"><CheckCircle className="w-6 h-6 text-green-400" /> {successMsg}</div>}
    </div>
  );
};

const StatCard = ({ label, value, color }: any) => (
  <div className="bg-white p-3 rounded-[1.5rem] text-center shadow-sm border border-slate-100 min-h-[70px] flex flex-col justify-center">
    <p className={`text-xl font-black ${color} leading-none`}>{value}</p>
    <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mt-1">{label}</p>
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
    <button onClick={onClick} className={`p-6 bg-white border-2 border-transparent rounded-[2.5rem] flex items-center gap-5 transition-all shadow-xl shadow-slate-200/30 w-full active:scale-98 ${themes[color]}`}>
      <div className="p-4 bg-slate-50 rounded-[1.5rem] shadow-inner">{icon}</div>
      <span className="font-black text-lg text-slate-800 italic uppercase tracking-tighter">{label}</span>
      <ChevronRight className="ml-auto opacity-20" />
    </button>
  );
};

const StatusBadge = ({ status }: any) => {
  const cfg: any = {
    ORDERED: { label: 'รอครัว', color: 'bg-blue-50 text-blue-700' },
    KITCHEN_READY: { label: 'รอส่ง', color: 'bg-orange-50 text-orange-700' },
    DISPATCHED: { label: 'นำส่ง', color: 'bg-indigo-50 text-indigo-700' },
    DELIVERED: { label: 'เสิร์ฟแล้ว', color: 'bg-green-50 text-green-700' }
  };
  return <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase border border-current ${cfg[status].color}`}>{cfg[status].label}</span>;
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
      const res = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `ตรวจสอบโภชนาการ: เมนู ${f.menuItems}, เนื้อสัมผัส ${f.dietTexture}, งด ${f.omitItems}, แพ้ ${f.allergyItems}. แนะนำสั้นๆ (ภาษาไทย) 1 ประโยค`,
      });
      setF({ ...f, aiNote: res.text || "ตรวจสอบแล้ว" });
    } catch (e) {
      setF({ ...f, aiNote: "AI Analysis unavailable" });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] p-4 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-8 border-white animate-in slide-in-from-bottom-10">
        <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
          <h3 className="font-black text-2xl italic uppercase tracking-tighter">New Order</h3>
          <button onClick={onClose} className="p-3 bg-white/10 rounded-full"><X /></button>
        </div>
        <div className="p-8 space-y-4 overflow-y-auto no-scrollbar bg-slate-50/50 text-left">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="HN" value={f.hn} onChange={(v:any)=>setF({...f, hn:v})}/>
            <FormInput label="Room" value={f.roomNumber} onChange={(v:any)=>setF({...f, roomNumber:v})}/>
          </div>
          <FormInput label="Patient Name" value={f.patientName} onChange={(v:any)=>setF({...f, patientName:v})}/>
          <div className="grid grid-cols-3 gap-2">
            <SelectInput label="Meal" value={f.mealType} options={['มื้อเช้า', 'กลางวัน', 'มื้อเย็น']} onChange={(v:any)=>setF({...f, mealType:v})}/>
            <SelectInput label="Texture" value={f.dietTexture} options={Object.values(DietTexture)} onChange={(v:any)=>setF({...f, dietTexture:v as DietTexture})}/>
            <SelectInput label="Age" value={f.ageGroup} options={[AgeGroup.ADULT, AgeGroup.CHILD]} onChange={(v:any)=>setF({...f, ageGroup:v as AgeGroup})}/>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">เมนูอาหาร</label>
              <button onClick={checkWithAI} disabled={isAiLoading} className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full flex items-center gap-1 active:scale-95 transition-all">
                {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />} AI Review
              </button>
            </div>
            <textarea placeholder="ระบุเมนูอาหาร..." className="w-full p-4 bg-white rounded-2xl h-24 border border-slate-100 outline-none focus:ring-4 ring-blue-50 shadow-inner" value={f.menuItems} onChange={e=>setF({...f, menuItems:e.target.value})}/>
          </div>
          {f.aiNote && <div className="p-3 bg-indigo-50 rounded-xl text-[10px] font-medium text-indigo-900 border border-indigo-100 italic flex gap-2 animate-in fade-in"><Sparkles className="w-4 h-4 shrink-0 text-indigo-400"/> {f.aiNote}</div>}
          <div className="p-4 bg-red-50 rounded-3xl space-y-3 border border-red-100">
             <FormInput label="OMIT (งด)" value={f.omitItems} onChange={(v:any)=>setF({...f, omitItems:v})} isRed />
             <FormInput label="ALLERGY (แพ้)" value={f.allergyItems} onChange={(v:any)=>setF({...f, allergyItems:v})} isRed />
          </div>
        </div>
        <div className="p-8 border-t bg-white">
          <button onClick={() => onSubmit({...f, id: Date.now().toString(), status: MealStatus.ORDERED, orderTimestamp: new Date().toLocaleString('th-TH'), orderNumber: 'ORD-'+Math.floor(Math.random()*9000), attachments: []})} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-lg uppercase italic tracking-tighter text-lg active:scale-95 transition-transform">Confirm Order</button>
        </div>
      </div>
    </div>
  );
};

const FormInput = ({ label, value, onChange, isRed }: any) => (
  <div className="space-y-1">
    <label className={`text-[9px] font-black uppercase ml-1 ${isRed ? 'text-red-500' : 'text-slate-400'}`}>{label}</label>
    <input className={`w-full p-4 rounded-xl font-bold border-none outline-none ${isRed ? 'bg-white text-red-600' : 'bg-white shadow-sm border border-slate-100'}`} value={value} onChange={e=>onChange(e.target.value)}/>
  </div>
);

const SelectInput = ({ label, value, options, onChange }: any) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 leading-none">{label}</label>
    <select className="w-full p-3 bg-white rounded-xl font-bold border border-slate-100 text-[10px] outline-none" value={value} onChange={e=>onChange(e.target.value)}>
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
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-[4rem] shadow-2xl overflow-hidden border-8 border-white animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="p-10 space-y-8 text-left overflow-y-auto max-h-[90vh] no-scrollbar">
          <div className="flex justify-between items-start">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center text-4xl font-black shadow-inner uppercase italic border-2 border-white">{log.roomNumber}</div>
            <button onClick={onClose} className="p-4 bg-slate-50 rounded-full text-slate-400 active:scale-90 transition-transform"><X /></button>
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-900 leading-none italic uppercase tracking-tighter">{log.patientName}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">HN: {log.hn} • {log.mealType}</p>
          </div>
          <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner space-y-4 relative">
            <div className="text-[10px] font-black text-blue-600 uppercase bg-blue-50/50 w-fit px-3 py-1 rounded-full">{log.dietTexture}</div>
            <p className="text-2xl font-black text-slate-800 italic leading-snug">"{log.menuItems}"</p>
            {log.aiNote && <div className="p-3 bg-white/80 rounded-xl text-[10px] italic text-indigo-900 border border-indigo-50 flex gap-2"><Sparkles className="w-4 h-4 text-indigo-400"/> {log.aiNote}</div>}
            {(log.omitItems || log.allergyItems) && (
              <div className="space-y-2 pt-4 border-t border-slate-200">
                {log.omitItems && <div className="text-[10px] font-black text-red-600 italic">⚠️ OMIT: {log.omitItems}</div>}
                {log.allergyItems && <div className="p-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg animate-pulse"><ShieldAlert className="w-4 h-4"/> ALLERGY: {log.allergyItems}</div>}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase text-slate-400 italic">Attachments</h4>
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 bg-blue-50 text-blue-600 rounded-full px-4 text-[10px] font-black uppercase active:scale-95 transition-all">
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add File
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {log.attachments?.map((file) => (
                <div key={file.id} className="bg-slate-50 rounded-2xl p-3 flex items-center gap-2 border border-white shadow-sm overflow-hidden group">
                   {file.type.startsWith('image/') ? <img src={file.data} className="w-8 h-8 rounded object-cover" /> : <FileText className="w-5 h-5 text-slate-400" />}
                   <p className="text-[8px] font-bold text-slate-800 truncate flex-1">{file.name}</p>
                   <button onClick={() => onUpdateAttachments(log.id, log.attachments!.filter(a=>a.id!==file.id))} className="text-red-400 active:scale-90"><Trash2 className="w-3 h-3"/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            {role === 'KITCHEN' && log.status === MealStatus.ORDERED && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => onUpdate(log.id, MealStatus.KITCHEN_READY, 'Staff')} className="py-6 bg-orange-500 text-white font-black text-xl rounded-2xl shadow-xl uppercase italic active:scale-95 transition-transform">Ready</button>
                <button onClick={() => onShowLabel(log)} className="py-6 bg-slate-900 text-white font-black text-xl rounded-2xl flex items-center justify-center gap-2 uppercase italic shadow-xl"><Printer className="w-5 h-5"/> Label</button>
              </div>
            )}
            {role === 'DISPATCH' && log.status === MealStatus.KITCHEN_READY && <button onClick={() => onUpdate(log.id, MealStatus.DISPATCHED, 'Courier')} className="w-full py-7 bg-indigo-600 text-white font-black text-2xl rounded-2xl shadow-xl uppercase italic">Pick up</button>}
            {role === 'DELIVERY' && log.status === MealStatus.DISPATCHED && <button onClick={() => onUpdate(log.id, MealStatus.DELIVERED, 'Service')} className="w-full py-7 bg-green-600 text-white font-black text-2xl rounded-2xl shadow-xl uppercase italic">Served</button>}
          </div>
        </div>
      </div>
    </div>
  );
};

const LabelPrint = ({ log, onClose }: any) => (
  <div className="fixed inset-0 bg-white z-[300] flex flex-col items-center justify-center p-8">
    <div className="w-full max-w-[320px] bg-white border-4 border-black p-8 space-y-5 text-black text-left shadow-2xl relative">
      <div className="border-b-4 border-black pb-4">
        <h4 className="text-6xl font-black italic">{log.roomNumber}</h4>
        <p className="text-xl font-black mt-2 uppercase">{log.patientName}</p>
        <p className="text-sm font-bold opacity-60">HN: {log.hn}</p>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-black uppercase bg-black text-white px-3 py-1 w-fit">{log.mealType}</p>
        <p className="text-2xl font-black italic leading-tight py-2">"{log.menuItems}"</p>
        <div className="text-[10px] font-black uppercase">Diet: {log.dietTexture}</div>
      </div>
    </div>
    <div className="mt-12 flex gap-4 no-print">
      <button onClick={() => window.print()} className="px-10 py-5 bg-blue-600 text-white font-black rounded-2xl flex items-center gap-3 shadow-xl uppercase italic"><Printer className="w-6 h-6"/> Print</button>
      <button onClick={onClose} className="px-10 py-5 bg-slate-100 font-black rounded-2xl uppercase italic">Back</button>
    </div>
  </div>
);

export default App;
