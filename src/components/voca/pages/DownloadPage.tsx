import React from 'react';
import { Button } from '../../ui/button';
import { motion } from 'motion/react';
import { ArrowLeft, Monitor, Smartphone, Apple, Laptop } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DownloadPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f1c24] text-white font-sans selection:bg-[#006D77] selection:text-white">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-[#0f1c24]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-white hover:bg-white/5 gap-2"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl">Download Voca</span>
          </div>
          <Button
            className="bg-[#006D77] hover:bg-[#005a63] text-white rounded-full px-6"
            onClick={() => navigate('/signup')}
          >
            Web App
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-bold mb-6"
        >
          Voca on every device.
        </motion.h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Sync your conversations seamlessly across all your devices.
        </p>
      </section>

      {/* Platforms */}
      <section className="py-12 px-6 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">

          {/* Mobile */}
          <div className="bg-[#1f2c34] rounded-3xl p-10 border border-white/5 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-[#006D77]/20 rounded-full flex items-center justify-center mb-8">
              <Smartphone className="w-10 h-10 text-[#83C5BE]" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Mobile</h3>
            <p className="text-gray-400 mb-8">Stay connected on the go.</p>
            <div className="space-y-4 w-full max-w-xs">
              <Button variant="outline" className="w-full h-12 bg-white/5 hover:bg-white/10 border-white/10 justify-start px-6 gap-3">
                <Apple className="w-5 h-5" />
                <span>Download for iOS</span>
              </Button>
              <Button variant="outline" className="w-full h-12 bg-white/5 hover:bg-white/10 border-white/10 justify-start px-6 gap-3">
                <Smartphone className="w-5 h-5" />
                <span>Download for Android</span>
              </Button>
            </div>
          </div>

          {/* Desktop */}
          <div className="bg-[#1f2c34] rounded-3xl p-10 border border-white/5 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-[#006D77]/20 rounded-full flex items-center justify-center mb-8">
              <Monitor className="w-10 h-10 text-[#83C5BE]" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Desktop</h3>
            <p className="text-gray-400 mb-8">Power user productivity.</p>
            <div className="space-y-4 w-full max-w-xs">
              <Button variant="outline" className="w-full h-12 bg-white/5 hover:bg-white/10 border-white/10 justify-start px-6 gap-3">
                <Apple className="w-5 h-5" />
                <span>Download for Mac</span>
              </Button>
              <Button variant="outline" className="w-full h-12 bg-white/5 hover:bg-white/10 border-white/10 justify-start px-6 gap-3">
                <Laptop className="w-5 h-5" />
                <span>Download for Windows</span>
              </Button>
            </div>
          </div>

        </div>
      </section>

      {/* QR Code Section */}
      <section className="py-20 text-center">
        <div className="inline-block p-8 bg-white rounded-3xl shadow-xl">
          <div className="w-48 h-48 bg-gray-900 rounded-lg flex items-center justify-center text-white text-xs mb-4">
            [QR Code Placeholder]
          </div>
          <p className="text-gray-900 font-medium">Scan to download</p>
        </div>
      </section>
    </div>
  );
};
