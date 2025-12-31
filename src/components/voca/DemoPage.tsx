import React, { useState } from 'react';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Shield, Image, Phone, Mic, Edit2, Trash2, Star, Users, Mail, Check, Video, Zap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useNavigate, useLocation } from 'react-router-dom';
import { SEO } from '../SEO';

export const DemoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFeature, setActiveFeature] = useState((location.state as any)?.demoIndex ?? 0);

  const features = [
    {
      title: "No Phone Numbers",
      desc: "Sign up instantly with just your email. No SIM card or phone number required to connect globally.",
      icon: Mail,
      color: "text-orange-400",
      bg: "bg-orange-400/10"
    },
    {
      title: "Edit Sent Messages",
      desc: "Made a typo? Edit your messages within 10 minutes after sending them.",
      icon: Edit2,
      color: "text-blue-400",
      bg: "bg-blue-400/10"
    },
    {
      title: "Delete for Everyone",
      desc: "Sent to the wrong person? Delete messages for everyone in the chat seamlessly.",
      icon: Trash2,
      color: "text-red-400",
      bg: "bg-red-400/10"
    },
    {
      title: "Star Messages",
      desc: "Bookmark important messages to quickly access them later in your favorites.",
      icon: Star,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10"
    },
    {
      title: "Group Creation",
      desc: "Create powerful groups for work or friends with advanced admin controls.",
      icon: Users,
      color: "text-purple-400",
      bg: "bg-purple-400/10"
    },
    {
      title: "End-to-End Encryption",
      desc: "Every message is secured with military-grade encryption. Only you and the recipient can read them.",
      icon: Shield,
      color: "text-green-400",
      bg: "bg-green-400/10"
    },
    {
      title: "Voice Messages",
      desc: "Record and send voice notes instantly with high-quality audio.",
      icon: Mic,
      color: "text-pink-400",
      bg: "bg-pink-400/10"
    },
    {
      title: "Unlimited Free Calls",
      desc: "Connect with friends and family using free, high-quality audio and video calls.",
      icon: Video,
      color: "text-cyan-400",
      bg: "bg-cyan-400/10"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f1c24] text-white font-sans overflow-x-hidden selection:bg-[#006D77] selection:text-white">
      <SEO
        title="Live Demo | Voca Messenger"
        description="Try the Voca Messenger live demo to experience real-time messaging, secure chat, and modern communication features."
        url="/demo"
      />
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#0f1c24]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-white hover:bg-white/5 gap-2"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-[#006D77] to-[#83C5BE] rounded-lg flex items-center justify-center">
              <span className="font-bold text-lg text-white">V</span>
            </div>
            <span className="font-bold text-xl">Voca Tour</span>
          </div>
          <Button
            className="bg-[#006D77] hover:bg-[#005a63] text-white rounded-full px-6"
            onClick={() => navigate('/signup')}
          >
            Sign Up Now
          </Button>
        </div>
      </header>

      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* Feature List */}
          <div className="space-y-12">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Experience the <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#83C5BE] to-[#006D77]">
                  Voca Difference.
                </span>
              </h1>
              <p className="text-xl text-gray-400">
                Explore the features that make Voca the preferred choice for secure, premium communication.
              </p>
            </div>

            <div className="space-y-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-6 rounded-2xl border transition-all cursor-pointer ${activeFeature === index
                    ? "bg-[#1f2c34] border-[#006D77]/50 shadow-lg shadow-[#006D77]/10"
                    : "bg-transparent border-transparent hover:bg-white/5"
                    }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${feature.bg} ${feature.color}`}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-semibold mb-1 ${activeFeature === index ? "text-white" : "text-gray-300"}`}>
                        {feature.title}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Interactive Demo Preview */}
          <div className="sticky top-32">
            <div className="relative mx-auto border-gray-800 bg-gray-800 border-[8px] rounded-[2.5rem] h-[700px] w-full max-w-[400px] shadow-2xl">
              <div className="h-[32px] w-[3px] bg-gray-800 absolute -start-[17px] top-[72px] rounded-s-lg"></div>
              <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
              <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
              <div className="h-[64px] w-[3px] bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>

              <div className="rounded-[2rem] overflow-hidden w-full h-full bg-[#0b141a] flex flex-col relative">

                {/* App Header */}
                <div className="bg-[#1f2c34] p-4 pt-12 flex items-center gap-3 border-b border-white/5">
                  <ArrowLeft className="w-5 h-5 text-gray-400" />
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="https://res.cloudinary.com/dfvc27xla/image/upload/v1767075796/Voca/images/wvzf1gwib7tysmxyxumr.png" />
                    <AvatarFallback>S</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-white">Sunny</h4>
                    <p className="text-xs text-[#006D77]">Online</p>
                  </div>
                  <Phone className="w-5 h-5 text-[#006D77]" />
                  <Video className="w-5 h-5 text-[#006D77] ml-2" />
                </div>

                {/* Chat Content */}
                <div className="flex-1 p-4 space-y-4 overflow-hidden relative">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`, backgroundRepeat: 'repeat' }}
                  />

                  <div className="flex justify-center text-xs text-gray-500 my-4">
                    <span className="bg-[#1f2c34] px-3 py-1 rounded-full border border-white/5">Today</span>
                  </div>

                  {/* Dynamic Messages based on selection */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeFeature}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      {activeFeature === 0 && (
                        <>
                          <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-6">
                            <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center animate-bounce">
                              <Mail className="w-10 h-10 text-orange-400" />
                            </div>
                            <div>
                              <h3 className="text-xl font-medium text-white">Welcome to Voca</h3>
                              <p className="text-gray-400 text-sm mt-2 max-w-[200px] mx-auto">Sign up with your email to start chatting.</p>
                            </div>
                            <div className="w-full max-w-[250px] space-y-3">
                              <div className="bg-[#1f2c34] border border-white/10 rounded-lg p-3 text-left text-sm text-white">
                                user@example.com
                              </div>
                              <div className="bg-[#006D77] rounded-full p-3 text-sm font-medium text-white shadow-lg">
                                Continue with Email
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-green-400">
                              <Shield className="w-3 h-3" /> No phone number needed
                            </div>
                          </div>
                        </>
                      )}

                      {activeFeature === 1 && (
                        <>
                          <div className="flex justify-end">
                            <div className="bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] text-sm shadow-md">
                              Hey! I'll be there at 5:00 PM.
                              <div className="flex justify-end mt-1">
                                <span className="text-[10px] text-white/70">10:30 AM</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-center my-4">
                            <div className="bg-[#1f2c34] px-3 py-1 rounded-full text-[10px] text-gray-400 border border-white/5">
                              Editing message...
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <div className="bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] text-sm shadow-md ring-2 ring-blue-500/50">
                              Hey! I'll be there at 6:00 PM.
                              <div className="flex justify-end items-center gap-1 mt-1">
                                <span className="text-[10px] text-white/70 italic">(edited)</span>
                                <span className="text-[10px] text-white/70">10:31 AM</span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {activeFeature === 2 && (
                        <>
                          <div className="flex justify-end">
                            <div className="bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] text-sm shadow-md">
                              Here is the secret code: 1234
                              <div className="flex justify-end mt-1">
                                <span className="text-[10px] text-white/70">10:30 AM</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-center my-4">
                            <div className="bg-[#1f2c34] px-3 py-1 rounded-full text-[10px] text-red-400 border border-red-500/20 flex items-center gap-2">
                              <Trash2 className="w-3 h-3" /> Deleting...
                            </div>
                          </div>
                          <div className="flex justify-end w-full">
                            <div className="px-3 py-2 rounded-lg max-w-[80%] text-sm italic flex items-center gap-2 text-white/60 bg-[#1f2c34] border border-white/5">
                              <Shield className="w-3 h-3" />
                              You deleted this message
                            </div>
                          </div>
                        </>
                      )}

                      {activeFeature === 3 && (
                        <>
                          <div className="flex justify-start">
                            <div className="bg-[#1f2c34] text-white p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm">
                              The meeting code is <span className="font-mono bg-black/20 px-1 rounded">VOCA-2025</span>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <div className="bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] text-sm shadow-md relative group">
                              Got it! Starring this for later.
                              <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-yellow-400 animate-pulse">
                                <Star className="w-4 h-4 fill-current" />
                              </div>
                              <div className="flex justify-end items-center gap-1 mt-1">
                                <Star className="w-3 h-3 fill-white/70 text-white/70" />
                                <span className="text-[10px] text-white/70">10:32 AM</span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {activeFeature === 4 && (
                        <>
                          <div className="flex justify-center mb-4">
                            <div className="bg-[#1f2c34] p-4 rounded-xl w-full max-w-[280px] border border-white/10">
                              <div className="flex items-center gap-3 mb-3 border-b border-white/10 pb-3">
                                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                                  <Users className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="font-medium text-sm">Project Alpha</div>
                                  <div className="text-xs text-gray-400">3 participants</div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-gray-300">
                                  <span>You</span>
                                  <span className="text-green-400 bg-green-400/10 px-1.5 rounded">Admin</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-300">
                                  <span>Alice</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-300">
                                  <span>Bob</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-start">
                            <div className="bg-[#1f2c34] text-white p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm">
                              <span className="text-purple-400 text-xs font-bold block mb-1">Alice</span>
                              Added to the group! 🚀
                            </div>
                          </div>
                        </>
                      )}

                      {activeFeature === 5 && (
                        <>
                          <div className="flex justify-start">
                            <div className="bg-[#1f2c34] text-white p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm">
                              Is this chat secure? I have some confidential files to send.
                            </div>
                          </div>
                          <div className="flex justify-center my-2">
                            <div className="bg-yellow-500/10 text-yellow-500 text-[10px] px-3 py-1 rounded-lg flex items-center gap-2">
                              <Shield className="w-3 h-3" /> Messages are end-to-end encrypted.
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <div className="bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] text-sm shadow-md">
                              Absolutely. Voca uses Signal Protocol. No one can read this except us.
                              <div className="flex justify-end mt-1">
                                <span className="text-[10px] text-white/70">10:42 AM</span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {activeFeature === 6 && (
                        <>
                          <div className="flex justify-end">
                            <div className="bg-[#005c4b] text-white p-2 rounded-2xl rounded-tr-none max-w-[80%] flex items-center gap-3 pr-4 shadow-md">
                              <div className="w-8 h-8 bg-black/20 rounded-full flex items-center justify-center">
                                <Mic className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="h-1 w-24 bg-white/30 rounded-full overflow-hidden">
                                  <div className="h-full bg-white w-1/2" />
                                </div>
                                <div className="flex justify-between text-[10px] mt-1 text-white/80">
                                  <span>0:15</span>
                                  <span>10:45 AM</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-start">
                            <div className="bg-[#1f2c34] text-white p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm">
                              Loud and clear! I'll handle that right away.
                            </div>
                          </div>
                          <div className="flex justify-start">
                            <div className="bg-[#1f2c34] text-white p-2 rounded-2xl rounded-tl-none max-w-[80%] flex items-center gap-3 pr-4 border border-white/5">
                              <div className="w-8 h-8 bg-[#006D77]/20 rounded-full flex items-center justify-center">
                                <Mic className="w-4 h-4 text-[#83C5BE]" />
                              </div>
                              <div className="flex-1">
                                <div className="h-1 w-32 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#006D77] w-3/4" />
                                </div>
                                <div className="flex justify-between text-[10px] mt-1 text-gray-400">
                                  <span>0:42</span>
                                  <span>10:46 AM</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {activeFeature === 7 && (
                        <>
                          <div className="flex justify-end">
                            <div className="bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] text-sm shadow-md">
                              Hey, are you free for a quick video call?
                            </div>
                          </div>
                          <div className="flex justify-start">
                            <div className="bg-[#1f2c34] text-white p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm">
                              Always! Calling you now...
                            </div>
                          </div>
                          <div className="flex justify-center">
                            <div className="bg-[#1f2c34] border border-white/5 p-4 rounded-xl flex items-center gap-4 w-full max-w-[240px]">
                              <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center animate-pulse">
                                <Video className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Incoming Video Call</p>
                                <p className="text-xs text-gray-400">Sunny</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-center text-[10px] text-gray-500">
                            Video call ended • 24:12
                          </div>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Input Area */}
                <div className="bg-[#1f2c34] p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 h-9 bg-[#0b141a] rounded-full border border-white/5 px-3 flex items-center text-sm text-gray-500">
                    Type a message...
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[#006D77] flex items-center justify-center">
                    <Mic className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
