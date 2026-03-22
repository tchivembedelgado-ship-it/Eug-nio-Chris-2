import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/src/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Plus, Image as ImageIcon, Calendar, Trophy, Hash, DollarSign, Loader2 } from 'lucide-react';
import BackButton from '@/src/components/BackButton';

export default function CreateRaffle() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    price: '',
    total_numbers: '',
    draw_date: '',
    prize_description: '',
    hidden_prizes: [] as { number: number; prize_amount: number }[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create Raffle
      const { data: raffle, error: raffleError } = await supabase
        .from('rifas')
        .insert({
          title: formData.title,
          description: formData.description,
          image_url: formData.image_url,
          price: parseFloat(formData.price),
          total_numbers: parseInt(formData.total_numbers),
          draw_date: formData.draw_date,
          prize_description: formData.prize_description,
          status: 'active'
        })
        .select()
        .single();

      if (raffleError) throw raffleError;

      // 2. Create Instant Prizes
      const instantPrizes = [
        ...formData.hidden_prizes.map(p => ({
          raffle_id: raffle.id,
          target_number: p.number,
          prize_value: p.prize_amount,
          description: 'Prémio de Participação',
          is_main_prize: false
        })),
        {
          raffle_id: raffle.id,
          target_number: parseInt(formData.total_numbers),
          prize_value: 0, // Main prize is usually physical or handled separately, but we mark it
          description: formData.prize_description,
          is_main_prize: true
        }
      ];

      if (instantPrizes.length > 0) {
        const { error: prizeError } = await supabase
          .from('instant_prizes')
          .insert(instantPrizes);
        if (prizeError) throw prizeError;
      }

      navigate('/admin');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addHiddenPrize = () => {
    setFormData(prev => ({
      ...prev,
      hidden_prizes: [...prev.hidden_prizes, { number: 0, prize_amount: 0 }]
    }));
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <BackButton />
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tighter">Criar Nova Rifa</h1>
        <p className="text-zinc-500">Preencha os detalhes para lançar uma nova oportunidade.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid gap-6 rounded-3xl border border-white/5 bg-zinc-900/50 p-8 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Título da Rifa</label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/50 p-4 text-white focus:border-emerald-500 outline-none"
              placeholder="Ex: iPhone 15 Pro Max"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Descrição</label>
            <textarea
              required
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="h-32 w-full rounded-xl border border-white/10 bg-black/50 p-4 text-white focus:border-emerald-500 outline-none"
              placeholder="Detalhes sobre o prémio e o sorteio..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">URL da Imagem</label>
            <div className="relative">
              <ImageIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                type="url"
                value={formData.image_url}
                onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/50 p-4 pl-12 text-white focus:border-emerald-500 outline-none"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Preço por Número (Kz)</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                required
                type="number"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/50 p-4 pl-12 text-white focus:border-emerald-500 outline-none"
                placeholder="1000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Total de Números</label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                required
                type="number"
                value={formData.total_numbers}
                onChange={e => setFormData({ ...formData, total_numbers: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/50 p-4 pl-12 text-white focus:border-emerald-500 outline-none"
                placeholder="100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Data do Sorteio</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                required
                type="datetime-local"
                value={formData.draw_date}
                onChange={e => setFormData({ ...formData, draw_date: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/50 p-4 pl-12 text-white focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Prémio Principal</label>
            <div className="relative">
              <Trophy className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                required
                type="text"
                value={formData.prize_description}
                onChange={e => setFormData({ ...formData, prize_description: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/50 p-4 pl-12 text-white focus:border-emerald-500 outline-none"
                placeholder="Ex: iPhone 15 Pro Max 256GB"
              />
            </div>
          </div>
        </div>

        {/* Hidden Prizes Section */}
        <div className="rounded-3xl border border-white/5 bg-zinc-900/50 p-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold">Prémios Ocultos</h3>
            <button
              type="button"
              onClick={addHiddenPrize}
              className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-bold hover:bg-white/10"
            >
              <Plus className="h-4 w-4" />
              Adicionar Prémio
            </button>
          </div>

          <div className="space-y-4">
            {formData.hidden_prizes.map((prize, index) => (
              <div key={index} className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Número (ex: 10)"
                  className="rounded-xl border border-white/10 bg-black/50 p-4 text-white outline-none"
                  onChange={e => {
                    const newPrizes = [...formData.hidden_prizes];
                    newPrizes[index].number = parseInt(e.target.value);
                    setFormData({ ...formData, hidden_prizes: newPrizes });
                  }}
                />
                <input
                  type="number"
                  placeholder="Valor (Kz)"
                  className="rounded-xl border border-white/10 bg-black/50 p-4 text-white outline-none"
                  onChange={e => {
                    const newPrizes = [...formData.hidden_prizes];
                    newPrizes[index].prize_amount = parseFloat(e.target.value);
                    setFormData({ ...formData, hidden_prizes: newPrizes });
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <button
          disabled={loading}
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 py-5 text-xl font-black transition-all hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Criar Rifa"}
        </button>
      </form>
    </div>
  );
}
