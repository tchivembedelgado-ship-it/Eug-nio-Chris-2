import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { formatCurrency } from '@/src/lib/utils';
import { DollarSign, CheckCircle2, XCircle, Loader2, ExternalLink, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BackButton from '@/src/components/BackButton';

type Deposit = {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  receipt_url: string;
  created_at: string;
  profiles: {
    email: string;
  };
};

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDeposits() {
      const { data } = await supabase
        .from('depositos')
        .select('*, profiles(email)')
        .order('created_at', { ascending: false });
      setDeposits(data || []);
      setLoading(false);
    }
    fetchDeposits();
  }, []);

  const handleApprove = async (deposit: Deposit) => {
    setProcessing(deposit.id);
    try {
      // 1. Update deposit status
      const { error: depositError } = await supabase
        .from('depositos')
        .update({ status: 'approved' })
        .eq('id', deposit.id);

      if (depositError) throw depositError;

      // 2. Increment user balance
      const { error: profileError } = await supabase.rpc('increment_balance', {
        p_user_id: deposit.user_id,
        p_amount: Number(deposit.amount)
      });

      if (profileError) throw profileError;

      setDeposits(prev => prev.map(d => d.id === deposit.id ? { ...d, status: 'approved' } : d));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      const { error } = await supabase
        .from('depositos')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
      setDeposits(prev => prev.map(d => d.id === id ? { ...d, status: 'rejected' } : d));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>;

  const pendingDeposits = deposits.filter(d => d.status === 'pending');
  const historyDeposits = deposits.filter(d => d.status !== 'pending');

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <BackButton />
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tighter">Controle de Depósitos</h1>
        <p className="text-zinc-500">Aprove ou rejeite depósitos manuais dos utilizadores.</p>
      </div>

      {/* Pending Section */}
      <div className="mb-12">
        <div className="mb-6 flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-500" />
          <h2 className="text-2xl font-bold">Depósitos Pendentes</h2>
          <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-500">
            {pendingDeposits.length}
          </span>
        </div>

        {pendingDeposits.length === 0 ? (
          <div className="rounded-3xl border border-white/5 bg-zinc-900/50 p-12 text-center text-zinc-500">
            Nenhum depósito pendente no momento.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pendingDeposits.map((deposit) => (
              <motion.div
                key={deposit.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-xl"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Utilizador</div>
                  <div className="text-xs text-zinc-500">{new Date(deposit.created_at).toLocaleString()}</div>
                </div>
                <div className="mb-6 text-lg font-bold text-white truncate">{deposit.profiles.email}</div>
                
                <div className="mb-8">
                  <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Valor</div>
                  <div className="text-4xl font-black text-emerald-500">{formatCurrency(deposit.amount)}</div>
                </div>

                <div className="mb-8">
                  <a
                    href={deposit.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-white transition-all hover:bg-white/10"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver Comprovativo
                  </a>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(deposit)}
                    disabled={!!processing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {processing === deposit.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                    Aprovar
                  </button>
                  <button
                    onClick={() => handleReject(deposit.id)}
                    disabled={!!processing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600/20 py-3 font-bold text-red-500 transition-all hover:bg-red-600/30 disabled:opacity-50"
                  >
                    {processing === deposit.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <XCircle className="h-5 w-5" />}
                    Rejeitar
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* History Section */}
      <div>
        <div className="mb-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-zinc-500" />
          <h2 className="text-2xl font-bold">Histórico Recente</h2>
        </div>

        <div className="rounded-3xl border border-white/5 bg-zinc-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-xs font-bold uppercase tracking-widest text-zinc-500">
                  <th className="px-6 py-4">Utilizador</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {historyDeposits.map((deposit) => (
                  <tr key={deposit.id} className="transition-colors hover:bg-white/5">
                    <td className="px-6 py-4 font-bold text-white">{deposit.profiles.email}</td>
                    <td className="px-6 py-4 font-black text-emerald-500">{formatCurrency(deposit.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                        deposit.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {deposit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">{new Date(deposit.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
