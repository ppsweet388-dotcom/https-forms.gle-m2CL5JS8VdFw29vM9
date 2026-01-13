
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserRole, PatientOrder } from './types';
import AdminView from './components/AdminView';
import KitchenView from './components/KitchenView';
import ServiceView from './components/ServiceView';
import Dashboard from './components/Dashboard';
import { 
  ChefHat, 
  ClipboardList, 
  Truck, 
  BarChart3, 
  Stethoscope, 
  ArrowRight, 
  Settings, 
  LogOut,
  Wifi,
  WifiOff
} from 'lucide-react';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(() => localStorage.getItem('hft_user_role') as UserRole || null);
  const [orders, setOrders] = useState<PatientOrder[]>([]);
  const [roomId, setRoomId] = useState<string>(() => localStorage.getItem('hft_room_id') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSyncModal, setShowSyncModal] = useState(!localStorage.getItem('hft_room_id'));
  
  const ordersRef = useRef<PatientOrder[]>([]);
  useEffect(() => { 
    ordersRef.current = orders; 
  }, [orders]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveRole = (newRole: UserRole | null) => {
    setRole(newRole);
    if (newRole) {
      localStorage.setItem('hft_user_role', newRole);
    } else {
      localStorage.removeItem('hft_user_role');
    }
  };

  const pullFromCloud = useCallback(async () => {
    if (!roomId || !navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`https://kvdb.io/2zS78Xf9vV2wEwE1f7z8w9/${roomId}`);
      if (response.ok) {
        const cloudData: PatientOrder[] = await response.json();
        // Simple deep comparison to prevent unnecessary state updates
        if (JSON.stringify(cloudData) !== JSON.stringify(ordersRef.current)) {
          setOrders(cloudData);
        }
      }
    } catch (e) {
      console.debug("Background sync in progress...");
    } finally {
      setIsSyncing(false);
    }
  }, [roomId, isSyncing]);

  const pushToCloud = async (data: PatientOrder[]) => {
    if (!roomId || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      await fetch(`https://kvdb.io/2zS78Xf9vV2wEwE1f7z8w9/${roomId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.error("Failed to sync to cloud:", e);
    } finally {
      setIsSyncing(false);
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
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xl mb-12 flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
           <div className="flex items-center gap-2">
             {isOnline ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-rose-500" />}
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{isOnline ? 'Online' : 'Offline'}</span>
           </div>
           <button onClick={() => setShowSyncModal(true)} className="text-blue-600 text-xs font-bold bg-blue-50 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors hover:bg-blue-100">
             <Settings className="w-3 h-3" /> {roomId || 'ตั้งค่ากลุ่ม'}
           </button>
        </div>

        <div className="text-center mb-10">
          <div className="bg-blue-600 w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl mx-auto mb-6">
            <Stethoscope className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-slate-900">HFT PRO</h1>
          <p className="text-slate-500 text-xs mt-2 tracking-widest uppercase font-bold">Hospital Food Tracking</p>
        </div>

        <div className="grid grid-cols-1 gap-4 w-full max-w-xl">
          <RoleCard icon={<ClipboardList />} title="แอดมิน" desc="คีย์ออเดอร์ใหม่" color="bg-blue-600" onClick={() => saveRole(UserRole.ADMIN)} />
          <RoleCard icon={<ChefHat />} title="แผนกครัว" desc="เตรียมอาหาร" color="bg-orange-500" onClick={() => saveRole(UserRole.KITCHEN)} />
          <RoleCard icon={<Truck />} title="แผนกเสิร์ฟ" desc="ส่งอาหาร" color="bg-emerald-500" onClick={() => saveRole(UserRole.SERVICE)} />
          <RoleCard icon={<BarChart3 />} title="แดชบอร์ด" desc="ดูภาพรวม" color="bg-slate-800" onClick={() => saveRole(UserRole.DASHBOARD)} />
        </div>

        {showSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
              <h2 className="text-2xl font-bold text-center mb-6 text-slate-900">รหัสกลุ่ม (Group ID)</h2>
              <input 
                id="roomIdInput"
                className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-2xl font-bold text-center uppercase mb-6 outline-none focus:border-blue-500 transition-all"
                placeholder="เช่น WARD7"
                defaultValue={roomId}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.currentTarget.value).toUpperCase().trim();
                    if (val) {
                      setRoomId(val);
                      localStorage.setItem('hft_room_id', val);
                      setShowSyncModal(false);
                      // Trigger pull after setting room
                      setTimeout(() => pullFromCloud(), 100);
                    }
                  }
                }}
              />
              <button onClick={() => {
                const val = (document.getElementById('roomIdInput') as HTMLInputElement).value.toUpperCase().trim();
                if (val) {
                  setRoomId(val);
                  localStorage.setItem('hft_room_id', val);
                  setShowSyncModal(false);
                  setTimeout(() => pullFromCloud(), 100);
                }
              }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-[2rem] shadow-xl transition-all active:scale-95">
                ตกลง
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="glass border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-slate-900 leading-none">HFT PRO</div>
            <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{role}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold border ${isSyncing ? 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
             {isSyncing ? 'SYNCING...' : roomId}
           </div>
           <button onClick={() => saveRole(null)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-500 hover:border-rose-200 shadow-sm transition-all active:scale-90">
             <LogOut className="w-5 h-5" />
           </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto mt-6 px-4">
        {role === UserRole.ADMIN && <AdminView orders={orders} onAdd={addOrder} />}
        {role === UserRole.KITCHEN && <KitchenView orders={orders} onUpdate={updateOrder} />}
        {role === UserRole.SERVICE && <ServiceView orders={orders} onUpdate={updateOrder} />}
        {role === UserRole.DASHBOARD && <Dashboard orders={orders} roomId={roomId} />}
      </main>
    </div>
  );
};

interface RoleCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
  onClick: () => void;
}

const RoleCard: React.FC<RoleCardProps> = ({ icon, title, desc, color, onClick }) => (
  <button onClick={onClick} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200/50 flex items-center gap-6 text-left hover:shadow-xl group transition-all">
    <div className={`${color} p-5 rounded-2xl text-white shadow-xl group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <div className="flex-1">
      <h3 className="text-xl font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-slate-400 text-xs font-medium">{desc}</p>
    </div>
    <ArrowRight className="text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
  </button>
);

export default App;
