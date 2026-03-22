import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase, type Raffle } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { formatCurrency } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Trophy, Users, ShieldCheck, Loader2, CheckCircle2, XCircle, Zap, ArrowLeft, Sparkles, Heart, Crown } from 'lucide-react';
import confetti from 'canvas-confetti';
import BackButton from '@/src/components/BackButton';

export default function RaffleDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<{ 
    success: boolean; 
    number?: number; 
    numbers?: number[];
    won_prize?: boolean; 
    prize_type?: 'cash' | 'physical';
    prize_value?: number; 
    total_prize_value?: number;
    is_main_prize?: boolean;
    prizes_won?: any[];
    message?: string;
    quantity?: number;
  } | null>(null);

  useEffect(() => {
    async function fetchRaffle() {
      const { data } = await supabase
        .from('rifas')
        .select('*')
        .eq('id', id)
        .single();
      setRaffle(data);
      setLoading(false);
    }
    fetchRaffle();

    // Real-time updates for raffle progress
    const subscription = supabase
      .channel(`raffle-${id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'rifas',
        filter: `id=eq.${id}`
      }, (payload) => {
        setRaffle(payload.new as Raffle);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  const handleBuy = async (buyQuantity: number = quantity) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const isProfileComplete = 
      profile?.full_name && 
      profile?.phone && 
      profile?.address && 
      profile?.nif && 
      profile?.bank_details && 
      profile?.bi_photo_url;

    if (!isProfileComplete) {
      navigate('/perfil');
      return;
    }

    if (profile && profile.balance < (raffle?.price || 0) * buyQuantity) {
      setResult({ success: false, message: "Saldo insuficiente. Por favor, recarregue a sua conta." });
      return;
    }

    setBuying(true);
    try {
      const { data, error } = await supabase.rpc('process_raffle_purchase', {
        p_raffle_id: id,
        p_user_id: user.id,
        p_quantity: buyQuantity
      });

      if (error) throw error;
      
      const mappedResult = {
        success: data.success,
        numbers: data.numbers,
        won_prize: data.won_prize,
        is_main_prize: data.is_main_prize,
        prizes_won: data.prizes_won,
        message: data.message,
        quantity: buyQuantity
      };

      setResult(mappedResult);
      if (data.success) {
        // Refresh profile to update balance
        refreshProfile();

        if (data.won_prize || data.is_main_prize) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10b981', '#fbbf24', '#ffffff']
          });
        }
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message });
    } finally {
      setBuying(false);
    }
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>;
  if (!raffle) return <div className="text-center py-20">Rifa não encontrada.</div>;

  const remaining = raffle.total_numbers - raffle.sold_count;
  // Progress hidden for surprise

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <BackButton />
      <div className="grid gap-12 lg:grid-cols-2">
        {/* Left: Image & Info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900 shadow-2xl">
            <img
              src={raffle.image_url || 'https://picsum.photos/seed/raffle/1200/800'}
              alt={raffle.nome}
              className="w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: Trophy, label: t('raffle.prize'), value: raffle.main_prize_type === 'cash' ? formatCurrency(raffle.main_prize_value) : raffle.nome },
              { icon: Calendar, label: t('raffle.draw_date'), value: new Date(raffle.draw_date).toLocaleDateString() },
              { icon: Users, label: t('raffle.total'), value: raffle.total_numbers },
              { icon: ShieldCheck, label: "Segurança", value: "Verificado" }
            ].map((item, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-zinc-900/50 p-4 text-center">
                <item.icon className="mx-auto mb-2 h-5 w-5 text-emerald-500" />
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">{item.label}</div>
                <div className="text-sm font-bold text-white truncate">{item.value}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right: Purchase Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col justify-center"
        >
          <h1 className="mb-4 text-4xl font-black tracking-tighter sm:text-6xl">{raffle.nome}</h1>
          <p className="mb-8 text-lg text-zinc-400">{raffle.description}</p>

          <div className="mb-10 rounded-3xl border border-white/10 bg-zinc-900/80 p-8 backdrop-blur-sm">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{t('raffle.price')}</span>
                <div className="text-5xl font-black text-emerald-500">{formatCurrency(raffle.price)}</div>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Zap className="h-8 w-8 fill-current" />
              </div>
            </div>

            {/* Quantity Selection */}
            <div className="mb-6">
              <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-zinc-500">Quantidade</span>
              <div className="grid grid-cols-3 gap-3">
                {[1, 5, 10].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuantity(Math.min(q, remaining))}
                    disabled={remaining < 1}
                    className={`rounded-xl border py-3 font-bold transition-all ${
                      quantity === q
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                        : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20'
                    } ${remaining < q && remaining > 0 && quantity !== q ? 'opacity-50' : ''}`}
                  >
                    {q}x
                  </button>
                ))}
              </div>
              {remaining > 0 && remaining < 10 && (
                <p className="mt-2 text-xs text-amber-500 font-bold">
                  Apenas {remaining} {remaining === 1 ? 'bilhete resta' : 'bilhetes restam'}!
                </p>
              )}
              {quantity > 1 && (
                <div className="mt-3 text-right text-sm font-medium text-zinc-400">
                  Total: <span className="text-white">{formatCurrency(raffle.price * quantity)}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => handleBuy()}
              disabled={buying || remaining <= 0}
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-emerald-600 py-5 text-xl font-black transition-all hover:bg-emerald-500 disabled:opacity-50"
            >
              {buying ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  {t('raffle.buy_number')}
                  <Zap className="h-6 w-6 fill-current" />
                </>
              )}
            </button>
            
            <p className="mt-4 text-center text-xs text-zinc-500">
              * O número será atribuído automaticamente pelo sistema.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Result Modal */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md rounded-[2.5rem] border border-white/10 bg-zinc-900 p-10 text-center shadow-2xl"
            >
              {result.success ? (
                <>
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                    <CheckCircle2 className="h-12 w-12" />
                  </div>
                  <h2 className="mb-2 text-3xl font-black text-white">Compra Sucesso!</h2>
                  <p className="mb-6 text-zinc-400">
                    {result.quantity && result.quantity > 1 
                      ? `Os seus ${result.quantity} números são:` 
                      : 'O seu número é:'}
                  </p>
                  
                  <div className="mb-8 flex flex-wrap justify-center gap-3">
                    {result.numbers ? (
                      result.numbers.map((n) => (
                        <div key={n} className="rounded-xl bg-emerald-500 px-4 py-2 text-xl font-black text-black">
                          #{n}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-emerald-500 px-8 py-4 text-4xl font-black text-black">
                        #{result.number}
                      </div>
                    )}
                  </div>
                  
                  {result.is_main_prize && (
                    <div className="mb-8 rounded-2xl bg-amber-500/10 p-6 border border-amber-500/20 animate-bounce">
                      <Trophy className="mx-auto mb-2 h-8 w-8 text-amber-500" />
                      <div className="text-xl font-bold text-amber-500 mb-2">
                        PARABÉNS! VOCÊ É O GRANDE VENCEDOR!
                      </div>
                      <p className="text-sm text-zinc-300">
                        O destino escolheu você! Você ganhou o prêmio principal: {raffle.main_prize_type === 'physical' ? raffle.main_prize_description : raffle.nome}!
                        {raffle.main_prize_type === 'cash' && (
                          <span className="block mt-2 font-bold text-emerald-500">
                            O valor de {formatCurrency(raffle.main_prize_value)} foi adicionado automaticamente ao seu saldo!
                          </span>
                        )}
                        {raffle.main_prize_type === 'physical' && (
                          <span className="block mt-2 font-bold text-amber-500">
                            A nossa equipa entrará em contacto para a entrega deste prémio físico. Pode acompanhar o estado em <Link to="/meus-premios" className="underline hover:text-amber-400">Meus Prémios</Link>.
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {result.won_prize && !result.is_main_prize && (
                    <div className="mb-8 rounded-2xl bg-indigo-500/10 p-6 border border-indigo-500/20">
                      <Sparkles className="mx-auto mb-2 h-8 w-8 text-indigo-500" />
                      <div className="text-xl font-bold text-indigo-500 mb-2">
                        INCRÍVEL! VOCÊ GANHOU PRÉMIOS!
                      </div>
                      <div className="space-y-4 text-sm text-zinc-300">
                        <p>A sorte sorriu para si hoje!</p>
                        
                        {result.prizes_won && result.prizes_won.length > 0 && (
                          <div className="space-y-2">
                            {result.prizes_won.map((prize: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between rounded-xl bg-white/5 p-3 border border-white/5">
                                <span className="font-bold text-indigo-400">#{prize.number}</span>
                                <span className="text-white font-medium">
                                  {prize.type === 'cash' ? formatCurrency(prize.value) : prize.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {result.total_prize_value && result.total_prize_value > 0 && (
                          <p className="mt-4 font-bold text-emerald-500">
                            O valor total de {formatCurrency(result.total_prize_value)} já está na sua conta. Continue assim!
                          </p>
                        )}
                        
                        {result.prizes_won?.some((p: any) => p.type === 'physical') && (
                          <p className="mt-4 font-bold text-indigo-500">
                            Ganhou prémios físicos! A nossa equipa entrará em contacto para a entrega. Pode acompanhar o estado em <Link to="/meus-premios" className="underline hover:text-indigo-400">Meus Prémios</Link>.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {!result.won_prize && !result.is_main_prize && (
                    <div className="mb-8 space-y-4">
                      <p className="text-zinc-400 italic">
                        {result.quantity && result.quantity > 1 
                          ? `${result.quantity} números adquiridos!` 
                          : `Número #${result.number} adquirido!`}
                      </p>
                      <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
                        <Heart className="mx-auto mb-2 h-6 w-6 text-red-500" />
                        <p className="text-sm text-zinc-300">
                          "Não foi desta vez, mas a persistência é o caminho do êxito. Tente novamente, a sua sorte pode estar no próximo clique!"
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 text-red-500">
                    <XCircle className="h-12 w-12" />
                  </div>
                  <h2 className="mb-2 text-3xl font-black text-white">Erro na Compra</h2>
                  <p className="mb-8 text-zinc-400">{result.message || "Ocorreu um erro inesperado."}</p>
                </>
              )}

              <button
                onClick={() => setResult(null)}
                className="w-full rounded-xl bg-white py-4 font-bold text-black hover:bg-zinc-200"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
