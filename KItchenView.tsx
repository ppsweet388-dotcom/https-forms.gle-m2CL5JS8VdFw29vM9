
import React, { useState } from 'react';
import { PatientOrder } from '../types';
import { Camera, ChefHat, CheckCircle2, Scan } from 'lucide-react';

interface KitchenViewProps {
  orders: PatientOrder[];
  onUpdate: (order: PatientOrder) => void;
}

const KitchenView: React.FC<KitchenViewProps> = ({ orders, onUpdate }) => {
  const [scanning, setScanning] = useState(false);
  const [scanId, setScanId] = useState('');
  const [chefName, setChefName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  const pendingOrders = orders.filter(o => o.status === 'ordered');
  const selectedOrder = orders.find(o => o.id === scanId);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = () => {
    if (!selectedOrder || !chefName || !photo) {
      alert('กรุณาระบุชื่อเชฟและถ่ายรูปอาหาร');
      return;
    }

    onUpdate({
      ...selectedOrder,
      status: 'ready_to_serve',
      kitchen: {
        chefName,
        finishedAt: new Date().toISOString(),
        photo
      }
    });
    
    // Reset state
    setScanId('');
    setChefName('');
    setPhoto(null);
    setScanning(false);
    alert('บันทึกความเรียบร้อยแล้ว!');
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <ChefHat className="text-orange-500" />
          <h2 className="text-xl font-bold">แผนกครัว: บันทึกรายการที่ทำเสร็จ</h2>
        </div>

        {!selectedOrder ? (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingOrders.map(order => (
                  <button 
                    key={order.id}
                    onClick={() => setScanId(order.id)}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 transition-all text-left group"
                  >
                    <div className="bg-white p-3 rounded-xl shadow-sm group-hover:bg-orange-100 transition-colors">
                      <Scan className="text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800">{order.patientName}</div>
                      <div className="text-sm text-slate-500">HN: {order.hn} | ห้อง: {order.roomNumber}</div>
                    </div>
                    <div className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded">รอทำ</div>
                  </button>
                ))}
                {pendingOrders.length === 0 && (
                   <div className="col-span-full py-10 text-center text-slate-400">ยังไม่มีรายการสั่งอาหารใหม่</div>
                )}
             </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6">
                <div className="flex justify-between items-start">
                   <div>
                     <h3 className="text-xl font-bold text-slate-900">{selectedOrder.patientName}</h3>
                     <p className="text-slate-600">รายการ: <span className="font-medium text-orange-700">{selectedOrder.foodList}</span></p>
                     <p className="text-sm text-slate-500 mt-1">ประเภท: {selectedOrder.foodType}</p>
                   </div>
                   <button onClick={() => setScanId('')} className="text-slate-400 text-sm hover:underline">ยกเลิก</button>
                </div>
                {selectedOrder.restrictions && (
                  <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100">
                     หมายเหตุ: {selectedOrder.restrictions}
                  </div>
                )}
             </div>

             <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อผู้ประกอบอาหาร (เชฟ)</label>
                  <input 
                    className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="ระบุชื่อของคุณ..."
                    value={chefName}
                    onChange={e => setChefName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">ถ่ายรูปอาหารที่เสร็จสมบูรณ์</label>
                  <div className="relative aspect-video rounded-3xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                    {photo ? (
                      <>
                        <img src={photo} alt="Food" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setPhoto(null)}
                          className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg"
                        >
                          <Camera className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center">
                        <Camera className="w-12 h-12 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-500">กดเพื่อเปิดกล้อง</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
                      </label>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleComplete}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <CheckCircle2 />
                  บันทึกอาหารเสร็จสมบูรณ์
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KitchenView;
