
import React, { useState } from 'react';
import { PatientOrder } from '../types';
import QRGenerator from './QRGenerator';
import { PlusCircle, Search, ClipboardList, User, MapPin, Activity, Utensils, AlertCircle } from 'lucide-react';

interface AdminViewProps {
  orders: PatientOrder[];
  onAdd: (order: PatientOrder) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ orders, onAdd }) => {
  const [formData, setFormData] = useState({
    patientName: '',
    hn: '',
    roomNumber: '',
    foodType: 'ปกติ (Normal)',
    restrictions: '',
    foodList: '',
    adminName: localStorage.getItem('hft_last_admin') || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newOrder: PatientOrder = {
      ...formData,
      id: crypto.randomUUID(),
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ordered'
    };
    onAdd(newOrder);
    localStorage.setItem('hft_last_admin', formData.adminName);
    setFormData({
      ...formData,
      patientName: '',
      hn: '',
      roomNumber: '',
      restrictions: '',
      foodList: '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-10 pb-10">
      <section className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-200/40 border border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 pointer-events-none">
          <PlusCircle className="w-64 h-64 text-blue-900" />
        </div>
        
        <div className="flex items-center gap-4 mb-10 relative z-10">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
            <PlusCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-900">คีย์ออเดอร์ใหม่</h2>
            <p className="text-slate-400 text-sm font-medium">ข้อมูลจะถูกซิงค์ไปยังแผนกครัวโดยอัตโนมัติ</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 relative z-10">
          <div className="space-y-6">
            <InputField 
              label="ชื่อ-นามสกุล ผู้ป่วย" 
              icon={<User className="w-4 h-4" />}
              value={formData.patientName} 
              onChange={v => setFormData({...formData, patientName: v})} 
              required
              placeholder="ระบุชื่อจริง-นามสกุล"
            />
            <div className="grid grid-cols-2 gap-6">
              <InputField 
                label="HN" 
                icon={<Activity className="w-4 h-4" />}
                value={formData.hn} 
                onChange={v => setFormData({...formData, hn: v})} 
                required
                placeholder="เลข HN"
              />
              <InputField 
                label="เลขห้อง" 
                icon={<MapPin className="w-4 h-4" />}
                value={formData.roomNumber} 
                onChange={v => setFormData({...formData, roomNumber: v})} 
                required
                placeholder="Ex. 701"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                <Utensils className="w-4 h-4" /> ประเภทอาหาร
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['ปกติ (Normal)', 'อ่อน (Soft Diet)', 'เหลว (Liquid Diet)', 'เบาหวาน (DM)', 'โรคไต (Renal)', 'อื่นๆ'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({...formData, foodType: type})}
                    className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all border ${
                      formData.foodType === type 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' 
                      : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
             <InputField 
              label="หมายเหตุ / แพ้อาหาร" 
              icon={<AlertCircle className="w-4 h-4 text-rose-400" />}
              placeholder="ถ้าไม่มีให้เว้นว่างไว้"
              value={formData.restrictions} 
              onChange={v => setFormData({...formData, restrictions: v})} 
            />
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">รายการเมนูที่สั่ง</label>
              <textarea 
                required
                rows={4}
                placeholder="พิมพ์รายการอาหารที่นี่..."
                className="w-full px-6 py-5 rounded-[2rem] border border-slate-200 focus:ring-8 focus:ring-blue-50 outline-none transition-all resize-none bg-slate-50 font-medium text-slate-700"
                value={formData.foodList}
                onChange={e => setFormData({...formData, foodList: e.target.value})}
              />
            </div>
            <InputField 
              label="ชื่อแอดมินผู้บันทึก" 
              icon={<User className="w-4 h-4 text-slate-300" />}
              placeholder="ใส่ชื่อของคุณ"
              value={formData.adminName} 
              onChange={v => setFormData({...formData, adminName: v})} 
              required
            />
          </div>

          <div className="md:col-span-2 pt-6">
            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold py-6 rounded-[2.5rem] shadow-2xl shadow-blue-200 transition-all active:scale-[0.97] text-xl flex items-center justify-center gap-3"
            >
              <PlusCircle className="w-6 h-6" />
              ลงทะเบียนและส่งเข้าครัว
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-8">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
              <ClipboardList className="w-6 h-6 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">ออเดอร์รอการปรุง ({orders.filter(o => o.status === 'ordered').length})</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {orders.filter(o => o.status === 'ordered').map(order => (
            <div key={order.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col items-center hover:shadow-2xl transition-all order-card group">
              <div className="relative group-hover:scale-105 transition-transform">
                <div className="absolute inset-0 bg-blue-50 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <QRGenerator value={order.id} size={160} />
                </div>
              </div>
              <div className="mt-8 text-center w-full">
                <h3 className="font-extrabold text-xl text-slate-900 mb-2">{order.patientName}</h3>
                <div className="flex justify-center items-center gap-2 mb-4">
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">HN: {order.hn}</span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full uppercase tracking-widest">Room {order.roomNumber}</span>
                </div>
                <div className="p-4 bg-slate-50/50 rounded-2xl text-slate-600 text-xs text-left leading-relaxed">
                   <div className="font-extrabold text-blue-600 mb-1 uppercase tracking-tighter">Menu Items:</div>
                   {order.foodList}
                </div>
              </div>
            </div>
          ))}
          {orders.filter(o => o.status === 'ordered').length === 0 && (
            <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 shadow-inner">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-slate-200" />
              </div>
              <p className="text-slate-400 font-bold text-lg">ยังไม่มีรายการอาหารที่รอปรุงในขณะนี้</p>
              <p className="text-slate-300 text-sm mt-1">คีย์ออเดอร์ใหม่เพื่อเริ่มการทำงาน</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const InputField = ({ label, icon, value, onChange, required, placeholder }: any) => (
  <div>
    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
      {icon} {label}
    </label>
    <input 
      required={required}
      placeholder={placeholder}
      className="w-full px-6 py-5 rounded-[2rem] border border-slate-200 focus:ring-8 focus:ring-blue-50 outline-none transition-all bg-slate-50 font-bold text-slate-800 placeholder:text-slate-300"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

export default AdminView;
