import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, type Profile } from '../lib/supabase';
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
      let finalProfile = profile 
        ? { ...profile, is_admin: profile.is_admin || isAdminEmail } 
        : (isAdminEmail ? { id: user.id, email: user.email, is_admin: true, balance: 0 } : null);
      
      // Se for admin, busca as configurações de exibição do admin
      if (finalProfile?.is_admin) {
        const { data: adminSettings } = await supabase
          .from('adm_settings')
          .select('*')
          .limit(1)
          .single();
        
        if (adminSettings) {
          finalProfile = {
            ...finalProfile,
            full_name: adminSettings.nome_exibicao || finalProfile.full_name,
            avatar_url: adminSettings.avatar_url || finalProfile.avatar_url,
            bi_photo_url: adminSettings.avatar_url || finalProfile.bi_photo_url, // Fallback para foto do BI
            bio: adminSettings.biografia || (finalProfile as any).bio,
          };
        }
      }

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
    console.log('Auth: Configurando subscription para perfil:', user?.id);
    const profileSubscription = supabase
      .channel(`profile_${user?.id || 'guest'}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: user?.id ? `id=eq.${user.id}` : undefined,
        },
        (payload) => {
          console.log('Auth: Atualização em tempo real do perfil recebida:', payload.new);
          setProfile(prev => {
            const updated = prev ? { ...prev, ...payload.new } : (payload.new as Profile);
            console.log('Auth: Novo perfil definido via Realtime:', updated.balance);
            return updated;
          });
        }
      )
      .subscribe((status) => {
        console.log('Auth: Status da subscription do perfil:', status);
      });

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
