import React from 'react';
import { Settings, ShieldAlert } from 'lucide-react';

export const MaintenancePage = () => {
  return (
    <div className="min-h-screen bg-[#0b141a] flex flex-col items-center justify-center text-center p-4 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#006D77]/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#83C5BE]/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center animate-in zoom-in-95 duration-700">
        <div className="w-48 h-48 mb-8 relative">
            {/* 3D Icon Representation */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#006D77] to-[#83C5BE] rounded-3xl transform rotate-12 opacity-20 animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#006D77] to-[#004E56] rounded-3xl shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-500 border-t border-white/10">
                <Settings className="w-24 h-24 text-[#EDF6F5] animate-[spin_10s_linear_infinite]" />
            </div>
            <div className="absolute -bottom-4 -right-4 bg-yellow-500 rounded-full p-4 shadow-lg border-4 border-[#0b141a]">
                <ShieldAlert className="w-8 h-8 text-[#0b141a]" />
            </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          System <span className="text-[#83C5BE]">Maintenance</span>
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl max-w-lg mb-8 leading-relaxed">
          Voca is currently undergoing scheduled maintenance to improve your experience. We'll be back shortly.
        </p>

        <div className="flex items-center gap-2 px-4 py-2 bg-[#1f2c34] rounded-full border border-[#2a3942]">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-400 font-medium">Expected completion: Soon</span>
        </div>
      </div>
      
      <div className="absolute bottom-8 text-gray-600 text-sm">
        Voca Team &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
};
