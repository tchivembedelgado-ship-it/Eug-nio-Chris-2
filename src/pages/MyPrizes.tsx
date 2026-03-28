import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { Trophy, Package, Clock, CheckCircle2, AlertCircle, Crown } from 'lucide-react';
import { motion } from 'motion/react';
import BackButton from '@/src/components/BackButton';

interface WinnerClaim {
  id: string;
  prize_description: string;
  prize_type: string;
  is_main_prize: boolean;
  status: 'pending' | 'processing' | 'completed';
  created_at: string;
  rifas: {
    nome: string;
  };
}

export default function MyPrizes() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [claims, setClaims] = useState<WinnerClaim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchClaims() {
      const { data, error } = await supabase
        .from('winner_claims')
        .select('*, rifas(nome)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching claims:', error);
      } else {
        setClaims(data as any || []);
      }
      setLoading(false);
    }
    fetchClaims();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-500 uppercase tracking-tighter">
            <Clock className="h-3 w-3" />
            Pendente
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-bold text-blue-500 uppercase tracking-tighter">
            <Package className="h-3 w-3" />
            Em Processamento
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">
            <CheckCircle2 className="h-3 w-3" />
            Entregue
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <BackButton />
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
          <Trophy className="h-10 w-10 text-yellow-500" />
          Meus Prémios
        </h1>
        <p className="text-zinc-500">Acompanhe o estado dos seus prémios materiais ganhos.</p>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="py-20 text-center text-zinc-500">Carregando os seus prémios...</div>
        ) : claims.length > 0 ? (
          claims.map((claim, index) => (
            <motion.div
              key={claim.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-3xl border border-white/5 bg-zinc-900/50 p-6 sm:p-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-500">
                    {claim.is_main_prize ? <Crown className="h-8 w-8 fill-current" /> : <Trophy className="h-8 w-8" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white">{claim.prize_description}</h3>
                      {claim.is_main_prize && (
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
                          Prémio Principal
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400">
                      {claim.rifas?.nome ? (
                        <>Rifa: <span className="text-white">{claim.rifas.nome}</span></>
                      ) : (
                        <span className="text-orange-500 font-bold italic">Presente Especial do ADM</span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">Ganhado em: {new Date(claim.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  {getStatusBadge(claim.status)}
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Estado do Envio</p>
                    <p className="text-sm font-medium text-zinc-300">
                      {claim.status === 'pending' && 'A aguardar validação administrativa.'}
                      {claim.status === 'processing' && 'O seu prémio está a ser preparado para envio.'}
                      {claim.status === 'completed' && 'O prémio já foi entregue com sucesso!'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 p-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-zinc-500">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Nenhum prémio material ainda</h3>
            <p className="mt-2 text-zinc-500">Continue a participar nas nossas rifas para ganhar prémios incríveis!</p>
          </div>
        )}
      </div>
    </div>
  );
}
