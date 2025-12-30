import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Monitor, Smartphone, Apple, Share, PlusSquare, MoreVertical, Download, Check, Laptop } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DownloadPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>('ios');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', () => setIsInstalled(true));
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const guides = {
    ios: [
      { icon: Share, title: "Tap Share", desc: "Tap the Share button in Safari's bottom bar." },
      { icon: PlusSquare, title: "Add to Home Screen", desc: "Scroll down and select 'Add to Home Screen'." },
      { icon: Check, title: "Confirm", desc: "Tap 'Add' in the top right corner." }
    ],
    android: [
      { icon: MoreVertical, title: "Open Menu", desc: "Tap the three dots in Chrome's top right corner." },
      { icon: Download, title: "Install App", desc: "Select 'Install app' or 'Add to Home screen'." },
      { icon: Check, title: "Confirm", desc: "Follow the prompt to install securely." }
    ],
    desktop: [
      { icon: Laptop, title: "Browser Install", desc: "Look for the install icon in your address bar." },
      { icon: Download, title: "Click Install", desc: "Click the icon and confirm installation." },
      { icon: Monitor, title: "Launch", desc: "Voca will launch as a native desktop app." }
    ]
  };

  return (
    <div className="min-h-screen bg-[#0f1c24] text-white font-sans selection:bg-[#006D77] selection:text-white" style={{ paddingBottom: '120px' }}>
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-[#0f1c24]/80 backdrop-blur-md border-b border-white/5 top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-white hover:bg-white/5 gap-2"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-[#006D77] to-[#83C5BE] rounded-lg flex items-center justify-center shadow-lg shadow-[#006D77]/20">
              <span className="font-bold text-white text-sm">V</span>
            </div>
            <span className="font-bold text-xl">Download</span>
          </div>
          <Button
            className="hidden sm:flex bg-[#006D77] hover:bg-[#005a63] text-white rounded-full px-6 shadow-lg shadow-[#006D77]/20"
            onClick={() => navigate('/signup')}
          >
            Open Web App
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: '140px', paddingBottom: '60px' }} className="px-6 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[#006D77] rounded-full blur-[150px] opacity-10 pointer-events-none" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#83C5BE] text-sm font-medium mb-6 backdrop-blur-sm">
            Progressive Web App
          </motion.div>
          <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Install Voca everywhere.
          </motion.h1>
          <motion.p variants={itemVariants} className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Experience near-native performance without the App Store. Install Voca directly from your browser.
          </motion.p>
        </motion.div>
      </section>

      {/* Interactive Guide */}
      <section style={{ marginTop: '40px', marginBottom: '60px' }} className="max-w-5xl mx-auto px-6 w-full">
        <div className="bg-[#1f2c34]/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl overflow-hidden relative">

          {/* Tabs */}
          <div className="flex justify-center mb-16">
            <div className="flex bg-[#0f1c24] p-1.5 rounded-full border border-white/5 relative">
              {(['ios', 'android', 'desktop'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-8 py-3 rounded-full text-sm font-semibold transition-all duration-300 z-10 flex items-center gap-2 ${activeTab === tab ? 'text-white' : 'text-gray-400 hover:text-white'
                    }`}
                >
                  {tab === 'ios' && <Apple className="w-4 h-4" />}
                  {tab === 'android' && <Smartphone className="w-4 h-4" />}
                  {tab === 'desktop' && <Laptop className="w-4 h-4" />}
                  <span className="capitalize">{tab === 'desktop' ? 'Windows / Mac' : tab}</span>
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-[#006D77] rounded-full shadow-lg shadow-[#006D77]/25"
                      style={{ zIndex: -1 }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Guide Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              {/* Visual Preview */}
              <div className="relative flex justify-center order-2 md:order-1">
                {/* Phone Mockup Frame */}
                <div className={`relative border-gray-800 bg-gray-900 border-[8px] rounded-[2.5rem] shadow-2xl ${activeTab === 'desktop' ? 'w-[400px] h-[250px] border-b-[12px] rounded-lg' : 'h-[500px] w-[260px]'}`}>
                  <div className="w-full h-full bg-[#0f1c24] overflow-hidden relative rounded-[2rem]">
                    {/* Mock UI Header */}
                    <div className="h-10 bg-[#1f2c34] flex items-center px-4 justify-between border-b border-white/5">
                      <div className="w-12 h-2 rounded bg-white/10" />
                      <div className="flex gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      </div>
                    </div>

                    {/* Mock Page Content */}
                    <div className="p-4 space-y-3">
                      <div className="w-16 h-16 bg-[#006D77] rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-[#006D77]/20">
                        <span className="text-white font-bold text-2xl">V</span>
                      </div>
                      <div className="h-3 bg-white/10 rounded w-3/4 mx-auto" />
                      <div className="h-2 bg-white/5 rounded w-1/2 mx-auto" />

                      {/* Specific Platform Hint */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-8 p-3 bg-[#006D77]/20 border border-[#006D77]/30 rounded-xl flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-[#006D77] rounded-lg flex items-center justify-center shrink-0">
                          {activeTab === 'ios' && <Share className="w-4 h-4 text-white" />}
                          {activeTab === 'android' && <Download className="w-4 h-4 text-white" />}
                          {activeTab === 'desktop' && <Monitor className="w-4 h-4 text-white" />}
                        </div>
                        <div className="text-xs text-[#83C5BE]">
                          {activeTab === 'ios' && "Tap 'Share' below"}
                          {activeTab === 'android' && "Tap 'Install' here"}
                          {activeTab === 'desktop' && "Click icon in URL bar"}
                        </div>
                      </motion.div>

                      {/* Render Real Install Button for Desktop/Android if supported */}
                      {deferredPrompt && activeTab !== 'ios' && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mt-4"
                        >
                          <Button
                            onClick={handleInstallClick}
                            className="w-full bg-white text-[#0f1c24] hover:bg-gray-100 font-bold"
                          >
                            Install Now
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Abstract background glow behind phone */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#006D77] rounded-full blur-[100px] opacity-20 -z-10" />
              </div>

              {/* Steps List */}
              <div className="order-1 md:order-2 space-y-8">
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold flex items-center gap-3">
                    {activeTab === 'ios' && <Apple className="w-8 h-8 text-[#83C5BE]" />}
                    {activeTab === 'android' && <Smartphone className="w-8 h-8 text-[#83C5BE]" />}
                    {activeTab === 'desktop' && <Monitor className="w-8 h-8 text-[#83C5BE]" />}
                    <span>Install on {activeTab === 'desktop' ? 'PC / Mac' : activeTab === 'ios' ? 'iOS' : 'Android'}</span>
                  </h3>
                  <p className="text-gray-400">Follow these simple steps to add Voca to your device.</p>
                </div>

                <div className="space-y-6">
                  {guides[activeTab].map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex gap-4 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#006D77] group-hover:border-[#006D77] transition-all duration-300 shadow-lg group-hover:shadow-[#006D77]/25 shrink-0">
                        <step.icon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-200 group-hover:text-[#83C5BE] transition-colors">{step.title}</h4>
                        <p className="text-sm text-gray-500 group-hover:text-gray-300 transition-colors">{step.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Desktop Install Button (Outside of mockup) */}
                {deferredPrompt && activeTab === 'desktop' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Button
                      onClick={handleInstallClick}
                      size="lg"
                      className="bg-[#006D77] hover:bg-[#005a63] text-white rounded-full px-8 shadow-xl shadow-[#006D77]/30"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Install for Desktop
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* QR Code Section */}
      <section style={{ marginTop: '60px' }} className="text-center px-6">
        <div className="inline-block p-8 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="bg-white p-3 rounded-xl shadow-lg">
              {/* Cloudinary QR Code */}
              <img
                src="https://res.cloudinary.com/dfvc27xla/image/upload/v1767078184/adobe-express-qr-code_aeas3l.svg"
                alt="Scan to download Voca"
                className="w-32 h-32 rounded-lg"
              />
            </div>
            <div className="text-left">
              <h4 className="text-xl font-bold mb-2">Scan to install on mobile</h4>
              <p className="text-gray-400 text-sm max-w-[200px]">Point your camera at this QR code to open Voca on your phone immediately.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
