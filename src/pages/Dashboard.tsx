import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { supabase, type Purchase } from '@/src/lib/supabase';
import { formatCurrency } from '@/src/lib/utils';
import { Wallet, Ticket, Bell, History, User, ArrowRight, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import BackButton from '@/src/components/BackButton';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [purchases, setPurchases] = useState<(Purchase & { rifas: { title: string } })[]>([]);
  const [hasPrizes, setHasPrizes] = useState(false);
  const [loading, setLoading] = useState(true);

  const isProfileComplete = 
    profile?.is_admin || (
    profile?.full_name && 
    profile?.phone && 
    profile?.address && 
    profile?.nif && 
    profile?.bank_details && 
    profile?.bi_photo_url
  );

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      // Fetch purchases
      const { data: purchaseData } = await supabase
        .from('purchases')
        .select('*, rifas(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setPurchases(purchaseData as any || []);

      // Check for prizes
      const { count } = await supabase
        .from('winner_claims')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      setHasPrizes((count || 0) > 0);
      setLoading(false);
    }
    fetchData();
  }, [user]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <BackButton />
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">{t('nav.dashboard')}</h1>
          <p className="text-zinc-500">Bem-vindo de volta, {profile?.full_name || user?.email}</p>
        </div>
        <Link to="/perfil" className="group relative">
          <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-white/10 bg-zinc-800 transition-transform group-hover:scale-105">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                <User className="h-8 w-8 text-zinc-600" />
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg">
            <User className="h-3 w-3" />
          </div>
        </Link>
      </div>

      {/* Profile Completion Warning for Winners */}
      {!isProfileComplete && hasPrizes && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-6 backdrop-blur-sm"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">Parabéns! Ganhou um prémio!</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Para podermos processar o envio do seu prémio material, é obrigatório completar o seu perfil com todos os dados e a foto do BI.
              </p>
              <Link
                to="/perfil"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black transition-all hover:bg-amber-400"
              >
                Completar Perfil Agora
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Stats */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/5 bg-zinc-900/50 p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Wallet className="h-6 w-6" />
              </div>
              <div className="text-sm font-medium text-zinc-500 uppercase tracking-widest">{t('dashboard.balance')}</div>
              <div className="text-4xl font-black text-white">{formatCurrency(profile?.balance || 0)}</div>
              <div className="mt-6 flex gap-2">
                <Link
                  to="/depositar"
                  className="flex-1 rounded-xl bg-emerald-600 py-2 text-center text-sm font-bold hover:bg-emerald-700"
                >
                  Depositar
                </Link>
                <Link
                  to="/levantar"
                  className="flex-1 rounded-xl border border-white/10 py-2 text-center text-sm font-bold hover:bg-white/5"
                >
                  Levantar
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/5 bg-zinc-900/50 p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
                <Ticket className="h-6 w-6" />
              </div>
              <div className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Participações</div>
              <div className="text-4xl font-black text-white">{purchases.length}</div>
              <div className="mt-6 text-xs text-zinc-500">
                Total de números comprados em todas as rifas.
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-3xl border border-white/5 bg-zinc-900/50 p-8">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-zinc-500" />
                {t('dashboard.my_numbers')}
              </h3>
            </div>
            
            <div className="space-y-4">
              {loading ? (
                <div className="py-10 text-center text-zinc-500">Carregando...</div>
              ) : purchases.length > 0 ? (
                purchases.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-2xl bg-white/5 p-4 transition-colors hover:bg-white/10">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 font-black">
                        #{p.assigned_number}
                      </div>
                      <div>
                        <div className="font-bold text-white">{p.rifas.title}</div>
                        <div className="text-xs text-zinc-500">{new Date(p.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    {p.prize_won_amount > 0 && (
                      <div className="rounded-full bg-yellow-500/10 px-3 py-1 text-[10px] font-bold text-yellow-500 uppercase tracking-tighter">
                        Prémio Ganho: {formatCurrency(p.prize_won_amount)}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-zinc-500 italic">
                  Ainda não participou em nenhuma rifa.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="rounded-3xl border border-white/5 bg-zinc-900/50 p-8">
            <h3 className="mb-6 text-xl font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-zinc-500" />
              A Minha Conta
            </h3>
            <div className="space-y-3">
              <Link
                to="/perfil"
                className="flex items-center justify-between rounded-2xl bg-white/5 p-4 transition-all hover:bg-white/10"
              >
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-bold">Editar Perfil</span>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-600" />
              </Link>
              <Link
                to="/transacoes"
                className="flex items-center justify-between rounded-2xl bg-white/5 p-4 transition-all hover:bg-white/10"
              >
                <div className="flex items-center gap-3">
                  <History className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-bold">Histórico Completo</span>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-600" />
              </Link>
              <Link
                to="/meus-premios"
                className="flex items-center justify-between rounded-2xl bg-white/5 p-4 transition-all hover:bg-white/10"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-bold">Meus Prémios</span>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-600" />
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-zinc-900/50 p-8">
            <h3 className="mb-6 text-xl font-bold flex items-center gap-2">
              <Bell className="h-5 w-5 text-zinc-500" />
              {t('dashboard.notifications')}
            </h3>
            <div className="space-y-4">
              <div className="rounded-2xl bg-white/5 p-4 text-sm border-l-4 border-emerald-500">
                <p className="text-white font-medium">Bem-vindo à RifaAngola!</p>
                <p className="text-zinc-400 mt-1">Comece a sua jornada agora e ganhe prémios incríveis.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-zinc-900/50 p-8">
            <h3 className="mb-4 text-lg font-bold">Suporte</h3>
            <p className="text-sm text-zinc-400 mb-6">Precisa de ajuda com a sua conta ou pagamentos?</p>
            <Link
              to="/meu-suporte"
              className="block w-full rounded-xl border border-white/10 py-3 text-center text-sm font-bold hover:bg-white/5"
            >
              Ver Suporte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
