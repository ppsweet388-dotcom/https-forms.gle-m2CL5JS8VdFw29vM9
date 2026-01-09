
import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  ChefHat, 
  Plus, 
  Camera, 
  Download,
  Search,
  ArrowLeft,
  Lock,
  Clock,
  Trash2,
  PackageCheck,
  UserCheck,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  X,
  Eye,
  Calendar,
  ShieldAlert,
  AlertTriangle,
  CloudUpload,
  Settings,
  KeyRound,
  Save,
  SlidersHorizontal,
  ListPlus,
  Info,
  Type,
  Layout
} from 'lucide-react';
import { MealLog, MealStatus, AgeGroup } from './types';

const STORAGE_KEY = 'patient_meal_tracker_v7';
const CONFIG_KEY = 'meal_tracker_config';
const DEFAULT_PASS = 'admin123';

const DEFAULT_LABELS = {
  hn: 'เลขที่ HN',
  patientName: 'ชื่อ-นามสกุล ผู้ป่วย',
  roomNumber: 'หมายเลขห้อง',
  mealType: 'มื้ออาหาร / ประเภทอาหาร',
  menuItems: 'รายการอาหารปกติที่ได้รับ',
  omitItems: 'รายการอาหารที่งด (Omit)',
  allergyItems: 'รายการที่แพ้ (Allergy)',
  adminName: 'ชื่อผู้รับผิดชอบ (แอดมิน)',
  appTitle: 'ระบบติดตามอาหารผู้ป่วย',
  appSubtitle: 'Hospital Meal Delivery Tracking'
};

