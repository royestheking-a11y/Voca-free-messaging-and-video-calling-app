import React, { useState } from 'react';
import { useVoca } from '../VocaContext';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../ui/card';
import { Lock, Mail, ShieldCheck, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';

interface LoginPageProps {
  initialMode?: 'login' | 'signup';
}

export const LoginPage = ({ initialMode = 'login' }: LoginPageProps) => {
  const { login, signup } = useVoca();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(initialMode === 'login');



  // WAIT. I can just use <GoogleLogin />.
  // I need to import { GoogleLogin } instead of useGoogleLogin.

  // Let's do that. It solves the token mismatch.
  // <GoogleLogin onSuccess={credentialResponse => { context.googleLogin(credentialResponse.credential) }} ... />


  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        }).then(res => res.json());

        const profileData = {
          googleId: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          avatar: userInfo.picture
        };

        const result = await useVoca().googleLogin(profileData);
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
      } catch (error) {
        console.error('Google Auth Error:', error);
        toast.error("Authentication failed");
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => toast.error("Google Login Failed"),
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await login(email, password);
        if (result.success) {
          toast.success("Welcome back to Voca");
          if (result.isAdminPanel) {
            navigate('/admin', { replace: true });
          } else {
            const from = (location.state as any)?.from?.pathname || '/chat';
            navigate(from, { replace: true });
          }
        } else {
          toast.error("Invalid credentials", { description: "Please check your email and password." });
        }
      } else {
        const success = await signup({ name, email, password });
        if (success) {
          toast.success("Account created!", { description: "Welcome to Voca!" });
          navigate('/chat', { replace: true });
        } else {
          toast.error("Signup failed", { description: "Please try again." });
        }
      }
    } catch (err: any) {
      toast.error("Error", { description: err.message || "Something went wrong." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1c24] relative overflow-hidden font-sans">
      {/* ... Background and other UI elements ... */}
      {/* (Keeping existing background and structure) */}

      <div className="absolute top-6 left-6 z-20">
        <Button
          variant="ghost"
          className="text-gray-400 hover:text-white hover:bg-white/5 gap-2"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-5 h-5" /> Back to Home
        </Button>
      </div>

      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#006D77]/20 via-[#0f1c24] to-[#0f1c24]" />
        <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#83C5BE]/10 via-[#0f1c24] to-[#0f1c24]" />
      </div>

      <motion.div
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
            {isLogin ? "Welcome back" : "Create an account"}
          </h1>
          <p className="text-gray-400">
            {isLogin ? "Enter your credentials to access your account" : "Enter your details to get started"}
          </p>
        </div>

        <Card className="bg-[#1f2c34]/50 border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
          <CardContent className="p-8">
            <form onSubmit={handleAuth} className="space-y-5">
              <AnimatePresence mode="popLayout">
                {!isLogin && (
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
                      required
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
                <div className="flex justify-between">
                  <Label htmlFor="password" className="text-gray-300">Password</Label>
                  {isLogin && <a href="#" className="text-xs text-[#83C5BE] hover:underline">Forgot password?</a>}
                </div>
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
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-[#006D77] to-[#005a63] hover:from-[#005a63] hover:to-[#004e56] text-white shadow-lg shadow-[#006D77]/25 border-none"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Sign In" : "Create Account")}
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
                  onClick={() => handleGoogleLogin()}
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
          </CardContent>
          <CardFooter className="bg-[#1f2c34]/80 p-6 flex flex-col space-y-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{isLogin ? "New to Voca?" : "Already have an account?"}</span>
              <button
                type="button"
                className="text-[#83C5BE] font-medium hover:text-white transition-colors"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Sign up now" : "Log in"}
              </button>
            </div>

            {/* Demo Accounts Removed */}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};
