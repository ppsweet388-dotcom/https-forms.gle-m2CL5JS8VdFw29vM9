import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserRole, PatientOrder } from './types';
import AdminView from './AdminView';
import KitchenView from './KitchenView';
import ServiceView from './ServiceView';
import Dashboard from './Dashboard';
import { 
  ChefHat, 
  ClipboardList, 
  Truck, 
  BarChart3, 
  Stethoscope, 
  ArrowRight, 
  LogOut,
  RotateCw,
  Lock,
  X,
  CheckCircle2
} from 'lucide-react';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  IconComponent: React.ElementType;
}

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(() => {
    try {
      const saved = localStorage.getItem('hft_user_role');
      return saved ? (saved as UserRole) : null;
    } catch (e) {
      return null;
    }
  });
  
  const [orders, setOrders] = useState<PatientOrder[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [roomId, setRoomId] = useState<string>(() => {
    try {
      return localStorage.getItem('hft_room_id') || '';
    } catch (e) {
      return '';
    }
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSyncModal, setShowSyncModal] = useState(() => !roomId);
  
  const ordersRef = useRef<PatientOrder[]>([]);
  useEffect(() => { 
    ordersRef.current = orders; 
  }, [orders]);

  const addNotification = useCallback((title: string, message: string, type: 'info' | 'success' | 'warning', IconComponent: React.ElementType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [{ id, title, message, type, IconComponent }, ...prev].slice(0, 3));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const saveRole = (newRole: UserRole | null) => {
    setRole(newRole);
    if (newRole) localStorage.setItem('hft_user_role', newRole);
    else localStorage.removeItem('hft_user_role');
  };

  const pullFromCloud = useCallback(async () => {
    if (!roomId || !navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`https://kvdb.io/2zS78Xf9vV2wEwE1f7z8w9/${roomId}`);
      if (response.ok) {
        const cloudData: PatientOrder[] = await response.json();
        if (Array.isArray(cloudData)) {
          const oldOrders = ordersRef.current;
          
          if (oldOrders.length > 0) {
            cloudData.forEach(newOrder => {
              const oldOrder = oldOrders.find(o => o.id === newOrder.id);
              if (!oldOrder) {
                addNotification('ออเดอร์ใหม่!', `คนไข้: ${newOrder.patientName}`, 'info', ClipboardList);
              } else if (oldOrder.status !== newOrder.status) {
                if (newOrder.status === 'ready_to_serve') {
                  addNotification('อาหารปรุงเสร็จแล้ว!', `คนไข้: ${newOrder.patientName}`, 'info', ChefHat);
                } else if (newOrder.status === 'delivered') {
                  addNotification('เสิร์ฟอาหารเรียบร้อย!', `คนไข้: ${newOrder.patientName}`, 'success', CheckCircle2);
                }
              }
            });
          }

          if (JSON.stringify(cloudData) !== JSON.stringify(oldOrders)) {
            setOrders(cloudData);
          }
        }
      }
    } catch (e) {
      console.debug("Sync failed");
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  }, [roomId, isSyncing, addNotification]);

  const pushToCloud = async (data: PatientOrder[]) => {
    if (!roomId || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      await fetch(`https://kvdb.io/2zS78Xf9vV2wEwE1f7z8w9/${roomId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.error("Cloud push failed");
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  useEffect(() => {
    if (!roomId) return;
    pullFromCloud();
    const interval = setInterval(pullFromCloud, 10000); 
    return () => clearInterval(interval);
  }, [roomId, pullFromCloud]);

  const updateOrder = (updated: PatientOrder) => {
    const newOrders = orders.map(o => o.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : o);
    setOrders(newOrders);
    pushToCloud(newOrders);
  };

  const addOrder = (newOrder: PatientOrder) => {
    const newOrders = [newOrder, ...orders];
    setOrders(newOrders);
    pushToCloud(newOrders);
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="mb-12">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 w-24 h-24 rounded-[2.5rem] flex items-center justify-center shadow-2xl mx-auto mb-6">
            <Stethoscope className="text-white w-12 h-12" />
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">HFT <span className="text-blue-600">PRO</span></h1>
          <p className="text-slate-400 text-[10px] mt-3 tracking-[0.3em] uppercase font-bold">Hospital Food Tracking System</p>
        </div>

        <div className="grid grid-cols-1 gap-4 w-full max-w-md">
          <RoleCard icon={<ClipboardList className="w-6 h-6" />} title="แอดมิน (Admin)" desc="ลงทะเบียนและคีย์ออเดอร์ผู้ป่วย" color="bg-blue-600" onClick={() => saveRole(UserRole.ADMIN)} />
          <RoleCard icon={<ChefHat className="w-6 h-6" />} title="แผนกครัว (Kitchen)" desc="รับออเดอร์และบันทึกการปรุง" color="bg-orange-500" onClick={() => saveRole(UserRole.KITCHEN)} />
          <RoleCard icon={<Truck className="w-6 h-6" />} title="แผนกเสิร์ฟ (Service)" desc="ยืนยันการเสิร์ฟอาหารข้างเตียง" color="bg-emerald-500" onClick={() => saveRole(UserRole.SERVICE)} />
          <RoleCard icon={<BarChart3 className="w-6 h-6" />} title="แดชบอร์ด (Monitor)" desc="ดูสถานะภาพรวมแบบเรียลไทม์" color="bg-slate-800" onClick={() => saveRole(UserRole.DASHBOARD)} />
        </div>

        <button onClick={() => setShowSyncModal(true)} className="mt-10 text-slate-400 hover:text-blue-600 flex items-center gap-2 text-sm font-bold transition-colors">
          <Lock className="w-4 h-4" />
          {roomId ? `กลุ่มงาน: ${roomId}` : 'ตั้งค่ารหัสกลุ่มงาน'}
        </button>

        {showSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-xl">
            <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl animate-fade-in">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-center mb-2">ระบุรหัสกลุ่มงาน</h2>
              <p className="text-slate-400 text-center text-sm mb-8 font-medium">เพื่อซิงค์ข้อมูลภายในแผนกเดียวกัน</p>
              
              <input id="group-input" className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-2xl font-bold text-center uppercase mb-6 outline-none focus:border-blue-500 transition-all" placeholder="WARD7" defaultValue={roomId} autoFocus />
              <button onClick={() => {
                const val = (document.getElementById('group-input') as HTMLInputElement).value.toUpperCase().trim();
                if (val) { setRoomId(val); localStorage.setItem('hft_room_id', val); setShowSyncModal(false); }
              }} className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-5 rounded-[2rem] shadow-xl text-lg transition-all active:scale-95">เริ่มใช้งาน</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="fixed top-20 right-4 left-4 sm:left-auto sm:right-6 z-[60] flex flex-col gap-3 max-w-sm ml-auto">
        {notifications.map(note => (
          <div key={note.id} className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-4 flex items-center gap-4 animate-fade-in">
            <div className={`p-2.5 rounded-xl ${note.type === 'success' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
              <note.IconComponent className={`w-5 h-5 ${note.type === 'success' ? 'text-emerald-600' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1">
              <div className="text-xs font-black text-slate-900 leading-tight">{note.title}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-0.5">{note.message}</div>
            </div>
            <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== note.id))} className="text-slate-300 hover:text-slate-500"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <header className="glass border-b border-slate-200/60 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-xl text-white shadow-lg"><Stethoscope className="w-5 h-5" /></div>
          <div>
            <div className="font-extrabold text-slate-900 leading-none text-lg">HFT <span className="text-blue-600">PRO</span></div>
            <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{String(role)} | {roomId}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => pullFromCloud()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl">
             <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-400'}`} />
             <span className="text-xs font-bold hidden sm:inline">รีเฟรช</span>
           </button>
           <button onClick={() => saveRole(null)} className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-500"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto mt-6 px-4">
        {role === UserRole.ADMIN && <AdminView orders={orders} onAdd={addOrder} />}
        {role === UserRole.KITCHEN && <KitchenView orders={orders} onUpdate={updateOrder} />}
        {role === UserRole.SERVICE && <ServiceView orders={orders} onUpdate={updateOrder} />}
        {role === UserRole.DASHBOARD && <Dashboard orders={orders} />}
      </main>
    </div>
  );
};

const RoleCard = ({ icon, title, desc, color, onClick }: any) => (
  <button onClick={onClick} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5 text-left hover:shadow-xl hover:border-blue-100 group transition-all w-full">
    <div className={`${color} p-4 rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform`}>{icon}</div>
    <div className="flex-1">
      <h3 className="text-lg font-bold text-slate-900 mb-0.5">{title}</h3>
      <p className="text-slate-400 text-xs font-medium">{desc}</p>
    </div>
    <ArrowRight className="text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all w-5 h-5" />
  </button>
);

export default App;
