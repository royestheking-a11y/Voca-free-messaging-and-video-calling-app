import React from 'react';
import { Button } from '../../ui/button';
import { motion } from 'motion/react';
import { ArrowLeft, Check, Lock, Zap, Smartphone, Users, Globe, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '../../SEO';

export const FeaturesPage = () => {
  const navigate = useNavigate();

  const mainFeatures = [
    {
      title: "End-to-End Encryption",
      desc: "Powered by the Signal Protocol, ensuring your messages stay private.",
      icon: Lock,
      color: "text-green-400",
      bg: "bg-green-400/10"
    },
    {
      title: "Global Low Latency",
      desc: "Distributed edge servers ensure messages are delivered in milliseconds.",
      icon: Zap,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10"
    },
    {
      title: "Cross-Platform",
      desc: "Seamlessly sync between Mobile, Web, and Desktop apps.",
      icon: Smartphone,
      color: "text-blue-400",
      bg: "bg-blue-400/10"
    },
    {
      title: "HD Video Calls",
      desc: "Crystal clear voice and video calls, even on low bandwidth.",
      icon: Video,
      color: "text-purple-400",
      bg: "bg-purple-400/10"
    },
    {
      title: "Large Groups",
      desc: "Create communities with up to 200,000 members.",
      icon: Users,
      color: "text-pink-400",
      bg: "bg-pink-400/10"
    },
    {
      title: "No Tracking",
      desc: "We don't collect metadata. Your business is your business.",
      icon: Globe,
      color: "text-[#83C5BE]",
      bg: "bg-[#83C5BE]/10"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f1c24] text-white font-sans selection:bg-[#006D77] selection:text-white">
      <SEO
        title="Features | Voca Messenger"
        description="Explore Voca Messenger features including encrypted messaging, voice and video calls, file sharing, message editing, and real-time presence."
        url="/features"
      />
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-[#0f1c24]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-white hover:bg-white/5 gap-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl">Voca Features</span>
          </div>
          <Button
            className="bg-[#006D77] hover:bg-[#005a63] text-white rounded-full px-6"
            onClick={() => navigate('/signup')}
          >
            Get Started
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
          Everything you need. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#83C5BE] to-[#006D77]">
            Nothing you don't.
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl text-gray-400 max-w-2xl mx-auto"
        >
          Voca is built for those who value privacy without compromising on features.
        </motion.p>
      </section>

      {/* Grid */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mainFeatures.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${feature.bg} ${feature.color}`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Detailed Feature List */}
      <section className="py-20 bg-[#0b141a]">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center">Technical Specifications</h2>
          <div className="space-y-4">
            {[
              "RSA-4096 Encryption keys",
              "SHA-256 Hashing for file integrity",
              "Perfect Forward Secrecy",
              "Local database encryption (SQLCipher)",
              "Automatic message destruction timers",
              "Screen lock & Biometric authentication support",
              "Proxy support for restricted networks"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                <Check className="w-5 h-5 text-[#006D77]" />
                <span className="text-gray-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Call to Action */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-to-br from-[#1f2c34] to-[#0f1c24] border border-white/10 rounded-3xl p-12">
          <h2 className="text-3xl font-bold mb-6">Ready to upgrade?</h2>
          <p className="text-gray-400 mb-8">Join millions of users who trust Voca with their conversations.</p>
          <Button
            size="lg"
            className="bg-[#006D77] hover:bg-[#005a63] text-white rounded-full px-8 h-12 text-lg"
            onClick={() => navigate('/signup')}
          >
            Get Started Now
          </Button>
        </div>
      </section>
    </div>
  );
};
