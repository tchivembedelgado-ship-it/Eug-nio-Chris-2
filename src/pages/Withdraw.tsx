import React, { useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { formatCurrency } from '@/src/lib/utils';
import { Wallet, ArrowRight, CheckCircle2, Loader2, AlertCircle, Landmark, Smartphone, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BackButton from '@/src/components/BackButton';

type WithdrawalMethod = 'iban' | 'express' | 'unitel';

export default function Withdraw() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawalMethod | null>(null);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !method || !details || !amount) return;

    const withdrawAmount = parseFloat(amount);

    if (withdrawAmount <= 0) {
      setError('O valor deve ser superior a zero.');
      return;
    }

    if (withdrawAmount > (profile?.balance || 0)) {
      setError('Saldo insuficiente para este levantamento.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: withdrawError } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount: withdrawAmount,
          method,
          details,
          status: 'pending'
        });

      if (withdrawError) throw withdrawError;
      
      setSuccess(true);
      await refreshProfile();
    } catch (err: any) {
      console.error('Erro no levantamento:', err);
      setError(err.message || 'Ocorreu um erro ao processar o pedido de levantamento.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-[2.5rem] border border-white/10 bg-zinc-900 p-10 text-center shadow-2xl"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h2 className="mb-4 text-3xl font-black text-white">Pedido Enviado!</h2>
          <p className="mb-8 text-zinc-400">
            O seu pedido de levantamento foi registado com sucesso. O valor será debitado da sua conta assim que um administrador aprovar a transferência.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white hover:bg-emerald-500 transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <BackButton />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2.5rem] border border-white/10 bg-zinc-900 p-10 shadow-2xl"
      >
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <Wallet className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-4xl font-black tracking-tighter text-white">Levantar Dinheiro</h1>
          <p className="text-zinc-500">Escolha o método e o valor que deseja levantar.</p>
          <div className="mt-4 inline-block rounded-full bg-white/5 px-4 py-2 text-sm font-bold text-emerald-500">
            Saldo Disponível: {formatCurrency(profile?.balance || 0)}
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-500">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Valor */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Valor a Levantar (Kz)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-zinc-500">Kz</span>
              <input
                required
                type="number"
                min="100"
                step="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/50 p-5 pl-12 text-2xl font-black text-white outline-none focus:border-emerald-500 transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Métodos */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Método de Levantamento</label>
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setMethod('iban')}
                className={`flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 transition-all ${
                  method === 'iban' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-white/10 bg-black/50 text-zinc-500 hover:border-white/20'
                }`}
              >
                <Landmark className="h-6 w-6" />
                <span className="text-xs font-black uppercase">IBAN</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod('express')}
                className={`flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 transition-all ${
                  method === 'express' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-white/10 bg-black/50 text-zinc-500 hover:border-white/20'
                }`}
              >
                <Smartphone className="h-6 w-6" />
                <span className="text-xs font-black uppercase">Express</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod('unitel')}
                className={`flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 transition-all ${
                  method === 'unitel' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-white/10 bg-black/50 text-zinc-500 hover:border-white/20'
                }`}
              >
                <Smartphone className="h-6 w-6" />
                <span className="text-xs font-black uppercase">Unitel Money</span>
              </button>
            </div>
          </div>

          {/* Detalhes do Método */}
          <AnimatePresence mode="wait">
            {method && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  {method === 'iban' ? 'Introduza o seu IBAN' : 'Número de Telefone Associado'}
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    {method === 'iban' ? <CreditCard className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                  </div>
                  <input
                    required
                    type="text"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/50 p-5 pl-12 text-lg font-bold text-white outline-none focus:border-emerald-500 transition-all"
                    placeholder={method === 'iban' ? 'AO06 0000...' : '9XX XXX XXX'}
                  />
                </div>
                <p className="text-[10px] text-zinc-500 italic">
                  * Certifique-se de que os dados estão corretos para evitar atrasos no processamento.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            disabled={loading || !method || !details || !amount}
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 py-5 text-xl font-black text-white transition-all hover:bg-emerald-500 disabled:opacity-50 shadow-lg shadow-emerald-600/20"
          >
            {loading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <ArrowRight className="h-6 w-6" />
                <span>Solicitar Levantamento</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
