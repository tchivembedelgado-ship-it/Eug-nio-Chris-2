import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, type Profile } from '@/src/lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('Auth: Usuário logado:', user.email);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Auth: Erro ao buscar perfil:', error.message, error.details, error.hint);
      } else {
        console.log('Auth: Perfil encontrado na DB:', profile);
      }

      // Fallback de segurança: Se for o email do admin, força is_admin como true
      const isAdminEmail = user.email?.toLowerCase() === 'tchivembedelgado@gmail.com';
      if (isAdminEmail) {
        console.log('Auth: Usuário é o administrador mestre (por email)');
      }

      const finalProfile = profile 
        ? { ...profile, is_admin: profile.is_admin || isAdminEmail } 
        : (isAdminEmail ? { id: user.id, email: user.email, is_admin: true, balance: 0 } : null);
      
      console.log('Auth: Perfil final definido:', finalProfile);
      setProfile(finalProfile as Profile);
    } else {
      setProfile(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) refreshProfile();
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) refreshProfile();
      else setProfile(null);
      setLoading(false);
    });

    // Real-time profile updates (balance, is_admin, etc.)
    const profileSubscription = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: user ? `id=eq.${user.id}` : undefined,
        },
        (payload) => {
          console.log('Auth: Atualização em tempo real recebida:', payload.new);
          setProfile(prev => prev ? { ...prev, ...payload.new } : (payload.new as Profile));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      profileSubscription.unsubscribe();
    };
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
