import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Loader2, Gift } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Raffle } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import BackButton from '@/src/components/BackButton';

type InstantPrize = {
  id: string;
  raffle_id: string;
  target_number: number;
  prize_value: number;
  prize_type: 'cash' | 'physical';
  description: string;
  rifas: {
    nome: string;
  };
};

export default function InstantPrizes() {
  const navigate = useNavigate();
  const [prizes, setPrizes] = useState<InstantPrize[]>([]);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    raffle_id: '',
    target_number: 1,
    prize_value: 0,
    prize_type: 'cash' as 'cash' | 'physical',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [
        { data: prizesData },
        { data: rafflesData }
      ] = await Promise.all([
        supabase.from('premios_escondidos').select('*, rifas(nome)').order('created_at', { ascending: false }),
        supabase.from('rifas').select('*').eq('status', 'active')
      ]);

      if (prizesData) setPrizes(prizesData as any);
      if (rafflesData) {
        setRaffles(rafflesData);
        if (rafflesData.length > 0) setFormData(prev => ({ ...prev, raffle_id: rafflesData[0].id }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (formData.prize_type === 'cash' && formData.prize_value <= 0) {
      alert('Por favor, insira um valor em dinheiro válido.');
      return;
    }

    if (formData.prize_type === 'physical' && !formData.description.trim()) {
      alert('Por favor, insira uma descrição para o prémio material.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from('premios_escondidos').insert([formData]);
      if (error) throw error;
      
      setFormData({
        ...formData,
        target_number: formData.target_number + 1,
        prize_value: 0,
        prize_type: 'cash',
        description: ''
      });
      fetchData();
    } catch (error: any) {
      alert('Erro ao salvar prêmio: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deletePrize(id: string) {
    if (!confirm('Excluir este prêmio instantâneo?')) return;
    
    try {
      const { error } = await supabase.from('premios_escondidos').delete().eq('id', id);
      if (error) throw error;
      setPrizes(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
      alert('Erro ao excluir prêmio: ' + error.message);
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
      <div className="mx-auto max-w-5xl">
        <BackButton />

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Prêmios Instantâneos</h1>
          <p className="text-zinc-400">Configure prêmios "escondidos" para números específicos.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-white/5 bg-zinc-900 p-6">
              <h2 className="mb-6 flex items-center gap-2 text-lg font-bold">
                <Plus className="h-5 w-5 text-indigo-500" />
                Novo Prêmio
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-400">Rifa</label>
                  <select
                    required
                    value={formData.raffle_id}
                    onChange={(e) => setFormData({ ...formData, raffle_id: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-zinc-800 px-4 py-2 focus:border-indigo-500 focus:outline-none"
                  >
                    {raffles.map(r => (
                      <option key={r.id} value={r.id}>{r.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-400">Tipo de Prémio</label>
                  <select
                    value={formData.prize_type}
                    onChange={(e) => setFormData({ ...formData, prize_type: e.target.value as any })}
                    className="w-full rounded-lg border border-white/10 bg-zinc-800 px-4 py-2 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="cash">Dinheiro</option>
                    <option value="physical">Material</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-400">Número Alvo</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.target_number}
                    onChange={(e) => setFormData({ ...formData, target_number: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-white/10 bg-zinc-800 px-4 py-2 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                {formData.prize_type === 'cash' ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-400">Valor do Prêmio (Kz)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.prize_value}
                      onChange={(e) => setFormData({ ...formData, prize_value: parseFloat(e.target.value) })}
                      className="w-full rounded-lg border border-white/10 bg-zinc-800 px-4 py-2 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-400">Descrição do Prémio</label>
                    <input
                      type="text"
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-zinc-800 px-4 py-2 focus:border-indigo-500 focus:outline-none"
                      placeholder="Ex: iPhone 15"
                    />
                  </div>
                )}
                {formData.prize_type === 'cash' && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-400">Descrição (Opcional)</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-zinc-800 px-4 py-2 focus:border-indigo-500 focus:outline-none"
                      placeholder="Ex: Prémio em Dinheiro"
                    />
                  </div>
                )}
                <button
                  type="submit"
                  disabled={saving || !formData.raffle_id}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 font-bold transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Adicionar Prêmio'}
                </button>
              </form>
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-white/5 bg-zinc-900/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-sm text-zinc-400">
                      <th className="px-6 py-4 font-medium">Rifa</th>
                      <th className="px-6 py-4 font-medium">Número</th>
                      <th className="px-6 py-4 font-medium">Prêmio</th>
                      <th className="px-6 py-4 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {prizes.map((prize) => (
                      <tr key={prize.id} className="transition-colors hover:bg-white/5">
                        <td className="px-6 py-4 text-sm">{prize.rifas?.nome}</td>
                        <td className="px-6 py-4 font-mono font-bold text-indigo-500">#{prize.target_number}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-emerald-500">
                              {prize.prize_type === 'cash' ? formatCurrency(prize.prize_value) : prize.description}
                            </span>
                            <span className="text-xs text-zinc-400">
                              {prize.prize_type === 'cash' ? prize.description : 'Prémio Material'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => deletePrize(prize.id)}
                            className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {prizes.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                          Nenhum prêmio instantâneo configurado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
