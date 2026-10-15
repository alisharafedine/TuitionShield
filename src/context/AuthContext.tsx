import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase/client';
import { localDb } from '../lib/storage/mock-db';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isSupabaseLive: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: AuthError | null; data: any }>;
  signOut: () => Promise<void>;
  signInAsDemo: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => localDb.getState().profile);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and listen to Supabase auth changes
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      if (!isLiveSupabaseConfigured) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          if (initialSession?.user) {
            await loadUserProfile(initialSession.user.id, initialSession.user.email);
          }
        }
      } catch (err) {
        console.warn('Supabase auth session fetch failed, falling back to local mode:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initializeAuth();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await loadUserProfile(newSession.user.id, newSession.user.email);
        } else {
          // If signed out, fall back to local demo profile
          setProfile(localDb.getState().profile);
        }
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  async function loadUserProfile(userId: string, email?: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching user profile from Supabase:', error.message);
        return;
      }

      if (data) {
        const loadedProfile: UserProfile = {
          id: data.id,
          display_name: data.display_name || email?.split('@')[0] || 'International Student',
          destination_country: data.destination_country || 'Germany',
          university: data.university || 'Technical University of Munich',
          study_program: data.study_program || 'M.Sc. Sustainable FinTech',
          study_start_date: data.study_start_date || '2026-10-01',
          study_duration_months: data.study_duration_months || 24,
          home_currency: data.home_currency || 'EUR',
          reserve_threshold_minor: Number(data.reserve_threshold_minor) || 100000,
          onboarding_completed: Boolean(data.onboarding_completed),
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setProfile(loadedProfile);
        // Also sync localDb profile for local calculation compatibility
        localDb.updateProfile(loadedProfile);
      } else {
        // Auto-create default profile for new user in Supabase
        const newProfile = {
          id: userId,
          display_name: email?.split('@')[0] || 'New Student',
          destination_country: 'Germany',
          university: 'Technical University of Munich',
          study_program: 'Master Degree',
          home_currency: 'EUR',
          reserve_threshold_minor: 100000,
          onboarding_completed: true,
        };

        const { error: insertError } = await supabase.from('profiles').insert(newProfile);
        if (!insertError) {
          const created = {
            ...newProfile,
            study_start_date: '2026-10-01',
            study_duration_months: 24,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as UserProfile;
          setProfile(created);
          localDb.updateProfile(created);
        }
      }
    } catch (err) {
      console.warn('Failed to load or create profile in Supabase:', err);
    }
  }

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const result = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    return { error: result.error };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    setIsLoading(true);
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    });

    if (result.data.user && !result.error) {
      // Create their initial profile immediately in Supabase
      try {
        await supabase.from('profiles').upsert({
          id: result.data.user.id,
          display_name: displayName || email.split('@')[0],
          destination_country: 'Germany',
          university: 'Technical University of Munich',
          study_program: 'International Student',
          home_currency: 'EUR',
          reserve_threshold_minor: 100000,
          onboarding_completed: true,
        });
      } catch (e) {
        console.warn('Initial profile upsert error:', e);
      }
    }

    setIsLoading(false);
    return { error: result.error, data: result.data };
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Error signing out:', err);
    }
    setUser(null);
    setSession(null);
    // Reset to local demo profile
    setProfile(localDb.getState().profile);
    setIsLoading(false);
  };

  const signInAsDemo = async () => {
    // Instant demo login: resets state to competition baseline
    localDb.resetToDemo();
    setProfile(localDb.getState().profile);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id, user.email);
    } else {
      setProfile(localDb.getState().profile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isSupabaseLive: isLiveSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        signInAsDemo,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
