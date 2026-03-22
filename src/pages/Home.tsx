import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trophy, Shield, Zap, ArrowRight, Star } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { formatCurrency } from '@/src/lib/utils';

export default function Home() {
  const { t } = useTranslation();
  const [winners, setWinners] = useState<{ user_email: string, prize_amount: number, raffle_name: string }[]>([]);

  useEffect(() => {
    async function fetchWinners() {
      const { data } = await supabase
        .from('purchases')
        .select('prize_won_amount, profiles(email), rifas(nome)')
        .gt('prize_won_amount', 0)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) {
        setWinners(data.map((w: any) => ({
          user_email: w.profiles?.email?.split('@')[0] || 'Utilizador',
          prize_amount: w.prize_won_amount,
          raffle_name: w.rifas?.nome || 'Rifa'
        })));
      }
    }
    fetchWinners();
  }, []);

  return (
    <div className="flex flex-col gap-20 pb-20">
      {/* Winner Ticker */}
      {winners.length > 0 && (
        <div className="relative w-full overflow-hidden bg-emerald-600/10 py-3 border-y border-emerald-500/20">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...winners, ...winners].map((winner, i) => (
              <div key={i} className="mx-8 flex items-center gap-2 text-sm font-bold text-emerald-500">
                <Star className="h-4 w-4 fill-current" />
                <span>O utilizador <span className="text-white">{winner.user_email}</span> ganhou <span className="text-white">{formatCurrency(winner.prize_amount)}</span> na rifa <span className="text-white">{winner.raffle_name}</span>!</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_50%)]" />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl"
        >
          <span className="mb-4 inline-block rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-bold tracking-widest text-emerald-500 uppercase">
            A Sorte Está do Teu Lado
          </span>
          <h1 className="mb-6 text-4xl font-black tracking-tighter sm:text-7xl lg:text-8xl">
            {t('home.hero_title')}
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-zinc-400 sm:text-xl">
            {t('home.hero_subtitle')}
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/rifas"
              className="flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-4 text-lg font-bold transition-all hover:bg-emerald-700 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
            >
              {t('home.cta')}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <button className="rounded-full border border-white/10 bg-white/5 px-8 py-4 text-lg font-bold backdrop-blur-sm transition-all hover:bg-white/10">
              {t('home.how_it_works')}
            </button>
          </div>
        </motion.div>
      </section>

      {/* Steps Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            { icon: Trophy, title: t('home.step1'), desc: "Escolha entre dezenas de rifas ativas com prémios incríveis." },
            { icon: Zap, title: t('home.step2'), desc: "O sistema atribui automaticamente o próximo número disponível." },
            { icon: Shield, title: t('home.step3'), desc: "Sorteios transparentes e pagamentos instantâneos para prémios ocultos." }
          ].map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              viewport={{ once: true }}
              className="rounded-3xl border border-white/5 bg-zinc-900/30 p-8 text-center"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <step.icon className="h-8 w-8" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">{step.title}</h3>
              <p className="text-zinc-400">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Motivational Section */}
      <section className="mx-auto max-w-5xl px-4 py-20 text-center">
        <div className="rounded-[3rem] bg-gradient-to-br from-emerald-600 to-emerald-900 p-12 sm:p-20">
          <h2 className="mb-8 text-3xl font-black sm:text-5xl">
            {t('home.motivational')}
          </h2>
          <Link
            to="/register"
            className="inline-block rounded-full bg-white px-10 py-4 text-lg font-bold text-black transition-all hover:scale-105 hover:bg-zinc-200"
          >
            Começar Agora
          </Link>
        </div>
      </section>
    </div>
  );
}
