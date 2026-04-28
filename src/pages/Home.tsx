import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Shield, Zap, ArrowRight, Star, MessageSquare, User, Loader2, Send, Image as ImageIcon, Video, Reply, Ticket } from 'lucide-react';
import { supabase, type Raffle } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { PostCard, Post, AdminSettings } from '../components/AdminPosts';

export default function Home() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [winners, setWinners] = useState<{ user_email: string, prize_amount: number, raffle_name: string }[]>([]);
  const [featuredRaffles, setFeaturedRaffles] = useState<Raffle[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(true);

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

    async function fetchFeatured() {
      const { data } = await supabase
        .from('rifas')
        .select('*')
        .eq('is_featured', true)
        .eq('status', 'active')
        .order('featured_at', { ascending: false });
      
      if (data) setFeaturedRaffles(data);
    }

    async function fetchAdminData() {
      try {
        setLoadingPosts(true);
        // Fetch Settings
        const { data: settingsData } = await supabase
          .from('adm_settings')
          .select('nome_exibicao, avatar_url')
          .single();
        
        if (settingsData) setAdminSettings(settingsData);

        // Fetch Posts
        const { data: postsData } = await supabase
          .from('adm_posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (postsData) setPosts(postsData);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoadingPosts(false);
      }
    }

    fetchWinners();
    fetchFeatured();
    fetchAdminData();
  }, []);

  return (
    <div className="flex flex-col gap-20 pb-20">
      {/* Winner Ticker */}
      {winners.length > 0 && (
        <div className="relative w-full overflow-hidden bg-primary/10 py-3 border-y border-primary/20">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...winners, ...winners].map((winner, i) => (
              <div key={i} className="mx-8 flex items-center gap-2 text-sm font-bold text-primary">
                <Star className="h-4 w-4 fill-gold text-gold" />
                <span>O utilizador <span className="text-white">{winner.user_email}</span> ganhou <span className="text-white">{formatCurrency(winner.prize_amount)}</span> na rifa <span className="text-white">{winner.raffle_name}</span>!</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,0,0.1),transparent_50%)]" />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl"
        >
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold tracking-widest text-primary uppercase">
              A Sorte Está do Teu Lado
            </span>
            <span className="inline-block rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[10px] font-black text-red-500">
              +18
            </span>
          </div>
          <h1 className="mb-2 text-4xl font-black tracking-tighter sm:text-7xl lg:text-8xl">
            {t('home.hero_title')}
          </h1>
          <p className="mb-8 text-sm font-bold tracking-[0.3em] text-zinc-500 uppercase">
            {t('home.hero_tagline')}
          </p>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-zinc-400 sm:text-xl">
            {t('home.hero_subtitle')}
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/rifas"
              className="flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-bold text-black transition-all hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(0,255,0,0.4)]"
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

      {/* Featured Prizes Section */}
      {featuredRaffles.length > 0 && (
        <section className="w-full overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 md:px-8 mb-8">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-black tracking-tighter sm:text-3xl">Prémios em Destaque</h2>
            </div>
            <p className="text-zinc-500 mt-1">As melhores oportunidades selecionadas para você</p>
          </div>

          <div className="relative group">
            {/* Simple marquee wrapper */}
            <div className="flex animate-marquee whitespace-nowrap py-4">
              {/* Double items for infinite loop effect */}
              {[...featuredRaffles, ...featuredRaffles, ...featuredRaffles].map((raffle, i) => (
                <Link
                  key={`${raffle.id}-${i}`}
                  to={`/rifas/${raffle.id}`}
                  className="mx-4 inline-block w-[280px] sm:w-[350px] shrink-0"
                >
                  <div className="h-full overflow-hidden rounded-[2rem] border border-white/5 bg-zinc-900/50 transition-all hover:border-primary/50 hover:bg-zinc-900 group/item">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img 
                        src={raffle.image_url} 
                        alt={raffle.nome} 
                        className="h-full w-full object-cover transition-transform duration-500 group-hover/item:scale-110" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="inline-block rounded-lg bg-primary px-3 py-1 text-xs font-black text-black uppercase tracking-tighter">
                          {formatCurrency(raffle.price)} / Bilhete
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="mb-4 text-lg md:text-xl font-bold line-clamp-1 text-white">{raffle.nome}</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest">
                          <Ticket className="h-4 w-4" />
                          <span>{raffle.sold_count} Números</span>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white transition-all group-hover/item:bg-primary group-hover/item:text-black">
                          <ArrowRight className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Admin Posts Feed */}
      <section className="mx-auto w-full max-w-4xl px-4">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-white">Novidades do ADM</h2>
            <p className="text-zinc-500">Fique por dentro das últimas atualizações</p>
          </div>
          <Link 
            to="/sobre-adm" 
            className="text-sm font-bold uppercase tracking-widest text-primary hover:underline"
          >
            Ver Perfil Completo
          </Link>
        </div>

        <div className="space-y-8">
          {loadingPosts ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                currentUser={user} 
                isAdmin={profile?.is_admin} 
                adminSettings={adminSettings}
                showAdminHeader
              />
            ))
          ) : (
            <div className="rounded-[2.5rem] border border-dashed border-white/10 py-20 text-center">
              <p className="text-zinc-500">Nenhuma publicação recente.</p>
            </div>
          )}
        </div>
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
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
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
        <div className="rounded-[3rem] bg-gradient-to-br from-primary to-primary/40 p-12 sm:p-20">
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
