import React from 'react';
import { Button } from '../../ui/button';
import { ArrowLeft, Mail } from 'lucide-react';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { SEO } from '../../SEO';

export const ContactPage = () => {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message Sent", { description: "We'll get back to you shortly." });
  };

  return (
    <div className="min-h-screen bg-[#0f1c24] text-white font-sans selection:bg-[#006D77] selection:text-white">
      <SEO
        title="Contact Us | Voca Messenger"
        description="Contact the Voca Messenger team for support, feedback, or general inquiries."
        url="/contact"
      />
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
            <span className="font-bold text-xl">Contact Us</span>
          </div>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </nav>

      <div className="pt-32 pb-20 px-6 max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Get in touch</h1>
          <p className="text-gray-400">
            Have questions about Voca? We'd love to hear from you.
          </p>
        </div>

        <div className="bg-[#1f2c34] rounded-2xl p-8 border border-white/5 shadow-xl">
          <div className="flex items-center gap-4 mb-8 p-4 bg-[#006D77]/10 rounded-xl border border-[#006D77]/20">
            <div className="w-10 h-10 rounded-full bg-[#006D77] flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Email us directly at</p>
              <p className="text-white font-medium select-all">voca.org.com@gmail.com</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Name</label>
              <Input placeholder="Your name" className="bg-[#0f1c24] border-white/10" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <Input type="email" placeholder="you@example.com" className="bg-[#0f1c24] border-white/10" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Message</label>
              <Textarea placeholder="How can we help?" className="bg-[#0f1c24] border-white/10 min-h-[150px]" required />
            </div>
            <Button className="w-full bg-[#006D77] hover:bg-[#005a63]">
              Send Message
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
