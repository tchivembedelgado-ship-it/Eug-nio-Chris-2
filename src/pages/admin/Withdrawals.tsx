import React, { useEffect, useState } from 'react';
import { supabase, type Withdrawal, type Profile } from '@/src/lib/supabase';
import { formatCurrency } from '@/src/lib/utils';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Wallet, 
  Landmark, 
  Smartphone, 
  AlertCircle,
  Loader2,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BackButton from '@/src/components/BackButton';

type WithdrawalWithUser = Withdrawal & { profiles: Profile };

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  async function fetchWithdrawals() {
    setLoading(true);
    setError(null);
    try {
      // Tenta buscar com o join dos perfis
      const { data, error: fetchError } = await supabase
        .from('withdrawals')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Erro detalhado:', fetchError);
        // Se falhar o join, tenta buscar apenas os levantamentos
        const { data: simpleData, error: simpleError } = await supabase
          .from('withdrawals')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (simpleError) throw simpleError;
        setWithdrawals(simpleData as any || []);
        setError("Nota: Não foi possível carregar os dados dos utilizadores, apenas os valores.");
      } else {
        setWithdrawals(data as any || []);
      }
    } catch (err: any) {
      console.error('Error fetching withdrawals:', err);
      setError(err.message || 'Erro ao carregar levantamentos. Verifique as permissões no Supabase.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    if (!confirm('Confirmar que já realizou a transferência externa e deseja aprovar este levantamento? O saldo será debitado da conta do utilizador.')) return;
    
    setProcessingId(id);
    try {
      const { data, error } = await supabase.rpc('approve_withdrawal', { p_withdrawal_id: id });
      
      if (error) throw error;
      
      const result = data as any;
      if (!result.success) {
        alert(result.message);
      } else {
        await fetchWithdrawals();
      }
    } catch (error: any) {
      alert('Erro ao aprovar levantamento: ' + error.message);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Tem certeza que deseja rejeitar este levantamento?')) return;
    
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
      await fetchWithdrawals();
    } catch (error: any) {
      alert('Erro ao rejeitar levantamento: ' + error.message);
    } finally {
      setProcessingId(null);
    }
  }

  const filteredWithdrawals = withdrawals.filter(w => {
    const emailMatch = w.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const detailsMatch = w.details?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const nameMatch = w.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    return emailMatch || detailsMatch || nameMatch;
  });

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <BackButton />
        
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tighter">Validar Levantamentos</h1>
            <p className="text-zinc-500">Gerencie os pedidos de levantamento dos utilizadores.</p>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Pesquisar por email, nome ou detalhes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-zinc-900/50 py-3 pl-12 pr-4 outline-none focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : filteredWithdrawals.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {filteredWithdrawals.map((w) => (
                <motion.div
                  key={w.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group relative overflow-hidden rounded-[2rem] border border-white/5 bg-zinc-900/50 p-8 transition-all hover:border-white/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400">
                        {w.method === 'iban' ? <Landmark className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold uppercase tracking-widest text-zinc-500">
                            {w.method === 'iban' ? 'IBAN' : w.method === 'express' ? 'Express' : 'Unitel Money'}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter ${
                            w.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                            w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                            'bg-red-500/10 text-red-500'
                          }`}>
                            {w.status === 'pending' ? 'Pendente' : w.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                          </span>
                        </div>
                        <div className="text-2xl font-black text-white">{formatCurrency(w.amount)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-500">{new Date(w.created_at).toLocaleDateString()}</div>
                      <div className="text-xs text-zinc-500">{new Date(w.created_at).toLocaleTimeString()}</div>
                    </div>
                  </div>

                  <div className="mt-8 space-y-4 rounded-2xl bg-black/40 p-6">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-zinc-500" />
                      <div>
                        <div className="text-xs font-bold text-zinc-500 uppercase">Utilizador</div>
                        <div className="text-sm font-bold text-white">{w.profiles?.full_name || 'N/A'}</div>
                        <div className="text-xs text-zinc-500">{w.profiles?.email || 'Email não disponível'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Wallet className="h-4 w-4 text-zinc-500" />
                      <div>
                        <div className="text-xs font-bold text-zinc-500 uppercase">Saldo Atual</div>
                        <div className="text-sm font-bold text-emerald-500">{formatCurrency(w.profiles?.balance || 0)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Landmark className="h-4 w-4 text-zinc-500" />
                      <div>
                        <div className="text-xs font-bold text-zinc-500 uppercase">Dados para Transferência</div>
                        <div className="text-sm font-black text-white break-all">{w.details}</div>
                      </div>
                    </div>
                  </div>

                  {w.status === 'pending' && (
                    <div className="mt-8 flex gap-3">
                      <button
                        disabled={processingId === w.id}
                        onClick={() => handleApprove(w.id)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {processingId === w.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Aprovar
                      </button>
                      <button
                        disabled={processingId === w.id}
                        onClick={() => handleReject(w.id)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 py-3 font-bold text-red-500 transition-all hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {processingId === w.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Rejeitar
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center rounded-[2rem] border border-white/5 bg-zinc-900/50 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-500">
              <Clock className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Nenhum levantamento encontrado</h3>
            <p className="text-zinc-500">Todos os pedidos foram processados ou não existem correspondências.</p>
          </div>
        )}
      </div>
    </div>
  );
}