const App: React.FC = () => {
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<MealLog | null>(null);
  
  // Configuration State
  const [sheetUrl, setSheetUrl] = useState('');
  const [adminPassword, setAdminPassword] = useState(DEFAULT_PASS);
  const [newPassword, setNewPassword] = useState('');
  const [customFieldNames, setCustomFieldNames] = useState<string[]>([]);
  const [fieldLabels, setFieldLabels] = useState(DEFAULT_LABELS);
  
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setLogs(JSON.parse(stored));
    
    const config = localStorage.getItem(CONFIG_KEY);
    if (config) {
      const parsed = JSON.parse(config);
      setSheetUrl(parsed.sheetUrl || '');
      setAdminPassword(parsed.adminPassword || DEFAULT_PASS);
      setNewPassword(parsed.adminPassword || DEFAULT_PASS);
      setCustomFieldNames(parsed.customFieldNames || []);
      setFieldLabels({ ...DEFAULT_LABELS, ...(parsed.fieldLabels || {}) });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  const saveConfig = () => {
    const newConfig = { sheetUrl, adminPassword: newPassword, customFieldNames, fieldLabels };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
    setAdminPassword(newPassword);
    triggerSuccess("บันทึกการตั้งค่าระบบเรียบร้อย");
    setShowSettingsModal(false);
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const addLog = (newLog: MealLog) => {
    setLogs(prev => [newLog, ...prev]);
    triggerSuccess("บันทึกออเดอร์ใหม่สำเร็จ!");
  };

  const updateLog = (id: string, updates: any) => {
    setLogs(prev => prev.map(log => log.id === id ? { ...log, ...updates } : log));
    triggerSuccess("บันทึกข้อมูลสำเร็จ!");
  };

  const deleteLog = (id: string) => {
    if (window.confirm('ยืนยันการลบข้อมูลนี้ออกจากระบบ?')) {
      setLogs(prev => prev.filter(log => log.id !== id));
      if (selectedLog?.id === id) setSelectedLog(null);
    }
  };

  const syncToGoogleSheets = async () => {
    if (!sheetUrl) {
      alert("กรุณาตั้งค่า Google Apps Script URL ในเมนูตั้งค่าก่อน");
      setShowSettingsModal(true);
      return;
    }
    setIsSyncing(true);
    try {
      await fetch(sheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logs)
      });
      triggerSuccess("ซิงค์ข้อมูลไปที่ Google Sheets เรียบร้อย!");
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ Google Sheets");
    } finally {
      setIsSyncing(false);
    }
  };

  const exportToCSV = () => {
    const baseHeaders = [
      fieldLabels.hn, fieldLabels.patientName, fieldLabels.roomNumber, 'ช่วงอายุ', fieldLabels.mealType, fieldLabels.menuItems, fieldLabels.omitItems, fieldLabels.allergyItems, 'สถานะปัจจุบัน',
      fieldLabels.adminName, 'เวลาลงออเดอร์'
    ];
    
    const headers = [...baseHeaders, ...customFieldNames, 
      'ผู้รับผิดชอบครัว', 'เวลาครัวเสร็จ', 'รูปถ่ายครัว',
      'ผู้รับผิดชอบนำออก', 'เวลานำออก', 'รูปถ่ายนำออก',
      'ผู้เสิร์ฟอาหาร', 'เวลาเสิร์ฟเสร็จสิ้น', 'รูปถ่ายเสิร์ฟเสร็จ'
    ];

    const rows = logs.map(l => {
      const row = [
        l.hn, l.patientName, l.roomNumber, l.ageGroup, l.mealType, 
        `"${l.menuItems.replace(/"/g, '""')}"`, 
        `"${(l.omitItems || '').replace(/"/g, '""')}"`,
        `"${(l.allergyItems || '').replace(/"/g, '""')}"`,
        l.status,
        l.adminName, l.orderTimestamp
      ];
      customFieldNames.forEach(fieldName => {
        row.push(`"${(l.customFields?.[fieldName] || '').replace(/"/g, '""')}"`);
      });
      row.push(
        l.kitchenStaffName || '-', l.kitchenTimestamp || '-', l.kitchenPhoto ? 'มีรูปภาพ' : '-',
        l.dispatchStaffName || '-', l.dispatchTimestamp || '-', l.dispatchPhoto ? 'มีรูปภาพ' : '-',
        l.deliveryStaffName || '-', l.deliveryTimestamp || '-', l.deliveryPhoto ? 'มีรูปภาพ' : '-'
      );
      return row;
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `รายงานอาหาร_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.csv`;
    link.click();
  };

  const handleLogin = () => {
    if (passwordInput === adminPassword) {
      setActiveRole('VIEWER');
      setShowPasswordModal(false);
      setPasswordInput('');
    } else {
      alert('รหัสผ่านไม่ถูกต้อง');
    }
  };

  if (!activeRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-50"></div>

        <div className="text-center mb-10 z-10">
          <div className="inline-flex p-4 bg-blue-600 rounded-3xl mb-4 shadow-2xl shadow-blue-200">
            <ClipboardList className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight text-balance">{fieldLabels.appTitle}</h1>
          <p className="text-slate-400 font-bold text-sm mt-2 uppercase tracking-widest">{fieldLabels.appSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl z-10">
          <MenuButton icon={<ClipboardList className="text-blue-600" />} title="1. แผนกแอดมิน" desc="ลงทะเบียนผู้ป่วย / รับออเดอร์" onClick={() => setActiveRole('ADMIN')} color="blue" />
          <MenuButton icon={<ChefHat className="text-orange-600" />} title="2. แผนกครัว" desc="ถ่ายภาพอาหารหน้าไลน์อาหาร" onClick={() => setActiveRole('KITCHEN')} color="orange" />
          <MenuButton icon={<PackageCheck className="text-indigo-600" />} title="3. แผนกเสิร์ฟ (นำออก)" desc="ถ่ายรูปถาดก่อนออกจากแผนก" onClick={() => setActiveRole('DISPATCH')} color="indigo" />
          <MenuButton icon={<UserCheck className="text-green-600" />} title="4. แผนกเสิร์ฟ (เสร็จสิ้น)" desc="ถ่ายรูปตอนเสิร์ฟถึงมือผู้ป่วย" onClick={() => setActiveRole('DELIVERY')} color="green" />
        </div>

        <button onClick={() => setShowPasswordModal(true)} className="mt-12 text-slate-400 hover:text-blue-600 flex items-center gap-2 text-xs font-black transition-all group z-10">
          <Lock className="w-4 h-4 group-hover:rotate-12 transition-transform" /> <span>ข้อมูลหลังบ้าน & ตั้งค่าระบบ</span>
        </button>

        {showPasswordModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-sm:p-6 p-8 animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-black text-slate-800 mb-2">เข้าสู่ระบบหลังบ้าน</h3>
              <p className="text-slate-400 text-sm font-bold mb-6">กรุณาระบุรหัสผ่านเพื่อเข้าถึงการตั้งค่าและรายงาน</p>
              <input type="password" placeholder="ระบุรหัสผ่าน" autoFocus className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl mb-4 font-bold outline-none focus:border-blue-500 transition-colors" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
              <div className="flex gap-3">
                <button onClick={() => { setShowPasswordModal(false); setPasswordInput(''); }} className="flex-1 py-3 font-bold text-slate-400">ยกเลิก</button>
                <button onClick={handleLogin} className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-100">ตกลง</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {successMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-black">
            <CheckCircle className="w-5 h-5" />
            {successMsg}
          </div>
        </div>
      )}

      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 px-4 py-4 flex items-center justify-between shadow-sm">
        <button onClick={() => { setActiveRole(null); setShowOrderForm(false); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-2 text-slate-600">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-black">กลับ</span>
        </button>
        <h2 className="font-black text-lg text-slate-800">
          {activeRole === 'ADMIN' && 'แผนกแอดมิน'}
          {activeRole === 'KITCHEN' && 'แผนกครัว'}
          {activeRole === 'DISPATCH' && 'แผนกเสิร์ฟ (นำออก)'}
          {activeRole === 'DELIVERY' && 'แผนกเสิร์ฟ (เสร็จสิ้น)'}
          {activeRole === 'VIEWER' && 'รายงานข้อมูลย้อนหลัง'}
        </h2>
        {activeRole === 'VIEWER' ? (
          <button onClick={() => setShowSettingsModal(true)} className="p-2.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        ) : <div className="w-10"></div>}
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6 w-full flex-1 pb-20">
        {activeRole === 'VIEWER' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder={`ค้นหา ${fieldLabels.hn}, ชื่อ, ห้อง...`} className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none transition-all shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button onClick={syncToGoogleSheets} disabled={isSyncing} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-blue-100 active:scale-95 transition-all text-sm">
                   {isSyncing ? '...' : <CloudUpload className="w-4 h-4" />} ซิงค์ Sheets
                </button>
                <button onClick={exportToCSV} className="bg-green-600 text-white px-5 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-green-100 active:scale-95 transition-all text-sm">
                   <Download className="w-4 h-4" /> Excel
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              {logs.filter(l => l.patientName.includes(searchTerm) || l.roomNumber.includes(searchTerm) || l.hn.includes(searchTerm)).map(log => (
                <div key={log.id} onClick={() => setSelectedLog(log)} className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between cursor-pointer transition-all group ${log.allergyItems || log.omitItems ? 'border-red-100 bg-red-50/10' : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50/10'}`}>
                  <div className="flex gap-4 items-center">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${log.allergyItems || log.omitItems ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {log.roomNumber}
                    </div>
                    <div>
                      <div className="font-black text-slate-800 flex items-center gap-2">
                        {log.patientName}
                        {(log.allergyItems || log.omitItems) && <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                         <span>{fieldLabels.hn}: {log.hn}</span>
                         <span className="text-slate-200">•</span>
                         <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {log.orderTimestamp.split(' ')[1]}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={log.status} />
                    <Eye className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
              ))}
              {logs.length === 0 && <Empty message="ยังไม่มีข้อมูลบันทึก" />}
            </div>
          </div>
        )}

        {activeRole !== 'VIEWER' && activeRole !== null && (
           <div className="space-y-6">
              {activeRole === 'ADMIN' && !showOrderForm && (
                <button onClick={() => setShowOrderForm(true)} className="group w-full bg-blue-600 text-white p-6 rounded-3xl flex items-center justify-center gap-3 font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
                  <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" /> 
                  <span className="text-lg">กรอกข้อมูลออเดอร์ใหม่</span>
                </button>
              )}
              
              {showOrderForm && activeRole === 'ADMIN' ? (
                <AdminForm labels={fieldLabels} customFieldNames={customFieldNames} onSubmit={(l) => { addLog(l); setShowOrderForm(false); }} onCancel={() => setShowOrderForm(false)} />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-black text-slate-400 text-xs uppercase tracking-widest">
                      {activeRole === 'ADMIN' ? 'ออเดอร์ทั้งหมด' : 'รายการรอดำเนินการ:'}
                    </h3>
                    <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-black">{logs.length} รายการ</span>
                  </div>
                  <OrderList 
                    labels={fieldLabels}
                    logs={logs.filter(l => {
                      if (activeRole === 'ADMIN') return true;
                      if (activeRole === 'KITCHEN') return l.status === MealStatus.ORDERED;
                      if (activeRole === 'DISPATCH') return l.status === MealStatus.KITCHEN_READY;
                      if (activeRole === 'DELIVERY') return l.status === MealStatus.DISPATCHED;
                      return false;
                    })} 
                    role={activeRole} 
                    onUpdate={updateLog} 
                  />
                </div>
              )}
           </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 bg-slate-50 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-800">ตั้งค่าระบบและรายละเอียดแอป</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Configuration</p>
                </div>
                <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
             </div>
             <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                {/* App Identity Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-indigo-500">
                    <Layout className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">ข้อมูลชื่อแอปและหัวข้อ</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">ชื่อแอปพลิเคชัน</span>
                      <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" value={fieldLabels.appTitle} onChange={e => setFieldLabels({...fieldLabels, appTitle: e.target.value})} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">คำบรรยาย (Subtitle)</span>
                      <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" value={fieldLabels.appSubtitle} onChange={e => setFieldLabels({...fieldLabels, appSubtitle: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Main Label Management */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Type className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">แก้ไขชื่อหัวข้อหลัก (Main Fields)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(fieldLabels).filter(([k]) => k !== 'appTitle' && k !== 'appSubtitle').map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Field: {key}</span>
                        <input 
                          type="text" 
                          value={value} 
                          onChange={(e) => setFieldLabels({...fieldLabels, [key]: e.target.value})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Fields Setting */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-purple-600">
                    <ListPlus className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">เพิ่มหัวข้อข้อมูลใหม่ (Custom Fields)</span>
                  </div>
                  <div className="space-y-2">
                    {customFieldNames.map((name, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input 
                          type="text"
                          value={name}
                          onChange={(e) => {
                            const newNames = [...customFieldNames];
                            newNames[idx] = e.target.value;
                            setCustomFieldNames(newNames);
                          }}
                          className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                        />
                        <button onClick={() => setCustomFieldNames(customFieldNames.filter((_, i) => i !== idx))} className="p-2 text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => setCustomFieldNames([...customFieldNames, ''])} className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50">
                      <Plus className="w-3 h-3" /> เพิ่มหัวข้อข้อมูลที่ต้องการใส่เพิ่ม
                    </button>
                  </div>
                </div>

                {/* Security Section */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-orange-500">
                    <KeyRound className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">รหัสผ่านแอดมิน</span>
                  </div>
                  <input type="text" placeholder="ระบุรหัสผ่านใหม่..." className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-orange-500 outline-none transition-all" value={newPassword} onChange={e => setNewPassword(e.target.value)}/>
                </div>

                {/* Google Sheet Sync */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-500">
                    <CloudUpload className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Google Apps Script URL</span>
                  </div>
                  <input type="text" placeholder="https://script.google.com/..." className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs focus:border-blue-500 outline-none transition-all" value={sheetUrl} onChange={e => setSheetUrl(e.target.value)}/>
                </div>
             </div>
             <div className="p-6 bg-slate-50 border-t flex gap-3">
                <button onClick={() => setShowSettingsModal(false)} className="flex-1 py-4 font-black text-slate-400">ยกเลิก</button>
                <button onClick={saveConfig} className="flex-[2] py-4 bg-slate-800 text-white font-black rounded-2xl shadow-xl shadow-slate-100 hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" /> บันทึกการตั้งค่าทั้งหมด
                </button>
             </div>
           </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b flex items-center justify-between sticky top-0">
               <div>
                 <h3 className="font-black text-xl text-slate-800 leading-none">รายละเอียดออเดอร์</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Order Log Details</p>
               </div>
               <div className="flex gap-2">
                 <button onClick={() => deleteLog(selectedLog.id)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="w-5 h-5" /></button>
                 <button onClick={() => setSelectedLog(null)} className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               {(selectedLog.allergyItems || selectedLog.omitItems) && (
                 <div className="space-y-2">
                    {selectedLog.allergyItems && (
                      <div className="bg-red-600 text-white p-4 rounded-2xl flex items-start gap-3 shadow-lg shadow-red-200">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] font-black uppercase opacity-70">{fieldLabels.allergyItems}</div>
                          <div className="font-black text-lg">{selectedLog.allergyItems}</div>
                        </div>
                      </div>
                    )}
                    {selectedLog.omitItems && (
                      <div className="bg-red-100 text-red-700 p-4 rounded-2xl border-2 border-red-200 flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] font-black uppercase opacity-70">{fieldLabels.omitItems}</div>
                          <div className="font-black text-lg">{selectedLog.omitItems}</div>
                        </div>
                      </div>
                    )}
                 </div>
               )}

               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-blue-50 p-4 rounded-3xl">
                   <div className="text-[10px] font-black text-blue-400 uppercase mb-1">ข้อมูลผู้ป่วย</div>
                   <div className="font-black text-blue-900">{selectedLog.patientName}</div>
                   <div className="text-xs font-bold text-blue-600/70">{fieldLabels.hn}: {selectedLog.hn}</div>
                 </div>
                 <div className="bg-slate-100 p-4 rounded-3xl">
                   <div className="text-[10px] font-black text-slate-400 uppercase mb-1">ห้อง / มื้อ</div>
                   <div className="font-black text-slate-800">{fieldLabels.roomNumber} {selectedLog.roomNumber}</div>
                   <div className="text-xs font-bold text-slate-500">{selectedLog.mealType}</div>
                 </div>
               </div>

               {selectedLog.customFields && Object.keys(selectedLog.customFields).length > 0 && (
                 <div className="bg-purple-50 p-5 rounded-3xl border border-purple-100">
                   <div className="text-[10px] font-black text-purple-400 uppercase mb-3 flex items-center gap-2">
                      <Info className="w-3 h-3" /> ข้อมูลเพิ่มเติมที่ระบุไว้
                   </div>
                   <div className="grid grid-cols-1 gap-2">
                      {Object.entries(selectedLog.customFields).map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center text-sm">
                          <span className="font-bold text-slate-500">{k}:</span>
                          <span className="font-black text-purple-700">{v || '-'}</span>
                        </div>
                      ))}
                   </div>
                 </div>
               )}

               <div className="bg-white border-2 border-slate-50 p-5 rounded-3xl">
                 <div className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2">
                    <ClipboardList className="w-3 h-3" /> {fieldLabels.menuItems}
                 </div>
                 <div className="font-bold text-slate-700 leading-relaxed italic">"{selectedLog.menuItems}"</div>
                 <div className="mt-4 flex items-center gap-3 pt-4 border-t border-slate-50">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-black text-xs text-slate-500">AD</div>
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase">ลงข้อมูลโดย ({fieldLabels.adminName})</div>
                      <div className="text-xs font-bold">{selectedLog.adminName} ({selectedLog.orderTimestamp})</div>
                    </div>
                 </div>
               </div>

               <div className="space-y-6">
                  <h4 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em] text-center">หลักฐานการดำเนินการ</h4>
                  <TimelineStep title="แผนกครัว" icon={<ChefHat className="w-4 h-4" />} staff={selectedLog.kitchenStaffName} time={selectedLog.kitchenTimestamp} photo={selectedLog.kitchenPhoto} status={selectedLog.kitchenStaffName ? 'complete' : 'pending'} />
                  <TimelineStep title="แผนกเสิร์ฟ (นำออก)" icon={<PackageCheck className="w-4 h-4" />} staff={selectedLog.dispatchStaffName} time={selectedLog.dispatchTimestamp} photo={selectedLog.dispatchPhoto} status={selectedLog.dispatchStaffName ? 'complete' : 'pending'} />
                  <TimelineStep title="แผนกเสิร์ฟ (เสร็จสิ้น)" icon={<UserCheck className="w-4 h-4" />} staff={selectedLog.deliveryStaffName} time={selectedLog.deliveryTimestamp} photo={selectedLog.deliveryPhoto} status={selectedLog.deliveryStaffName ? 'complete' : 'pending'} />
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-components ---

const TimelineStep: React.FC<{ title: string, icon: React.ReactNode, staff?: string, time?: string, photo?: string, status: 'complete' | 'pending' }> = ({ title, icon, staff, time, photo, status }) => (
  <div className={`p-5 rounded-3xl border-2 transition-all ${status === 'complete' ? 'border-slate-100 bg-white' : 'border-dashed border-slate-100 opacity-50 bg-slate-50/50'}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${status === 'complete' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
          {icon}
        </div>
        <h5 className="font-black text-sm text-slate-800">{title}</h5>
      </div>
      {status === 'complete' ? (
        <span className="flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-full">
          <CheckCircle className="w-3 h-3" /> สำเร็จ
        </span>
      ) : (
        <span className="text-[10px] font-black text-slate-300">รอดำเนินการ</span>
      )}
    </div>

    {status === 'complete' && (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
           <div className="flex items-center gap-2 font-black text-slate-600">ผู้รับผิดชอบ: {staff}</div>
           <div className="flex items-center gap-2"><Clock className="w-3 h-3" /> {time}</div>
        </div>
        {photo && (
          <div className="group relative rounded-2xl overflow-hidden border-4 border-slate-50">
            <img src={photo} className="w-full h-40 object-cover" />
            <a href={photo} download="proof.png" className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-black text-xs gap-2">
               <Eye className="w-4 h-4" /> ดูรูปขยาย
            </a>
          </div>
        )}
      </div>
    )}
  </div>
);

const MenuButton: React.FC<{ icon: React.ReactNode, title: string, desc: string, onClick: () => void, color: string }> = ({ icon, title, desc, onClick, color }) => {
  const colors: any = {
    blue: "hover:border-blue-200 hover:bg-blue-50",
    orange: "hover:border-orange-200 hover:bg-orange-50",
    indigo: "hover:border-indigo-200 hover:bg-indigo-50",
    green: "hover:border-green-200 hover:bg-green-50",
  };
  return (
    <button onClick={onClick} className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200/60 flex items-center gap-5 transition-all active:scale-[0.97] group ${colors[color]}`}>
      <div className="p-4 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <div className="text-left flex-1">
        <h3 className="text-lg font-black text-slate-800 leading-tight">{title}</h3>
        <p className="text-xs text-slate-400 font-bold leading-tight mt-1">{desc}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
    </button>
  );
};

const AdminForm: React.FC<{ labels: typeof DEFAULT_LABELS, customFieldNames: string[], onSubmit: (log: MealLog) => void, onCancel: () => void }> = ({ labels, customFieldNames, onSubmit, onCancel }) => {
  const [data, setData] = useState({ hn: '', patientName: '', roomNumber: '', ageGroup: AgeGroup.ADULT, mealType: '', menuItems: '', omitItems: '', allergyItems: '', adminName: '' });
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);

  const validate = () => {
    const errs = [];
    if(!data.hn) errs.push('hn');
    if(!data.patientName) errs.push('patientName');
    if(!data.roomNumber) errs.push('roomNumber');
    if(!data.adminName) errs.push('adminName');
    setErrors(errs);
    return errs.length === 0;
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 border border-slate-100">
      <div className="bg-blue-600 p-8 text-white relative">
        <div className="absolute top-0 right-0 p-8 opacity-10"><ClipboardList className="w-24 h-24" /></div>
        <h3 className="text-2xl font-black">ลงทะเบียนออเดอร์</h3>
        <p className="text-blue-100 text-[10px] font-black uppercase mt-1 tracking-widest">Entry Panel</p>
      </div>
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input label={labels.hn} value={data.hn} onChange={v => setData(d => ({...d, hn: v}))} error={errors.includes('hn')} />
          <Input label={labels.patientName} value={data.patientName} onChange={v => setData(d => ({...d, patientName: v}))} error={errors.includes('patientName')} />
          <Input label={labels.roomNumber} value={data.roomNumber} onChange={v => setData(d => ({...d, roomNumber: v}))} error={errors.includes('roomNumber')} />
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">ประเภทผู้ป่วย</label>
            <div className="flex gap-2">
              <button onClick={() => setData(d => ({...d, ageGroup: AgeGroup.ADULT}))} className={`flex-1 py-3.5 rounded-2xl font-black text-sm border-2 transition-all ${data.ageGroup === AgeGroup.ADULT ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>ผู้ใหญ่</button>
              <button onClick={() => setData(d => ({...d, ageGroup: AgeGroup.CHILD}))} className={`flex-1 py-3.5 rounded-2xl font-black text-sm border-2 transition-all ${data.ageGroup === AgeGroup.CHILD ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>เด็ก</button>
            </div>
          </div>
          <Input label={labels.mealType} placeholder="เช่น มื้อเช้า (ปกติ)" value={data.mealType} onChange={v => setData(d => ({...d, mealType: v}))} />
          <Input label={labels.adminName} value={data.adminName} onChange={v => setData(d => ({...d, adminName: v}))} error={errors.includes('adminName')} />
        </div>

        {customFieldNames.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-6 bg-slate-50 border border-slate-100 rounded-[2rem]">
            {customFieldNames.map((fieldName) => (
              <Input key={fieldName} label={fieldName} value={customFields[fieldName] || ''} onChange={v => setCustomFields(f => ({...f, [fieldName]: v}))} />
            ))}
          </div>
        )}

        <div className="p-6 bg-red-50 rounded-[2rem] border-2 border-red-100 space-y-4">
          <div className="flex items-center gap-2 text-red-600 font-black text-xs uppercase tracking-widest">
            <AlertTriangle className="w-4 h-4" /> ข้อมูลระวังพิเศษ
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={labels.omitItems} placeholder="ไม่มี" value={data.omitItems} onChange={v => setData(d => ({...d, omitItems: v}))} isAlert />
            <Input label={labels.allergyItems} placeholder="ไม่มี" value={data.allergyItems} onChange={v => setData(d => ({...d, allergyItems: v}))} isAlert />
          </div>
        </div>

        <Input label={labels.menuItems} multiline placeholder="ระบุรายการอาหาร..." value={data.menuItems} onChange={v => setData(d => ({...d, menuItems: v}))} />
        
        <div className="flex gap-3 pt-4">
          <button onClick={onCancel} className="flex-1 py-4 font-black text-slate-400 hover:bg-slate-50 rounded-2xl transition-colors">ยกเลิก</button>
          <button onClick={() => {
            if(validate()) {
              onSubmit({
                id: Math.random().toString(36).substr(2, 9),
                orderNumber: `ORD-${Date.now().toString().slice(-4)}`,
                ...data,
                customFields,
                status: MealStatus.ORDERED,
                orderTimestamp: new Date().toLocaleString('th-TH')
              });
            }
          }} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">บันทึกข้อมูล</button>
        </div>
      </div>
    </div>
  );
};

const Input: React.FC<{ label: string, value: string, onChange: (v: string) => void, placeholder?: string, error?: boolean, multiline?: boolean, isAlert?: boolean }> = ({ label, value, onChange, placeholder, error, multiline, isAlert }) => (
  <div className="flex flex-col gap-1.5">
    <label className={`text-[10px] font-black uppercase tracking-widest ${error ? 'text-red-500' : isAlert ? 'text-red-700' : 'text-slate-400'}`}>
      {label} {error && '*'}
    </label>
    {multiline ? (
      <textarea className={`p-4 border-2 rounded-2xl outline-none font-bold min-h-[100px] transition-all ${error ? 'border-red-100 bg-red-50/30' : isAlert ? 'border-red-200 bg-white focus:border-red-500 text-red-700' : 'border-slate-100 focus:border-blue-500 bg-slate-50/50'}`} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    ) : (
      <input type="text" className={`p-4 border-2 rounded-2xl outline-none font-bold transition-all ${error ? 'border-red-100 bg-red-50/30' : isAlert ? 'border-red-200 bg-white focus:border-red-500 text-red-700' : 'border-slate-100 focus:border-blue-500 bg-slate-50/50'}`} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    )}
  </div>
);

const OrderList: React.FC<{ labels: typeof DEFAULT_LABELS, logs: MealLog[], role: string, onUpdate: (id: string, updates: any) => void }> = ({ labels, logs, role, onUpdate }) => (
  <div className="space-y-4">
    {logs.map(log => (
      <OrderItem key={log.id} labels={labels} log={log} role={role} onUpdate={onUpdate} />
    ))}
  </div>
);

const OrderItem: React.FC<{ labels: typeof DEFAULT_LABELS, log: MealLog, role: string, onUpdate: (id: string, updates: any) => void }> = ({ labels, log, role, onUpdate }) => {
  const [staff, setStaff] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  const handleFinish = () => {
    if(!staff || !photo) {
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
      return;
    }
    const ts = new Date().toLocaleString('th-TH');
    if (role === 'KITCHEN') onUpdate(log.id, { status: MealStatus.KITCHEN_READY, kitchenStaffName: staff, kitchenPhoto: photo, kitchenTimestamp: ts });
    if (role === 'DISPATCH') onUpdate(log.id, { status: MealStatus.DISPATCHED, dispatchStaffName: staff, dispatchPhoto: photo, dispatchTimestamp: ts });
    if (role === 'DELIVERY') onUpdate(log.id, { status: MealStatus.DELIVERED, deliveryStaffName: staff, deliveryPhoto: photo, deliveryTimestamp: ts });
  };

  return (
    <div className={`bg-white rounded-[2rem] border p-6 shadow-sm hover:shadow-md transition-all ${log.allergyItems || log.omitItems ? 'border-red-200 ring-2 ring-red-50' : 'border-slate-200/60'}`}>
      {(log.allergyItems || log.omitItems) && (
        <div className="bg-red-600 text-white -mx-6 -mt-6 mb-6 px-6 py-3 rounded-t-[2rem] flex items-center gap-3 animate-pulse">
          <ShieldAlert className="w-5 h-5" />
          <div className="text-xs font-black uppercase tracking-widest">คำเตือน: ตรวจสอบ งด/แพ้ ก่อนจัดอาหาร</div>
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-4 items-center">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg border ${log.allergyItems || log.omitItems ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-800 border-slate-100'}`}>
            {log.roomNumber}
          </div>
          <div>
            <h4 className="font-black text-xl text-slate-800 leading-none mb-1">{log.patientName}</h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{labels.hn}: {log.hn} | {log.mealType}</p>
          </div>
        </div>
        <StatusBadge status={log.status} />
      </div>

      <div className="space-y-3 mb-6">
        {log.allergyItems && (
          <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-3">
             <div className="bg-red-600 text-white p-1 rounded-md text-[8px] font-black">แพ้</div>
             <div className="font-black text-red-700 text-sm">{log.allergyItems}</div>
          </div>
        )}
        {log.omitItems && (
          <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-3">
             <div className="bg-orange-500 text-white p-1 rounded-md text-[8px] font-black">งด</div>
             <div className="font-black text-orange-700 text-sm">{log.omitItems}</div>
          </div>
        )}
        <div className="bg-slate-50/80 p-5 rounded-2xl font-bold text-slate-600 text-sm border border-slate-100 italic">
          "{log.menuItems}"
        </div>
      </div>

      {role !== 'ADMIN' && (
        <div className="space-y-4 border-t border-slate-100 pt-6">
           <div className="flex flex-col gap-4">
             <div className="flex flex-col gap-1.5">
               <label className={`text-[10px] font-black uppercase tracking-widest ${showError && !staff ? 'text-red-500' : 'text-slate-400'}`}>
                 ชื่อผู้รับผิดชอบ {showError && !staff && '(จำเป็น)'}
               </label>
               <input type="text" placeholder="ระบุชื่อ..." className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={staff} onChange={e => setStaff(e.target.value)} />
             </div>
             
             <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-black uppercase tracking-widest ${showError && !photo ? 'text-red-500' : 'text-slate-400'}`}>
                  ถ่ายรูปภาพอาหาร/ถาด {showError && !photo && '(จำเป็น)'}
                </label>
                <label className="flex items-center justify-center gap-3 border-2 border-dashed border-blue-100 rounded-2xl p-6 bg-blue-50/30 cursor-pointer">
                  <Camera className="w-6 h-6 text-blue-500" />
                  <span className="font-black text-blue-600">{photo ? 'เปลี่ยนรูปภาพ' : 'คลิกเพื่อถ่ายรูป'}</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => {
                    const f = e.target.files?.[0];
                    if(f) {
                      const r = new FileReader();
                      r.onload = () => setPhoto(r.result as string);
                      r.readAsDataURL(f);
                    }
                  }} />
                </label>
             </div>
           </div>

           {photo && <img src={photo} className="w-full h-52 object-cover rounded-2xl border-4 border-white shadow-md" />}

           <button onClick={handleFinish} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition-all">
             บันทึกข้อมูลเรียบร้อย
           </button>
        </div>
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ status: MealStatus }> = ({ status }) => {
  const cfg: any = {
    [MealStatus.ORDERED]: { s: 'bg-blue-100 text-blue-700 border-blue-200', l: 'รับออเดอร์แล้ว' },
    [MealStatus.KITCHEN_READY]: { s: 'bg-orange-100 text-orange-700 border-orange-200', l: 'ครัวเสร็จสิ้น' },
    [MealStatus.DISPATCHED]: { s: 'bg-indigo-100 text-indigo-700 border-indigo-200', l: 'นำออกจากครัว' },
    [MealStatus.DELIVERED]: { s: 'bg-green-100 text-green-700 border-green-200', l: 'เสิร์ฟสำเร็จ' },
  };
  return <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight border ${cfg[status].s}`}>{cfg[status].l}</span>;
};

const Empty: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-24 opacity-20 flex flex-col items-center">
     <Clock className="w-16 h-16 mb-4" />
     <p className="font-black text-xl">{message}</p>
  </div>
);

export default App;
