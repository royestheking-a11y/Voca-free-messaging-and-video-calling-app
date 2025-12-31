import React from 'react';
import { Button } from '../../ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '../../SEO';

export const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f1c24] text-white font-sans selection:bg-[#006D77] selection:text-white">
      <SEO
        title="Terms of Service | Voca Messenger"
        description="Read the Terms of Service for using Voca Messenger."
        url="/terms"
      />
      <nav className="fixed w-full z-50 bg-[#0f1c24]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-white hover:bg-white/5 gap-2"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </Button>
          <span className="font-bold text-xl">Terms of Service</span>
          <div className="w-20" />
        </div>
      </nav>

      <div className="pt-32 pb-20 px-6 max-w-3xl mx-auto prose prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-gray-400 text-lg mb-8">Last updated: December 24, 2025</p>

        <section className="space-y-6 text-gray-300">
          <h3>1. Acceptance of Terms</h3>
          <p>
            By downloading, installing, or using Voca, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.
          </p>

          <h3>2. Our Service</h3>
          <p>
            Voca provides a secure messaging platform. We are constantly innovating to provide the best possible experience for our users. You acknowledge and agree that the form and nature of the services which Voca provides may change from time to time without prior notice to you.
          </p>

          <h3>3. User Responsibilities</h3>
          <p>
            You are responsible for your use of the Services and for any content you provide, including compliance with applicable laws. You may not use our service to send spam, harass others, or facilitate illegal activities.
          </p>

          <h3>4. Termination</h3>
          <p>
            We may suspend or terminate your access to Voca at any time, for any reason, including if we reasonably believe you have violated these Terms.
          </p>

          <h3>5. Disclaimers</h3>
          <p>
            The Service is provided "as is" and "as available". To the maximum extent permitted by law, we disclaim all warranties, whether express or implied.
          </p>

          <h3>6. Limitation of Liability</h3>
          <p>
            To the maximum extent permitted by law, Voca shall not be liable for any indirect, incidental, special, consequential, or punitive damages.
          </p>
        </section>
      </div>
    </div>
  );
};
