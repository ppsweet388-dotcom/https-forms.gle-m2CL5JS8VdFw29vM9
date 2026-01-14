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
      return (saved as UserRole) || null;
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

  const saveRole = (newRole: UserRole | null) => {
    setRole(newRole);
    if (newRole) localStorage.setItem('hft_user_role', newRole);
    else localStorage.removeItem('hft_user_role');
  };

  const pullFromCloud = useCallback(async () => {
    if (!roomId || isSyncing) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`https://kvdb.io/2zS78Xf9vV2wEwE1f7z8w9/${roomId}`);
      if (response.ok) {
        const cloudData: PatientOrder[] = await response.json();
        if (Array.isArray(cloudData)) {
          const oldOrders = ordersRef.current;
          if (oldOrders.length > 0 && JSON.stringify(cloudData) !== JSON.stringify(oldOrders)) {
             // Logic แจ้งเตือนออเดอร์ใหม่
             setOrders(cloudData);
          } else if (oldOrders.length === 0) {
             setOrders(cloudData);
          }
        }
      }
    } catch (e) {
      console.debug("Sync info unavailable");
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  }, [roomId, isSyncing]);

  const pushToCloud = async (data: PatientOrder[]) => {
    if (!roomId) return;
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
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl mx-auto mb-6">
            <Stethoscope className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">HFT <span className="text-blue-600">PRO</span></h1>
          <p className="text-slate-400 text-[10px] mt-3 tracking-[0.3em] uppercase font-bold">Hospital Food Tracking</p>
        </div>

        <div className="grid grid-cols-1 gap-4 w-full max-w-md">
          <RoleCard icon={<ClipboardList className="w-6 h-6" />} title="แอดมิน (Admin)" desc="ลงทะเบียนออเดอร์ผู้ป่วย" color="bg-blue-600" onClick={() => saveRole(UserRole.ADMIN)} />
          <RoleCard icon={<ChefHat className="w-6 h-6" />} title="แผนกครัว (Kitchen)" desc="รับออเดอร์และบันทึกการปรุง" color="bg-orange-500" onClick={() => saveRole(UserRole.KITCHEN)} />
          <RoleCard icon={<Truck className="w-6 h-6" />} title="แผนกเสิร์ฟ (Service)" desc="ยืนยันการเสิร์ฟอาหาร" color="bg-emerald-500" onClick={() => saveRole(UserRole.SERVICE)} />
          <RoleCard icon={<BarChart3 className="w-6 h-6" />} title="แดชบอร์ด (Monitor)" desc="ดูสถานะภาพรวม" color="bg-slate-800" onClick={() => saveRole(UserRole.DASHBOARD)} />
        </div>

        {showSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl">
              <Lock className="w-10 h-10 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-center mb-6">ตั้งค่ารหัสกลุ่มงาน (Group ID)</h2>
              <input 
                id="group-input" 
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-bold text-center uppercase mb-6 outline-none focus:border-blue-500" 
                placeholder="WARD-A" 
                defaultValue={roomId} 
              />
              <button 
                onClick={() => {
                  const val = (document.getElementById('group-input') as HTMLInputElement).value.toUpperCase().trim();
                  if (val) { setRoomId(val); localStorage.setItem('hft_room_id', val); setShowSyncModal(false); }
                }} 
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg"
              >
                บันทึกและเริ่มใช้งาน
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="glass border-b border-slate-200/60 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white"><Stethoscope className="w-5 h-5" /></div>
          <div>
            <div className="font-extrabold text-slate-900 leading-none">HFT <span className="text-blue-600">PRO</span></div>
            <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{roomId}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => pullFromCloud()} className="p-2 bg-white border border-slate-200 rounded-xl">
             <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-400'}`} />
           </button>
           <button onClick={() => saveRole(null)} className="p-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-500"><LogOut className="w-4 h-4" /></button>
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
  <button onClick={onClick} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 text-left hover:shadow-md transition-all w-full group">
    <div className={`${color} p-3 rounded-xl text-white shadow-lg group-hover:scale-110 transition-transform`}>{icon}</div>
    <div className="flex-1">
      <h3 className="text-md font-bold text-slate-900">{title}</h3>
      <p className="text-slate-400 text-xs">{desc}</p>
    </div>
    <ArrowRight className="text-slate-200 group-hover:text-blue-500 transition-all w-4 h-4" />
  </button>
);

export default App;
