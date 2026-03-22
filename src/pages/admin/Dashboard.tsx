import React, { useEffect, useState } from 'react';
import { supabase, type Raffle } from '@/src/lib/supabase';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/src/lib/utils';
import { LayoutDashboard, Plus, Users, Ticket, DollarSign, Settings, Trash2, Edit, MessageSquare } from 'lucide-react';

export default function AdminDashboard() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [stats, setStats] = useState({ total_users: 0, total_sales: 0, total_revenue: 0, pending_deposits: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [rafflesRes, usersRes, salesRes, depositsRes] = await Promise.all([
        supabase.from('rifas').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('count', { count: 'exact' }),
        supabase.from('participations').select('id, hidden_prize_amount'),
        supabase.from('deposits').select('count', { count: 'exact' }).eq('status', 'pending')
      ]);

      setRaffles(rafflesRes.data || []);
      
      const total_sales = salesRes.data?.length || 0;
      const total_revenue = (rafflesRes.data || []).reduce((acc, r) => acc + (r.price * r.sold_count), 0);

      setStats({
        total_users: usersRes.count || 0,
        total_sales,
        total_revenue,
        pending_deposits: depositsRes.count || 0
      });
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Painel Administrativo</h1>
          <p className="text-zinc-500">Gestão global da plataforma RifaAngola.</p>
        </div>
        <div className="flex gap-4">
          <Link
            to="/admin/deposits"
            className="relative flex items-center gap-2 rounded-full bg-white/5 px-6 py-3 font-bold hover:bg-white/10"
          >
            <DollarSign className="h-5 w-5" />
            Depósitos
            {stats.pending_deposits > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {stats.pending_deposits}
              </span>
            )}
          </Link>
          <Link
            to="/admin/users"
            className="flex items-center gap-2 rounded-full bg-white/5 px-6 py-3 font-bold hover:bg-white/10"
          >
            <Users className="h-5 w-5" />
            Utilizadores
          </Link>
          <Link
            to="/admin/support"
            className="flex items-center gap-2 rounded-full bg-white/5 px-6 py-3 font-bold hover:bg-white/10"
          >
            <MessageSquare className="h-5 w-5" />
            Suporte
          </Link>
          <Link
            to="/admin/create"
            className="flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 font-bold hover:bg-emerald-700"
          >
            <Plus className="h-5 w-5" />
            Nova Rifa
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { icon: Users, label: "Utilizadores", value: stats.total_users, color: "text-blue-500", bg: "bg-blue-500/10" },
          { icon: Ticket, label: "Números Vendidos", value: stats.total_sales, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { icon: DollarSign, label: "Receita Total", value: formatCurrency(stats.total_revenue), color: "text-yellow-500", bg: "bg-yellow-500/10" }
        ].map((stat, i) => (
          <div key={i} className="rounded-3xl border border-white/5 bg-zinc-900/50 p-8">
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">{stat.label}</div>
            <div className="text-3xl font-black text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Raffles Table */}
      <div className="rounded-3xl border border-white/5 bg-zinc-900/50 overflow-hidden">
        <div className="border-b border-white/5 p-6">
          <h3 className="text-xl font-bold">Gestão de Rifas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/5 text-xs font-bold uppercase tracking-widest text-zinc-500">
                <th className="px-6 py-4">Rifa</th>
                <th className="px-6 py-4">Preço</th>
                <th className="px-6 py-4">Progresso</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {raffles.map((raffle) => (
                <tr key={raffle.id} className="transition-colors hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={raffle.image_url} className="h-10 w-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      <span className="font-bold text-white">{raffle.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-emerald-500">{formatCurrency(raffle.price)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${(raffle.sold_count / raffle.total_numbers) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400">{raffle.sold_count}/{raffle.total_numbers}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                      raffle.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'
                    }`}>
                      {raffle.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
