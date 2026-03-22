import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { CheckCircle2, Clock, Phone, MapPin, User, Package, Loader2, Crown } from 'lucide-react';
import BackButton from '../../components/BackButton';

interface Claim {
  id: string;
  prize_description: string;
  prize_type: string;
  is_main_prize: boolean;
  status: 'pending' | 'processing' | 'completed';
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    phone: string;
    address: string;
  };
  rifas: {
    nome: string;
  };
}

export default function AdminClaims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  async function fetchClaims() {
    try {
      const { data, error } = await supabase
        .from('winner_claims')
        .select(`
          *,
          profiles (full_name, email, phone, address),
          rifas (nome)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    setUpdating(id);
    try {
      const { error } = await supabase
        .from('winner_claims')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      setClaims(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as any } : c));
    } catch (error: any) {
      alert('Erro ao atualizar status: ' + error.message);
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white md:p-12">
      <div className="mx-auto max-w-6xl">
        <BackButton />
        <div className="mb-10">
          <h1 className="text-4xl font-black tracking-tight">Ganhadores de Prémios</h1>
          <p className="text-zinc-400">Gerencie a entrega de prémios físicos e contacto com ganhadores.</p>
        </div>

        <div className="grid gap-6">
          {claims.length === 0 ? (
            <div className="rounded-[2rem] border border-white/5 bg-zinc-900/50 p-12 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
              <p className="text-zinc-500">Nenhum prémio físico registado ainda.</p>
            </div>
          ) : (
            claims.map((claim) => (
              <div key={claim.id} className="overflow-hidden rounded-[2rem] border border-white/5 bg-zinc-900/50 transition-all hover:border-white/10">
                <div className="flex flex-col md:flex-row">
                  {/* Prize Info */}
                  <div className="flex-1 p-8">
                    <div className="mb-4 flex items-center gap-3">
                      {claim.is_main_prize && (
                        <div className="flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                          <Crown className="h-3 w-3 fill-current" />
                          Prémio Principal
                        </div>
                      )}
                      <div className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                        claim.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                        claim.status === 'processing' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {claim.status === 'pending' ? 'Pendente' : 
                         claim.status === 'processing' ? 'Em Processamento' : 'Entregue'}
                      </div>
                      <span className="text-xs text-zinc-500">
                        {new Date(claim.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <h3 className="mb-1 text-2xl font-black text-white">{claim.prize_description}</h3>
                    <p className="mb-6 text-sm text-zinc-400">Rifa: <span className="text-white">{claim.rifas?.nome}</span></p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center gap-3 text-sm text-zinc-300">
                        <User className="h-4 w-4 text-indigo-500" />
                        <span>{claim.profiles?.full_name || 'Nome não definido'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-zinc-300">
                        <Phone className="h-4 w-4 text-emerald-500" />
                        <span>{claim.profiles?.phone || 'Telefone não definido'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-zinc-300 sm:col-span-2">
                        <MapPin className="h-4 w-4 text-red-500" />
                        <span>{claim.profiles?.address || 'Morada não definida'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col justify-center border-t border-white/5 bg-white/5 p-8 md:w-64 md:border-l md:border-t-0">
                    <div className="space-y-3">
                      {claim.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(claim.id, 'processing')}
                          disabled={updating === claim.id}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-all hover:bg-blue-500 disabled:opacity-50"
                        >
                          {updating === claim.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Processar'}
                        </button>
                      )}
                      {claim.status !== 'completed' && (
                        <button
                          onClick={() => updateStatus(claim.id, 'completed')}
                          disabled={updating === claim.id}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {updating === claim.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Marcar Entregue'}
                        </button>
                      )}
                      <a
                        href={`https://wa.me/${claim.profiles?.phone?.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-700"
                      >
                        <Phone className="h-4 w-4" />
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
