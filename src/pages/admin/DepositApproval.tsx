import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import BackButton from '../../components/BackButton';

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

export default function DepositApproval() {
  const navigate = useNavigate();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchDeposits();
  }, []);

  async function fetchDeposits() {
    try {
      const { data, error } = await supabase
        .from('depositos')
        .select('*, profiles(email)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setDeposits(data as any);
    } catch (error) {
      console.error('Error fetching deposits:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(deposit: Deposit) {
    if (!confirm(`Aprovar depósito de ${formatCurrency(deposit.amount)} para ${deposit.profiles.email}?`)) return;
    
    setProcessing(deposit.id);
    try {
      // 1. Update deposit status
      const { error: updateError } = await supabase
        .from('depositos')
        .update({ status: 'approved' })
        .eq('id', deposit.id);

      if (updateError) throw updateError;

      // 2. Increment user balance using RPC
      const { error: rpcError } = await supabase.rpc('increment_balance', {
        p_user_id: deposit.user_id,
        p_amount: Number(deposit.amount)
      });

      if (rpcError) throw rpcError;

      setDeposits(prev => prev.map(d => d.id === deposit.id ? { ...d, status: 'approved' } : d));
    } catch (error: any) {
      alert('Erro ao aprovar depósito: ' + error.message);
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(deposit: Deposit) {
    if (!confirm(`Rejeitar depósito de ${formatCurrency(deposit.amount)} para ${deposit.profiles.email}?`)) return;

    setProcessing(deposit.id);
    try {
      const { error } = await supabase
        .from('depositos')
        .update({ status: 'rejected' })
        .eq('id', deposit.id);

      if (error) throw error;
      setDeposits(prev => prev.map(d => d.id === deposit.id ? { ...d, status: 'rejected' } : d));
    } catch (error: any) {
      alert('Erro ao rejeitar depósito: ' + error.message);
    } finally {
      setProcessing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <BackButton />
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Validar Depósitos</h1>
          <p className="text-zinc-400">Aprove ou rejeite os comprovantes de depósito dos clientes.</p>
        </div>

        <div className="rounded-xl border border-white/5 bg-zinc-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-sm text-zinc-400">
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Usuário</th>
                  <th className="px-6 py-4 font-medium">Valor</th>
                  <th className="px-6 py-4 font-medium">Comprovante</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {deposits.map((deposit) => (
                  <tr key={deposit.id} className="transition-colors hover:bg-white/5">
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {new Date(deposit.created_at).toLocaleDateString('pt-AO')}
                    </td>
                    <td className="px-6 py-4 font-medium">{deposit.profiles.email}</td>
                    <td className="px-6 py-4 font-bold text-emerald-500">{formatCurrency(deposit.amount)}</td>
                    <td className="px-6 py-4">
                      <a
                        href={deposit.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ver Recibo
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        deposit.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                        deposit.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {deposit.status === 'pending' ? 'Pendente' : deposit.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {deposit.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(deposit)}
                            disabled={processing === deposit.id}
                            className="rounded-lg bg-emerald-600 p-2 text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                            title="Aprovar"
                          >
                            {processing === deposit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleReject(deposit)}
                            disabled={processing === deposit.id}
                            className="rounded-lg bg-red-600 p-2 text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                            title="Rejeitar"
                          >
                            {processing === deposit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {deposits.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                      Nenhum depósito encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
