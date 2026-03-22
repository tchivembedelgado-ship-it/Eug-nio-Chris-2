import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase, type Raffle } from '@/src/lib/supabase';
import RaffleCard from '@/src/components/RaffleCard';
import BackButton from '@/src/components/BackButton';
import { Loader2, Search, Filter } from 'lucide-react';

export default function Raffles() {
  const { t } = useTranslation();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRaffles() {
      const { data } = await supabase
        .from('rifas')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      setRaffles(data || []);
      setLoading(false);
    }
    fetchRaffles();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <BackButton />
      <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-4xl font-black tracking-tighter sm:text-5xl">{t('nav.raffles')}</h1>
          <p className="text-zinc-500">Explore as melhores oportunidades de ganhar hoje.</p>
        </div>
        
        <div className="flex w-full items-center gap-3 md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Procurar rifas..."
              className="w-full rounded-full border border-white/10 bg-zinc-900/50 py-2 pl-10 pr-4 text-sm focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
          <button className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/50 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white">
            <Filter className="h-4 w-4" />
            Filtros
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : raffles.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {raffles.map((raffle: Raffle) => (
            <RaffleCard key={raffle.id} raffle={raffle} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center">
          <p className="text-zinc-500">Nenhuma rifa ativa no momento. Volte mais tarde!</p>
        </div>
      )}
    </div>
  );
}
