import React from 'react';
import { Button } from '../ui/button';
import { ArrowRight, Shield, Globe, Zap, MessageCircle, Lock, Smartphone, Menu, Mail, Edit2, Trash2, Star, Users, Video, Mic } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "../ui/sheet";

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f1c24] text-white selection:bg-[#006D77] selection:text-white font-sans overflow-x-hidden">

      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-[#0f1c24]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#006D77] to-[#83C5BE] rounded-xl flex items-center justify-center shadow-lg shadow-[#006D77]/20">
              <span className="font-bold text-xl text-white">V</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">Voca</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <button onClick={() => navigate('/features')} className="hover:text-white transition-colors">Features</button>
            <button onClick={() => navigate('/security')} className="hover:text-white transition-colors">Security</button>
            <button onClick={() => navigate('/download')} className="hover:text-white transition-colors">Download</button>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Button
              className="text-white bg-transparent hover:bg-white/10 border border-white/20 rounded-full px-6 transition-all hover:scale-105"
              onClick={() => navigate('/login')}
            >
              Log In
            </Button>
            <Button
              className="bg-[#006D77] hover:bg-[#005a63] text-white rounded-full px-6 shadow-lg shadow-[#006D77]/20 transition-all hover:scale-105"
              onClick={() => navigate('/signup')}
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[#0f1c24]/95 backdrop-blur-xl border-l border-white/10 text-white w-full sm:max-w-sm p-0">
                <div className="p-6 h-full flex flex-col">
                  <SheetHeader className="mb-8">
                    <SheetTitle className="text-white text-left text-2xl font-bold flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-tr from-[#006D77] to-[#83C5BE] rounded-xl flex items-center justify-center shadow-lg shadow-[#006D77]/20">
                        <span className="font-bold text-white text-xl">V</span>
                      </div>
                      <span className="tracking-tight">Voca</span>
                    </SheetTitle>
                    <SheetDescription className="text-gray-400 text-left">
                      Navigate through Voca's services and features.
                    </SheetDescription>
                  </SheetHeader>

                  <div className="flex-1 flex flex-col gap-2">
                    {[
                      { label: 'Features', action: () => navigate('/features'), icon: Zap },
                      { label: 'Security', action: () => navigate('/security'), icon: Shield },
                      { label: 'Download', action: () => navigate('/download'), icon: Smartphone },
                    ].map((item, i) => (
                      <button
                        key={i}
                        onClick={item.action}
                        className="group flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all active:scale-[0.98] border border-transparent hover:border-white/5"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#1f2c34] flex items-center justify-center group-hover:bg-[#006D77]/20 transition-colors">
                            <item.icon className="w-5 h-5 text-gray-400 group-hover:text-[#83C5BE]" />
                          </div>
                          <span className="text-lg font-medium text-gray-200 group-hover:text-white">{item.label}</span>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-white -translate-x-2 group-hover:translate-x-0 transition-all opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-4 mt-auto pt-8 border-t border-white/5">
                    <Button
                      className="w-full h-14 bg-[#1f2c34] hover:bg-[#2a3b47] text-white border border-white/10 rounded-2xl text-lg font-medium transition-transform active:scale-[0.98]"
                      onClick={() => navigate('/login')}
                    >
                      Log In
                    </Button>
                    <Button
                      className="w-full h-14 bg-gradient-to-r from-[#006D77] to-[#005a63] hover:from-[#005a63] hover:to-[#004e56] text-white rounded-2xl text-lg font-bold shadow-xl shadow-[#006D77]/20 transition-transform active:scale-[0.98]"
                      onClick={() => navigate('/signup')}
                    >
                      Get Started
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
        {/* Abstract Background Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
          <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] bg-[#006D77] rounded-full blur-[120px] opacity-20 animate-pulse" />
          <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-[#83C5BE] rounded-full blur-[120px] opacity-10" />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-[#83C5BE] mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#83C5BE] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#83C5BE]"></span>
              </span>
              v2.0 is now live
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
              Connect globally. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#83C5BE] to-[#006D77]">
                Securely.
              </span>
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-lg leading-relaxed">
              Experience the next generation of messaging. End-to-end encryption, high-fidelity calls, and a design that respects your focus.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="h-14 px-8 text-lg bg-white text-[#0f1c24] hover:bg-gray-100 rounded-full font-semibold shadow-xl shadow-white/5 transition-transform hover:-translate-y-1"
                onClick={() => navigate('/signup')}
              >
                Start Chatting <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg border-white/20 bg-white/10 text-white hover:bg-white/20 rounded-full backdrop-blur-md shadow-lg transition-all hover:scale-105"
                onClick={() => navigate('/demo')}
              >
                View Demo
              </Button>
            </div>

            <div className="mt-12 flex items-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#83C5BE]" />
                <span>E2E Encrypted</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#83C5BE]" />
                <span>Global CDN</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            {/* Mock App Interface */}
            <div className="relative mx-auto border-gray-800 bg-gray-800 border-[8px] rounded-[2.5rem] h-[600px] w-[300px] md:w-[350px] shadow-2xl">
              <div className="h-[32px] w-[3px] bg-gray-800 absolute -start-[17px] top-[72px] rounded-s-lg"></div>
              <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
              <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
              <div className="h-[64px] w-[3px] bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>
              <div className="rounded-[2rem] overflow-hidden w-full h-full bg-[#0f1c24] relative">
                {/* Screen Content */}
                <div className="p-4 pt-12 bg-[#006D77] pb-20">
                  <div className="flex justify-between items-center text-white mb-6">
                    <h3 className="font-semibold text-xl">Voca</h3>
                    <div className="w-8 h-8 rounded-full bg-white/20" />
                  </div>
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex gap-3 items-center">
                        <div className="w-12 h-12 rounded-full bg-white/20" />
                        <div className="flex-1 space-y-2">
                          <div className="h-2 w-20 bg-white/20 rounded" />
                          <div className="h-2 w-32 bg-white/10 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-0 w-full h-1/2 bg-white rounded-t-3xl p-6">
                  <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div className="p-3 bg-gray-100 rounded-2xl rounded-tl-none text-xs text-gray-600 max-w-[70%]">
                        Hey! Did you see the new Voca update?
                      </div>
                    </div>
                    <div className="flex gap-3 flex-row-reverse">
                      <div className="p-3 bg-[#006D77] text-white rounded-2xl rounded-tr-none text-xs max-w-[70%] shadow-lg">
                        Yeah! The dark mode is stunning.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute top-10 -left-4 sm:-left-12 bg-[#1f2c34] p-4 rounded-xl shadow-xl border border-white/5 animate-bounce duration-[3000ms] z-20 max-w-[180px] sm:max-w-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Secure</p>
                  <p className="text-gray-400 text-xs">End-to-End Encrypted</p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-24 -right-4 sm:-right-12 bg-[#1f2c34] p-4 rounded-xl shadow-xl border border-white/5 animate-bounce duration-[4000ms] z-20 max-w-[180px] sm:max-w-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#83C5BE]/20 flex items-center justify-center text-[#83C5BE] shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Fast</p>
                  <p className="text-gray-400 text-xs">Global Edge Network</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-32 bg-[#0b141a]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Why choose Voca?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              We didn't just build another chat app. We engineered a communication platform for the future.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Mail, title: "No Phone Numbers", desc: "Sign up instantly with just your email address. No SIM card or phone number required to connect.", demoIndex: 0 },
              { icon: Video, title: "Unlimited Free Calls", desc: "Connect with friends and family using free, high-quality audio and video calls, anytime, anywhere.", demoIndex: 7 },
              { icon: Lock, title: "End-to-End Encryption", desc: "Your conversations are yours alone. Only you and the recipient can read them. Not even Voca.", demoIndex: 5 },
              { icon: Mic, title: "Voice Messages", desc: "Record and send voice notes instantly with high-quality audio. Perfect for when typing isn't an option.", demoIndex: 6 },
              { icon: Edit2, title: "Edit Messages", desc: "Made a typo? Edit your sent messages instantly. You have full control over your conversation.", demoIndex: 1 },
              { icon: Users, title: "Group Creation", desc: "Create powerful groups for work, family, or friends with advanced admin controls and features.", demoIndex: 4 }
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                onClick={() => navigate('/demo', { state: { demoIndex: feature.demoIndex } })}
                className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#006D77]/20 flex items-center justify-center text-[#83C5BE] mb-6 group-hover:bg-[#006D77]/30 transition-colors">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-[#0f1c24]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl text-white">Voca</span>
            <span className="text-gray-500 text-sm">© 2025</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privacy</button>
            <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Terms</button>
            <button onClick={() => navigate('/contact')} className="hover:text-white transition-colors">Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
