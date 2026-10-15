import React, { useState } from 'react';
import {
  Shield,
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle,
  AlertCircle,
  X,
  LogOut,
  Database,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, signIn, signUp, signOut, signInAsDemo, isSupabaseLive } = useAuth();
  const { success, error: toastError, info } = useToast();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setAuthError(error.message);
          toastError('Sign In Failed', error.message);
        } else {
          success('Welcome Back!', `Signed in successfully as ${email}`);
          onClose();
        }
      } else {
        if (password.length < 6) {
          setAuthError('Password must be at least 6 characters.');
          setIsSubmitting(false);
          return;
        }

        const { error, data } = await signUp(email, password, displayName);
        if (error) {
          setAuthError(error.message);
          toastError('Sign Up Failed', error.message);
        } else {
          if (data?.session) {
            success('Account Created!', `Welcome to TuitionShield AI, ${displayName || email}!`);
          } else {
            success('Account Created!', 'Please check your email to confirm registration or sign in directly.');
          }
          onClose();
        }
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSignIn = async () => {
    await signInAsDemo();
    info('Demo Account Active', 'Loaded baseline competition dataset (Elena Vance, TUM).');
    onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    info('Signed Out', 'You have been disconnected from your Supabase session.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 flex items-start justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                TuitionShield <span className="text-blue-600 font-mono text-xs px-2 py-0.5 rounded-full bg-blue-50 font-bold">ID</span>
              </h2>
              <p className="text-xs text-slate-500">
                {isSupabaseLive ? 'Powered by live Supabase Auth' : 'Local Sandbox Mode'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 pt-4">
          {user ? (
            /* Already signed in */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 truncate">{user.email}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Supabase Connected & Synchronized</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600">
                You are signed into your student account. All your financial profiles, obligations, and proposals are securely tied to your Supabase UID.
              </p>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-all"
                >
                  Continue to App
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-sm font-medium flex items-center gap-2 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            /* Sign in or Sign up form */
            <div>
              {/* Tab Selector */}
              <div className="flex p-1 bg-slate-100 rounded-xl mb-5">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setAuthError(null); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    mode === 'signin'
                      ? 'bg-white text-blue-700 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setAuthError(null); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    mode === 'signup'
                      ? 'bg-white text-blue-700 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {authError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Full Name / Display Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Elena Vance"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@tum.de"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  {mode === 'signup' && (
                    <p className="text-[11px] text-slate-500 mt-1">Must be at least 6 characters</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{mode === 'signin' ? 'Sign In to Supabase' : 'Create Supabase Account'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider text-slate-400">
                  <span className="bg-white px-3">or continue with</span>
                </div>
              </div>

              {/* Quick Demo Access Button */}
              <button
                type="button"
                onClick={handleDemoSignIn}
                className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>1-Click Competition Demo Profile</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
