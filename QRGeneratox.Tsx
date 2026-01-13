
import React from 'react';

interface QRGeneratorProps {
  value: string;
  size?: number;
}

const QRGenerator: React.FC<QRGeneratorProps> = ({ value, size = 128 }) => {
  // Use a reliable QR API for display in this sandbox environment
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-white p-2 rounded-xl shadow-inner border border-slate-100">
        <img src={qrUrl} alt="QR Code" width={size} height={size} className="rounded" />
      </div>
      <span className="text-[10px] text-slate-400 font-mono tracking-tighter">{value}</span>
    </div>
  );
};

export default QRGenerator;
