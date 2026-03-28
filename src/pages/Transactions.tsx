import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { formatCurrency } from '@/src/lib/utils';
import { History, ArrowUpCircle, ArrowDownCircle, Trophy, Loader2, Search, Filter, Gift } from 'lucide-react';
import { motion } from 'motion/react';
import BackButton from '@/src/components/BackButton';

type Transaction = {
  id: string;
  type: 'deposit' | 'purchase' | 'win' | 'withdrawal' | 'gift';
  amount: number;
  description: string;
  status: string;
  created_at: string;
  assigned_number?: number;
};

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'deposit' | 'purchase' | 'win' | 'withdrawal' | 'gift'>('all');

  useEffect(() => {
    if (!user) return;

    async function fetchHistory() {
      setLoading(true);
      
      // Fetch Deposits
      const { data: deposits } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch Purchases
      const { data: purchases } = await supabase
        .from('purchases')
        .select('*, rifas(nome, price)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch Withdrawals
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch Wallet History (Gifts, etc)
      const { data: walletHistory } = await supabase
        .from('wallet_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const history: Transaction[] = [];

      // Process Deposits
      deposits?.forEach(d => {
        history.push({
          id: d.id,
          type: 'deposit',
          amount: d.amount,
          description: `Depósito ${d.status === 'approved' ? 'Aprovado' : d.status === 'pending' ? 'Pendente' : 'Rejeitado'}`,
          status: d.status,
          created_at: d.created_at
        });
      });

      // Process Withdrawals
      withdrawals?.forEach(w => {
        history.push({
          id: w.id,
          type: 'withdrawal',
          amount: -w.amount,
          description: `Levantamento ${w.method.toUpperCase()} ${w.status === 'approved' ? 'Aprovado' : w.status === 'pending' ? 'Pendente' : 'Rejeitado'}`,
          status: w.status,
          created_at: w.created_at
        });
      });

      // Process Purchases & Wins
      purchases?.forEach(p => {
        // The purchase itself (negative)
        history.push({
          id: p.id,
          type: 'purchase',
          amount: -(p.rifas?.price || 0),
          description: `Compra de número na rifa: ${p.rifas?.nome}`,
          status: 'completed',
          created_at: p.created_at,
          assigned_number: p.assigned_number
        });

        // If won (positive)
        if (p.prize_won_amount > 0) {
          history.push({
            id: `${p.id}-win`,
            type: 'win',
            amount: p.prize_won_amount,
            description: `Prémio ganho na rifa: ${p.rifas?.nome}`,
            status: 'completed',
            created_at: p.created_at
          });
        }
      });

      // Process Wallet History (Gifts)
      walletHistory?.forEach(wh => {
        history.push({
          id: wh.id,
          type: wh.type as any,
          amount: wh.amount,
          description: wh.description || 'Transação na carteira',
          status: 'completed',
          created_at: wh.created_at
        });
      });

      // Sort by date
      history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setTransactions(history);
      setLoading(false);
    }

    fetchHistory();
  }, [user]);

  const filteredTransactions = transactions.filter(t => filter === 'all' || t.type === filter);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <BackButton />
      
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter sm:text-6xl">Histórico</h1>
          <p className="text-zinc-500">Acompanhe todas as suas movimentações financeiras.</p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/50 p-2 overflow-x-auto">
          {(['all', 'deposit', 'purchase', 'win', 'withdrawal', 'gift'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                filter === f ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:bg-white/5'
              }`}
            >
              {f === 'all' ? 'Tudo' : f === 'deposit' ? 'Depósitos' : f === 'purchase' ? 'Compras' : f === 'win' ? 'Prémios' : f === 'withdrawal' ? 'Levantamentos' : 'Presentes'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((t, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={t.id}
              className="group flex items-center justify-between overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/50 p-6 transition-all hover:border-white/10 hover:bg-zinc-900"
            >
              <div className="flex items-center gap-6">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                  t.type === 'win' || t.type === 'gift' ? 'bg-yellow-500/10 text-yellow-500' :
                  t.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' :
                  t.type === 'withdrawal' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-red-500/10 text-red-500'
                }`}>
                  {t.type === 'win' || t.type === 'gift' ? <Gift className="h-7 w-7" /> :
                   t.type === 'deposit' ? <ArrowUpCircle className="h-7 w-7" /> :
                   t.type === 'withdrawal' ? <ArrowDownCircle className="h-7 w-7 rotate-180" /> :
                   <ArrowDownCircle className="h-7 w-7" />}
                </div>
                
                <div>
                  <div className="text-lg font-bold text-white">{t.description}</div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>{new Date(t.created_at).toLocaleString()}</span>
                    {t.assigned_number && (
                      <span className="rounded-full bg-white/5 px-2 py-0.5 font-black text-emerald-500">
                        #{t.assigned_number}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-2xl font-black ${
                  t.amount > 0 ? 'text-emerald-500' : 'text-red-500'
                }`}>
                  {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-widest ${
                  t.status === 'approved' || t.status === 'completed' ? 'text-emerald-500' :
                  t.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {t.status === 'approved' || t.status === 'completed' ? 'Concluído' :
                   t.status === 'pending' ? 'Pendente' : 'Cancelado'}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center">
            <History className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
            <p className="text-zinc-500 italic">Nenhuma transação encontrada para este filtro.</p>
          </div>
        )}
      </div>
    </div>
  );
}
