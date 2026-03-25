import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/src/lib/utils';
import { Raffle } from '@/src/lib/supabase';
import { motion } from 'motion/react';
import { Zap } from 'lucide-react';

interface RaffleCardProps {
  raffle: Raffle;
  key?: string | number;
}

export default function RaffleCard({ raffle }: RaffleCardProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50 transition-all hover:border-primary/30 hover:bg-zinc-900"
    >
      <div className="aspect-video w-full overflow-hidden">
        <img
          src={raffle.image_url || 'https://picsum.photos/seed/raffle/800/450'}
          alt={raffle.nome}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
      </div>
      
      <div className="p-5">
        <h3 className="mb-4 text-xl font-black tracking-tight text-white">{raffle.nome}</h3>
        
        <div className="mb-6 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t('raffle.price')}</span>
            <span className="text-2xl font-black text-gold">{formatCurrency(raffle.price)}</span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Zap className="h-5 w-5 fill-current" />
          </div>
        </div>

        <Link
          to={`/rifas/${raffle.id}`}
          className="block w-full rounded-2xl bg-white py-4 text-center text-sm font-black uppercase tracking-widest text-black transition-all hover:bg-primary hover:text-white hover:shadow-[0_0_20px_rgba(0,255,0,0.3)]"
        >
          {t('raffle.buy_number')}
        </Link>
      </div>
    </motion.div>
  );
}
