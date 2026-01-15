import React, { useState, useEffect } from 'react';
import { SEO } from '../../SEO';
import { useVoca } from '../VocaContext';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../ui/card';
import { Lock, Mail, ShieldCheck, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { initEmail, generateOTP, sendRegistrationOTP, sendPasswordResetOTP } from '../../../lib/email';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '../../ui/input-otp';
import { Capacitor } from '@capacitor/core';
import { signInWithGoogleNative } from '../../../lib/googleAuth';

interface LoginPageProps {
  initialMode?: 'login' | 'signup';
}

type AuthStep = 'credentials' | 'otp' | 'forgot-password' | 'reset-otp' | 'new-password';

export const LoginPage = ({ initialMode = 'login' }: LoginPageProps) => {
  const { login, signup, googleLogin } = useVoca();
  const navigate = useNavigate();
  const location = useLocation();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Auth Flow State
  const [isLoginView, setIsLoginView] = useState(initialMode === 'login');
  const [authStep, setAuthStep] = useState<AuthStep>('credentials');

  // OTP State
  const [otpValue, setOtpValue] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [timer, setTimer] = useState(300); // 5 minutes

  // New Password State (for reset)
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    initEmail();
  }, []);

  useEffect(() => {
    setIsLoginView(initialMode === 'login');
    setAuthStep('credentials');
    setOtpValue('');
    setGeneratedOtp(null);
  }, [initialMode]);

  // Timer logic for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if ((authStep === 'otp' || authStep === 'reset-otp') && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [authStep, timer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Platform-agnostic Google Login Handler
  const handleNativeGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // 1. Native Mobile Login
      if (Capacitor.isNativePlatform()) {
        const result = await signInWithGoogleNative();
        if (result.success && result.user) {
          await processLogin(result.user);
        } else {
          toast.error("Google Login Failed");
        }
      }
      // 2. Web Login (Using the existing hook via button click)
      else {
        webGoogleLogin();
      }
    } catch (error) {
      console.error('Google Login Error:', error);
      toast.error("Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to process the user data after auth (shared between web/native)
  const processLogin = async (profileData: any) => {
    // Normalize data structure if needed
    const userData = {
      googleId: profileData.googleId || profileData.sub,
      email: profileData.email,
      name: profileData.name,
      avatar: profileData.avatar || profileData.picture
    };

    const result = await googleLogin(userData);
    if (result.success) {
      toast.success("Welcome to Voca");
      if (result.isAdminPanel) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/chat', { replace: true });
      }
    } else {
      toast.error("Login Failed", { description: result.error });
    }
  };

  // Web-only hook
  const webGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        }).then(res => res.json());

        await processLogin({
          googleId: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          avatar: userInfo.picture
        });
      } catch (err) {
        console.error(err);
        toast.error("Failed to get user info");
      }
    },
    onError: () => toast.error("Google Login Failed"),
  });

  // --- Handlers ---

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await login(email, password);
      // login function returns { success, error, isAdminPanel }
      if (result.success) {
        toast.success("Welcome back to Voca");
        if (result.isAdminPanel) {
          navigate('/admin', { replace: true });
        } else {
          const from = (location.state as any)?.from?.pathname || '/chat';
          navigate(from, { replace: true });
        }
      } else {
        // If specific error message exists (like 'Your account is banned'), show it
        if (result.error === 'Your account has been banned') {
          toast.error("Access Denied", { description: "Your account is banned by the administrator." });
        } else {
          toast.error("Login Failed", { description: result.error || "Please check your email and password." });
        }
      }
    } catch (err: any) {
      toast.error("Error", { description: err.message || "Something went wrong." });
    } finally {
      setIsLoading(false);
    }
  };

  const initSignup = async () => {
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    const otp = generateOTP();
    setGeneratedOtp(otp);
    setTimer(300);

    const { success, error } = await sendRegistrationOTP(email, otp, name);

    setIsLoading(false);

    if (success) {
      setAuthStep('otp');
      toast.success("Verification code sent", { description: "Check your email inbox." });
    } else {
      toast.error("Failed to send OTP", { description: "Please try again later." });
    }
  };

  const verifySignupOtp = async () => {
    if (otpValue !== generatedOtp) {
      toast.error("Invalid Code", { description: "Please check the code and try again." });
      return;
    }

    setIsLoading(true);
    try {
      const success = await signup({ name, email, password });
      if (success) {
        toast.success("Account verified & created!", { description: "Welcome to Voca!" });
        navigate('/chat', { replace: true });
      } else {
        toast.error("Signup failed", { description: "Please try again." });
        // Could be email already exists
      }
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const initForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    setIsLoading(true);
    const otp = generateOTP();
    setGeneratedOtp(otp);
    setTimer(300);

    // In a real app we might want to check if user exists first, but for security sometimes we don't reveal it.
    // However, SendOTP usually works.
    const { success } = await sendPasswordResetOTP(email, otp);
    setIsLoading(false);

    if (success) {
      setAuthStep('reset-otp');
      toast.success("Reset code sent", { description: "Check your email inbox." });
    } else {
      toast.error("Failed to send OTP");
    }
  };

  const verifyResetOtp = () => {
    if (otpValue !== generatedOtp) {
      toast.error("Invalid Code");
      return;
    }
    setAuthStep('new-password');
  };

  const completePasswordReset = async () => {
    if (!newPassword) return;
    setIsLoading(true);
    try {
      const { uploadAPI } = await import('../../../lib/api');
      // Using a direct fetch here because reset-password isn't in api.ts yet or we can add it.
      // Let's use direct fetch for now or add to API client. 
      // Quickest is direct fetch.
      const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword })
      });

      if (res.ok) {
        toast.success("Password updated", { description: "Please login with your new password." });
        setIsLoginView(true);
        setAuthStep('credentials');
        setPassword('');
      } else {
        toast.error("Failed to update password");
      }
    } catch (err) {
      toast.error("Error updating password");
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (timer > 240) return; // Debounce re-send (allow only after 1 min pass)

    const otp = generateOTP();
    setGeneratedOtp(otp);
    setTimer(300);

    let success;
    if (authStep === 'otp') {
      const res = await sendRegistrationOTP(email, otp, name);
      success = res.success;
    } else {
      const res = await sendPasswordResetOTP(email, otp);
      success = res.success;
    }

    if (success) toast.success("Code resent!");
    else toast.error("Failed to resend code");
  };


  const renderCredentialsForm = () => (
    <form onSubmit={(e) => { e.preventDefault(); isLoginView ? handleLogin() : initSignup(); }} className="space-y-5">
      <AnimatePresence mode="popLayout">
        {!isLoginView && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <Label htmlFor="name" className="text-gray-300">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              className="bg-[#0f1c24]/50 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#006D77]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={!isLoginView}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-gray-300">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            className="pl-9 bg-[#0f1c24]/50 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#006D77]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-gray-300">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="pl-9 pr-10 bg-[#0f1c24]/50 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#006D77]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-gray-500 hover:text-white transition-colors focus:outline-none"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {isLoginView && (
          <div className="flex justify-end">
            <button type="button" onClick={() => { setAuthStep('forgot-password'); setEmail(''); }} className="text-xs text-[#83C5BE] hover:underline">
              Forgot password?
            </button>
          </div>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-11 bg-gradient-to-r from-[#006D77] to-[#005a63] hover:from-[#005a63] hover:to-[#004e56] text-white shadow-lg shadow-[#006D77]/25 border-none"
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLoginView ? "Sign In" : "Create Account")}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#1f2c34] px-2 text-gray-500">Or continue with</span>
        </div>
      </div>

      <div className="w-full">
        <button
          type="button"
          onClick={() => handleNativeGoogleLogin()}
          className="w-full h-11 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg flex items-center justify-center gap-3 transition-all duration-300 backdrop-blur-sm border border-white/10 group hover:border-white/20 hover:scale-[1.02]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>
    </form>
  );

  const renderOtpView = (isReset = false) => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-[#006D77]/20 rounded-full flex items-center justify-center mx-auto text-[#83C5BE]">
          <Mail className="w-6 h-6" />
        </div>
        <h3 className="text-white font-medium text-lg">Check your email</h3>
        <p className="text-sm text-gray-400">
          We sent a code to <span className="text-white font-medium">{email}</span>
        </p>
      </div>

      <div className="flex justify-center py-2">
        <InputOTP value={otpValue} onChange={setOtpValue} maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} className="w-10 h-12 md:w-12 md:h-14 text-lg bg-[#0f1c24]/50 border-white/20 text-white data-[active=true]:border-[#006D77]" />
            <InputOTPSlot index={1} className="w-10 h-12 md:w-12 md:h-14 text-lg bg-[#0f1c24]/50 border-white/20 text-white data-[active=true]:border-[#006D77]" />
            <InputOTPSlot index={2} className="w-10 h-12 md:w-12 md:h-14 text-lg bg-[#0f1c24]/50 border-white/20 text-white data-[active=true]:border-[#006D77]" />
          </InputOTPGroup>
          <InputOTPSeparator className="text-white/20" />
          <InputOTPGroup>
            <InputOTPSlot index={3} className="w-10 h-12 md:w-12 md:h-14 text-lg bg-[#0f1c24]/50 border-white/20 text-white data-[active=true]:border-[#006D77]" />
            <InputOTPSlot index={4} className="w-10 h-12 md:w-12 md:h-14 text-lg bg-[#0f1c24]/50 border-white/20 text-white data-[active=true]:border-[#006D77]" />
            <InputOTPSlot index={5} className="w-10 h-12 md:w-12 md:h-14 text-lg bg-[#0f1c24]/50 border-white/20 text-white data-[active=true]:border-[#006D77]" />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div className="space-y-4">
        <Button
          onClick={() => isReset ? verifyResetOtp() : verifySignupOtp()}
          className="w-full h-11 bg-gradient-to-r from-[#006D77] to-[#005a63] text-white shadow-lg"
          disabled={otpValue.length !== 6 || isLoading}
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Continue"}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Expires in {formatTime(timer)}</span>
          <button onClick={resendOtp} className="text-[#83C5BE] hover:text-white transition-colors" disabled={timer > 240}>
            Resend Code
          </button>
        </div>
      </div>
    </div>
  );

  const renderForgotPassword = () => (
    <form onSubmit={(e) => { e.preventDefault(); initForgotPassword(); }} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="reset-email" className="text-gray-300">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            id="reset-email"
            type="email"
            placeholder="name@example.com"
            className="pl-9 bg-[#0f1c24]/50 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#006D77]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>
      <Button
        type="submit"
        className="w-full h-11 bg-gradient-to-r from-[#006D77] to-[#005a63] text-white shadow-lg"
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Code"}
      </Button>
    </form>
  );

  const renderNewPassword = () => (
    <form onSubmit={(e) => { e.preventDefault(); completePasswordReset(); }} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="new-password" className="text-gray-300">New Password</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            id="new-password"
            type="password"
            placeholder="Enter new password"
            className="pl-9 bg-[#0f1c24]/50 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#006D77]"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
      </div>
      <Button
        type="submit"
        className="w-full h-11 bg-gradient-to-r from-[#006D77] to-[#005a63] text-white shadow-lg"
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
      </Button>
    </form>
  );

  const getHeaderContent = () => {
    switch (authStep) {
      case 'otp': return { title: "Verification", sub: "Enter the code sent to your email" };
      case 'forgot-password': return { title: "Reset Password", sub: "We'll send you a code to reset it" };
      case 'reset-otp': return { title: "Verification", sub: "Enter code to reset password" };
      case 'new-password': return { title: "New Password", sub: "Secure your account" };
      default: return isLoginView
        ? { title: "Welcome back", sub: "Enter your credentials to access your account" }
        : { title: "Create an account", sub: "Enter your details to get started" };
    }
  };

  const header = getHeaderContent();

  const seoProps = isLoginView
    ? {
      title: "Login | Voca Messenger",
      description: "Access your secure Voca Messenger account and continue private conversations instantly.",
      url: "/login"
    }
    : {
      title: "Create Account | Voca Messenger",
      description: "Create your Voca Messenger account using email login and enjoy private messaging, real-time chat, and encrypted communication.",
      url: "/signup"
    };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1c24] relative overflow-hidden font-sans">
      <SEO {...seoProps} />
      <div className="absolute top-6 left-6 z-20">
        <Button
          variant="ghost"
          className="text-gray-400 hover:text-white hover:bg-white/5 gap-2"
          onClick={() => {
            if (authStep !== 'credentials') {
              setAuthStep('credentials');
            } else {
              navigate('/');
            }
          }}
        >
          <ArrowLeft className="w-5 h-5" /> {authStep !== 'credentials' ? 'Back' : 'Back to Home'}
        </Button>
      </div>

      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#006D77]/20 via-[#0f1c24] to-[#0f1c24]" />
        <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#83C5BE]/10 via-[#0f1c24] to-[#0f1c24]" />
      </div>

      <motion.div
        key={authStep + (isLoginView ? 'login' : 'signup')}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[420px] px-4 relative z-10"
      >
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-[#006D77] to-[#83C5BE] rounded-2xl flex items-center justify-center shadow-2xl shadow-[#006D77]/30 mx-auto mb-6 transform rotate-3 hover:rotate-6 transition-transform">
            <span className="text-3xl font-bold text-white">V</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {header.title}
          </h1>
          <p className="text-gray-400">
            {header.sub}
          </p>
        </div>

        <Card className="bg-[#1f2c34]/50 border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
          <CardContent className="p-8">
            {authStep === 'credentials' && renderCredentialsForm()}
            {authStep === 'otp' && renderOtpView(false)}
            {authStep === 'forgot-password' && renderForgotPassword()}
            {authStep === 'reset-otp' && renderOtpView(true)}
            {authStep === 'new-password' && renderNewPassword()}
          </CardContent>

          {authStep === 'credentials' && (
            <CardFooter className="bg-[#1f2c34]/80 p-6 flex flex-col space-y-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>{isLoginView ? "New to Voca?" : "Already have an account?"}</span>
                <button
                  type="button"
                  className="text-[#83C5BE] font-medium hover:text-white transition-colors"
                  onClick={() => { setIsLoginView(!isLoginView); setAuthStep('credentials'); }}
                >
                  {isLoginView ? "Sign up now" : "Log in"}
                </button>
              </div>
            </CardFooter>
          )}
        </Card>
      </motion.div>
    </div>
  );
};
