import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, ExternalLink, Loader2, Trash2 } from 'lucide-react';
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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [approveConfirm, setApproveConfirm] = useState<string | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchDeposits();
  }, []);

  async function fetchDeposits() {
    try {
      const { data, error } = await supabase
        .from('depositos')
        .select('*, profiles(email)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching deposits:', error);
        // Fallback to simple fetch if join fails
        const { data: simpleData, error: simpleError } = await supabase
          .from('depositos')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (simpleError) throw simpleError;
        setDeposits(simpleData as any || []);
      } else if (data) {
        setDeposits(data as any);
      }
    } catch (error) {
      console.error('Error fetching deposits:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(deposit: Deposit) {
    if (approveConfirm !== deposit.id) {
      setApproveConfirm(deposit.id);
      setRejectConfirm(null); // Clear other confirmations for the same item
      setDeleteConfirm(null);
      setTimeout(() => setApproveConfirm(null), 3000);
      return;
    }
    
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
      setApproveConfirm(null);
    }
  }

  async function handleReject(deposit: Deposit) {
    if (rejectConfirm !== deposit.id) {
      setRejectConfirm(deposit.id);
      setApproveConfirm(null); // Clear other confirmations for the same item
      setDeleteConfirm(null);
      setTimeout(() => setRejectConfirm(null), 3000);
      return;
    }

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
      setRejectConfirm(null);
    }
  }

  async function handleDelete(id: string) {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      setApproveConfirm(null);
      setRejectConfirm(null);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    setProcessing(id);
    try {
      const { error } = await supabase
        .from('depositos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDeposits(prev => prev.filter(d => d.id !== id));
    } catch (error: any) {
      alert('Erro ao eliminar registo: ' + error.message);
    } finally {
      setProcessing(null);
      setDeleteConfirm(null);
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
                    <td className="px-6 py-4 font-medium">{deposit.profiles?.email || 'N/A'}</td>
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
                      {deposit.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(deposit)}
                            disabled={processing === deposit.id}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white transition-all disabled:opacity-50 ${
                              approveConfirm === deposit.id 
                                ? 'bg-emerald-500 animate-pulse' 
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                            title={approveConfirm === deposit.id ? "Clique novamente para aprovar" : "Aprovar"}
                          >
                            {processing === deposit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            {approveConfirm === deposit.id ? 'Confirmar?' : 'Aprovar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(deposit)}
                            disabled={processing === deposit.id}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white transition-all disabled:opacity-50 ${
                              rejectConfirm === deposit.id 
                                ? 'bg-red-500 animate-pulse' 
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                            title={rejectConfirm === deposit.id ? "Clique novamente para rejeitar" : "Rejeitar"}
                          >
                            {processing === deposit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            {rejectConfirm === deposit.id ? 'Confirmar?' : 'Rejeitar'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(deposit.id);
                          }}
                          disabled={processing === deposit.id}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
                            deleteConfirm === deposit.id 
                              ? 'bg-red-600 text-white animate-pulse' 
                              : 'bg-zinc-800 text-zinc-400 hover:bg-red-500/20 hover:text-red-500'
                          }`}
                          title={deleteConfirm === deposit.id ? "Clique novamente para confirmar" : "Eliminar do Histórico"}
                        >
                          {processing === deposit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          {deleteConfirm === deposit.id ? 'Confirmar?' : 'Eliminar'}
                        </button>
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
