import React, { useState } from 'react';
import {
  Menu,
  Sparkles,
  Layers,
  LogIn,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';

interface HeaderProps {
  onToggleMobile: () => void;
  pageTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobile, pageTitle }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between transition-all">
        {/* Left: Mobile hamburger & title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobile}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {pageTitle}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                2026 Academic Cycle
              </span>
              <span>•</span>
              <span>Shenzhen FinTech Track C</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Portal Action */}
          <button
            onClick={() => navigate('/portal')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 hover:text-slate-900 transition-all shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Setup Portal</span>
          </button>

          {/* Ask AI Copilot */}
          <button
            onClick={() => navigate('/ai-copilot')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-semibold text-blue-700 hover:text-blue-800 transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>DeepSeek Copilot</span>
          </button>

          {/* Supabase Auth Pill */}
          {user ? (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-medium text-emerald-800 transition-all shadow-sm"
              title="Click to view Supabase account details"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="max-w-[100px] sm:max-w-[140px] truncate">{user.email}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Connect</span>
            </button>
          )}
        </div>
      </header>

      {/* Global Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};
