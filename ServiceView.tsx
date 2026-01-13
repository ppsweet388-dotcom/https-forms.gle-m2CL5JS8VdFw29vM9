
import React, { useState } from 'react';
import { PatientOrder } from '../types';
import { Camera, Truck, CheckCircle2, UserCheck, Timer, ArrowRight } from 'lucide-react';

interface ServiceViewProps {
  orders: PatientOrder[];
  onUpdate: (order: PatientOrder) => void;
}

const ServiceView: React.FC<ServiceViewProps> = ({ orders, onUpdate }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runnerName, setRunnerName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [stage, setStage] = useState<'selection' | 'dispatch' | 'delivery'>('selection');

  const selectedOrder = orders.find(o => o.id === selectedId);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDispatch = () => {
    if (!selectedOrder || !runnerName || !photo) return alert('กรุณาระบุข้อมูลให้ครบ');
    onUpdate({
      ...selectedOrder,
      status: 'delivering',
      dispatch: {
        runnerName,
        dispatchedAt: new Date().toISOString(),
        photo
      }
    });
    setStage('selection');
    setSelectedId(null);
    setPhoto(null);
    alert('เริ่มการจัดส่งเรียบร้อย!');
  };

  const handleDelivery = () => {
    if (!selectedOrder || !runnerName || !photo) return alert('กรุณาระบุข้อมูลให้ครบ');
    onUpdate({
      ...selectedOrder,
      status: 'delivered',
      delivery: {
        serverName: runnerName,
        deliveredAt: new Date().toISOString(),
        photo
      }
    });
    setStage('selection');
    setSelectedId(null);
    setPhoto(null);
    alert('เสิร์ฟอาหารให้ผู้ป่วยเรียบร้อย!');
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {stage === 'selection' ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Timer className="text-green-500" /> อาหารที่พร้อมส่ง (Ready)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.filter(o => o.status === 'ready_to_serve').map(order => (
                <button 
                  key={order.id}
                  onClick={() => { setSelectedId(order.id); setStage('dispatch'); }}
                  className="flex justify-between items-center p-5 rounded-2xl bg-green-50 border border-green-100 hover:bg-green-100 transition-all text-left"
                >
                  <div>
                    <div className="font-bold text-slate-800">{order.patientName}</div>
                    <div className="text-sm text-green-700">ห้อง: {order.roomNumber}</div>
                  </div>
                  <ArrowRight className="text-green-600" />
                </button>
              ))}
              {orders.filter(o => o.status === 'ready_to_serve').length === 0 && (
                <p className="col-span-full py-10 text-center text-slate-400">ยังไม่มีอาหารที่ทำเสร็จ</p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Truck className="text-blue-500" /> กำลังจัดส่ง (In Progress)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.filter(o => o.status === 'delivering').map(order => (
                <button 
                  key={order.id}
                  onClick={() => { setSelectedId(order.id); setStage('delivery'); }}
                  className="flex justify-between items-center p-5 rounded-2xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-all text-left"
                >
                  <div>
                    <div className="font-bold text-slate-800">{order.patientName}</div>
                    <div className="text-sm text-blue-700">ห้อง: {order.roomNumber}</div>
                  </div>
                  <UserCheck className="text-blue-600" />
                </button>
              ))}
              {orders.filter(o => o.status === 'delivering').length === 0 && (
                <p className="col-span-full py-10 text-center text-slate-400">ยังไม่มีรายการที่กำลังจัดส่ง</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{stage === 'dispatch' ? '1. ก่อนออกแผนก' : '2. เสิร์ฟที่ข้างเตียง'}</h2>
            <button onClick={() => setStage('selection')} className="text-slate-400 text-sm">ย้อนกลับ</button>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl mb-6">
             <div className="font-bold">{selectedOrder?.patientName}</div>
             <div className="text-sm text-slate-500">ห้อง: {selectedOrder?.roomNumber} | HN: {selectedOrder?.hn}</div>
          </div>

          <div className="space-y-6">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อผู้เสิร์ฟ</label>
                <input 
                  className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="ระบุชื่อของคุณ..."
                  value={runnerName}
                  onChange={e => setRunnerName(e.target.value)}
                />
             </div>

             <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">ถ่ายรูปอาหาร ({stage === 'dispatch' ? 'ก่อนส่ง' : 'ถึงผู้ป่วย'})</label>
                <div className="relative aspect-square rounded-3xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                  {photo ? (
                    <>
                      <img src={photo} alt="Verification" className="w-full h-full object-cover" />
                      <button onClick={() => setPhoto(null)} className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full"><Camera className="w-5 h-5" /></button>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center">
                      <Camera className="w-12 h-12 text-slate-400 mb-2" />
                      <span className="text-sm text-slate-500 font-medium">กดถ่ายภาพยืนยัน</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
                    </label>
                  )}
                </div>
             </div>

             <button 
                onClick={stage === 'dispatch' ? handleDispatch : handleDelivery}
                className={`w-full ${stage === 'dispatch' ? 'bg-blue-600' : 'bg-green-600'} text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2`}
             >
               <CheckCircle2 /> {stage === 'dispatch' ? 'บันทึกเวลาออกแผนก' : 'ยืนยันการเสิร์ฟสำเร็จ'}
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceView;
