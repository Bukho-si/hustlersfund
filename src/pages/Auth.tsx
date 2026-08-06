import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRoute } from '@/lib/roleRedirect';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';
import { lovable } from '@/integrations/lovable/index';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, user, userRoles } = useAuth();

  // Preserved return path (used by the OAuth consent flow). Same-origin only.
  const rawNext = searchParams.get('next');
  const nextPath = rawNext && /^\/(?!\/)/.test(rawNext) ? rawNext : null;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);

  if (user) {
    if (nextPath) {
      window.location.replace(nextPath);
      return null;
    }
    const dest = getDashboardRoute(userRoles);
    navigate(dest, { replace: true });
    return null;
  }

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) {
      const remainingSec = Math.ceil(((lockoutUntil ?? 0) - Date.now()) / 1000);
      toast({ title: 'Too many attempts', description: `Please wait ${Math.ceil(remainingSec / 60)} minute(s) before trying again.`, variant: 'destructive' });
      return;
    }
    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      toast({ title: 'Validation Error', description: validation.error.errors[0].message, variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);
    if (error) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MS;
        setLockoutUntil(until);
        setTimeout(() => { setLockoutUntil(null); setFailedAttempts(0); }, LOCKOUT_MS);
      }
      toast({
        title: 'Login Failed',
        description: error.message === 'Invalid login credentials'
          ? `Incorrect email or password.${newAttempts >= 3 ? ` ${MAX_ATTEMPTS - newAttempts} attempt(s) remaining.` : ''}`
          : error.message,
        variant: 'destructive',
      });
      return;
    }
    setFailedAttempts(0);
    setLockoutUntil(null);
    toast({ title: 'Welcome back!', description: 'You have successfully logged in.' });
    if (nextPath) {
      window.location.replace(nextPath);
      return;
    }
    navigate(getDashboardRoute(userRoles));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = signupSchema.safeParse({
      fullName: signupName, email: signupEmail, phone: signupPhone,
      password: signupPassword, confirmPassword: signupConfirmPassword,
    });
    if (!validation.success) {
      toast({ title: 'Validation Error', description: validation.error.errors[0].message, variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setIsLoading(false);
    if (error) {
      const message = error.message.includes('already registered')
        ? 'This email is already registered. Please sign in instead.' : error.message;
      toast({ title: 'Signup Failed', description: message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Welcome to Hustlers!', description: 'Your account has been created. Please complete your profile.' });
    if (nextPath) {
      window.location.replace(nextPath);
      return;
    }
    navigate('/dashboard');
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: nextPath ? `${window.location.origin}${nextPath}` : window.location.origin });
      if (result.error) {
        toast({ title: 'Google Sign-In Failed', description: result.error.message, variant: 'destructive' });
      }
      if (result.redirected) return;
    } catch (err: any) {
      toast({ title: 'Google Sign-In Failed', description: err?.message || 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const inputClass = "w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 focus:bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: '#0B1220' }}>
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(234,179,8,0.06) 0%, transparent 60%)' }} />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="pt-8 pb-4 px-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ backgroundColor: '#EAB308' }}>
              <span className="text-2xl">🚕</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Hustlers Fund</h1>
            <p className="text-sm text-gray-500 mt-1">Save together. Grow together.</p>
          </div>

          {/* Tabs */}
          <div className="px-8 pb-2">
            <div className="flex bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setActiveTab('login')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 ${
                  activeTab === 'login'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab('signup')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 ${
                  activeTab === 'signup'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Join Now
              </button>
            </div>
          </div>

          {/* Forms */}
          <div className="px-8 pb-8 pt-4">
            {activeTab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className={labelClass}>Email</label>
                  <input id="login-email" type="email" placeholder="you@example.com" value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)} required className={inputClass} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="text-sm font-medium text-gray-700">Password</label>
                    <ForgotPasswordDialog>
                      <button type="button" className="text-xs text-yellow-600 hover:text-yellow-700 font-medium hover:underline">
                        Forgot password?
                      </button>
                    </ForgotPasswordDialog>
                  </div>
                  <div className="relative">
                    <input id="login-password" type={showLoginPassword ? 'text' : 'password'} placeholder="••••••••"
                      value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required className={inputClass + ' pr-12'} />
                    <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium">
                      {showLoginPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={isLoading || isLockedOut}
                  className="w-full h-12 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  style={{ backgroundColor: '#EAB308', color: '#1a1a1a' }}
                  onMouseEnter={e => { if (!isLoading && !isLockedOut) (e.target as HTMLElement).style.backgroundColor = '#CA9A06'; }}
                  onMouseLeave={e => (e.target as HTMLElement).style.backgroundColor = '#EAB308'}
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : isLockedOut ? 'Locked — Try later' : 'Sign In'}
                </button>

                {/* Divider */}
                <div className="relative flex items-center py-1">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="px-3 text-xs text-gray-400 font-medium">or</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                {/* Google */}
                <button type="button" onClick={handleGoogleSignIn} disabled={isGoogleLoading}
                  className="w-full h-12 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium flex items-center justify-center gap-2.5 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50">
                  {isGoogleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                      Sign in with Google
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label htmlFor="signup-name" className={labelClass}>Full Name</label>
                  <input id="signup-name" type="text" placeholder="John Doe" value={signupName}
                    onChange={e => setSignupName(e.target.value)} required className={inputClass} />
                </div>
                <div>
                  <label htmlFor="signup-email" className={labelClass}>Email</label>
                  <input id="signup-email" type="email" placeholder="you@example.com" value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)} required className={inputClass} />
                </div>
                <div>
                  <label htmlFor="signup-phone" className={labelClass}>Phone Number</label>
                  <input id="signup-phone" type="tel" placeholder="+27 XX XXX XXXX" value={signupPhone}
                    onChange={e => setSignupPhone(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="signup-password" className={labelClass}>Password</label>
                  <div className="relative">
                    <input id="signup-password" type={showSignupPassword ? 'text' : 'password'} placeholder="Create a password"
                      value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required className={inputClass + ' pr-12'} />
                    <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium">
                      {showSignupPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="signup-confirm" className={labelClass}>Confirm Password</label>
                  <div className="relative">
                    <input id="signup-confirm" type={showSignupConfirm ? 'text' : 'password'} placeholder="Confirm your password"
                      value={signupConfirmPassword} onChange={e => setSignupConfirmPassword(e.target.value)} required className={inputClass + ' pr-12'} />
                    <button type="button" onClick={() => setShowSignupConfirm(!showSignupConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium">
                      {showSignupConfirm ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={isLoading}
                  className="w-full h-12 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  style={{ backgroundColor: '#EAB308', color: '#1a1a1a' }}
                  onMouseEnter={e => { if (!isLoading) (e.target as HTMLElement).style.backgroundColor = '#CA9A06'; }}
                  onMouseLeave={e => (e.target as HTMLElement).style.backgroundColor = '#EAB308'}
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Account'}
                </button>

                {/* Divider */}
                <div className="relative flex items-center py-1">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="px-3 text-xs text-gray-400 font-medium">or</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                {/* Google */}
                <button type="button" onClick={handleGoogleSignIn} disabled={isGoogleLoading}
                  className="w-full h-12 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium flex items-center justify-center gap-2.5 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50">
                  {isGoogleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                      Sign up with Google
                    </>
                  )}
                </button>

                <p className="text-xs text-center text-gray-400 leading-relaxed pt-1">
                  After signing up, you will be required to pay a joining fee and upload proof of payment for admin approval.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
          © {new Date().getFullYear()} Hustlers Fund · SA Uber Drivers Stokvel
        </p>
      </div>
    </div>
  );
}
