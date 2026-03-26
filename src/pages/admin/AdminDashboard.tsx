import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Users, 
  Ticket, 
  CheckCircle, 
  MessageSquare, 
  TrendingUp,
  Settings,
  Edit,
  Trash2,
  Gift,
  ArrowLeft,
  Wallet,
  Package,
  DollarSign,
  Loader2,
  UserCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Raffle } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import BackButton from '../../components/BackButton';

import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSales: 0,
    activeRaffles: 0
  });
  const [loading, setLoading] = useState(true);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [
        { data: rafflesData },
        { count: usersCount },
        { count: salesCount }
      ] = await Promise.all([
        supabase.from('rifas').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('purchases').select('*', { count: 'exact', head: true })
      ]);

      if (rafflesData) setRaffles(rafflesData);
      setStats({
        totalUsers: usersCount || 0,
        totalSales: salesCount || 0,
        activeRaffles: rafflesData?.filter(r => r.status === 'active').length || 0
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRaffle(id: string) {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }
    
    setProcessingId(id);
    try {
      const { error } = await supabase.from('rifas').delete().eq('id', id);
      if (error) throw error;
      setRaffles(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      alert('Erro ao excluir rifa: ' + error.message);
    } finally {
      setProcessingId(null);
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
    <div className="min-h-screen bg-zinc-950 p-4 md:p-12 text-white">
      <div className="mx-auto max-w-7xl">
        <BackButton />
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Painel Administrador</h1>
            <p className="text-sm md:text-base text-zinc-400">Gerencie suas rifas, usuários e finanças.</p>
          </div>
          <Link
            to="/admin/raffles/new"
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 md:py-2 font-medium transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5" />
            Nova Rifa
          </Link>
        </div>

        {/* Debug Section (Only for Admin) */}
        <div className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 md:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base md:text-lg font-bold text-emerald-500">
            <Settings className="h-5 w-5" />
            Estado do Sistema (Admin)
          </h2>
          <div className="grid gap-4 text-xs md:text-sm grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1">
              <span className="text-zinc-500 uppercase text-[9px] md:text-[10px] font-bold">Email Atual</span>
              <span className="font-mono text-white break-all">{user?.email || 'N/A'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-zinc-500 uppercase text-[9px] md:text-[10px] font-bold">Reconhecido como Admin</span>
              <span className={`font-bold ${stats.totalUsers > 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {stats.totalUsers > 0 ? 'SIM (Acesso à DB OK)' : 'VERIFICANDO (Sem dados da DB)'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-zinc-500 uppercase text-[9px] md:text-[10px] font-bold">Conexão Supabase</span>
              <span className="text-emerald-500 font-bold">ATIVA</span>
            </div>
          </div>
          {stats.totalUsers === 0 && (
            <div className="mt-4 rounded-lg bg-amber-500/10 p-3 text-[10px] md:text-xs text-amber-500">
              Aviso: Não foram encontrados utilizadores na base de dados. Se já existiam utilizadores, verifique as políticas RLS ou se a tabela foi limpa.
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-5 md:p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-xs md:text-sm text-zinc-400">Total de Usuários</p>
            <p className="text-xl md:text-2xl font-bold">{stats.totalUsers}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-5 md:p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Ticket className="h-6 w-6" />
            </div>
            <p className="text-xs md:text-sm text-zinc-400">Total de Vendas</p>
            <p className="text-xl md:text-2xl font-bold">{stats.totalSales}</p>
          </div>
          <Link to="/admin/finance" className="rounded-2xl border border-white/5 bg-zinc-900/50 p-5 md:p-6 transition-colors hover:bg-zinc-900">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <DollarSign className="h-6 w-6" />
            </div>
            <p className="text-xs md:text-sm text-zinc-400">Ganhos da Plataforma</p>
            <p className="text-xl md:text-2xl font-bold">Ver Finanças</p>
          </Link>
          <Link to="/admin/deposits" className="rounded-2xl border border-white/5 bg-zinc-900/50 p-5 md:p-6 transition-colors hover:bg-zinc-900">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <CheckCircle className="h-6 w-6" />
            </div>
            <p className="text-xs md:text-sm text-zinc-400">Validar Depósitos</p>
            <p className="text-xl md:text-2xl font-bold">Ver Lista</p>
          </Link>
          <Link to="/admin/withdrawals" className="rounded-2xl border border-white/5 bg-zinc-900/50 p-5 md:p-6 transition-colors hover:bg-zinc-900">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
              <Wallet className="h-6 w-6" />
            </div>
            <p className="text-xs md:text-sm text-zinc-400">Validar Levantamentos</p>
            <p className="text-xl md:text-2xl font-bold">Ver Lista</p>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/admin/config-perfil" className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/50 p-4 transition-colors hover:bg-zinc-900">
            <UserCircle className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Perfil Social (Posts)</span>
          </Link>
          <Link to="/admin/support" className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/50 p-4 transition-colors hover:bg-zinc-900">
            <MessageSquare className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-medium">Suporte ao Cliente</span>
          </Link>
          <Link to="/admin/prizes" className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/50 p-4 transition-colors hover:bg-zinc-900">
            <Gift className="h-5 w-5 text-amber-500" />
            <span className="text-sm font-medium">Prêmios Instantâneos</span>
          </Link>
          <Link to="/admin/claims" className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/50 p-4 transition-colors hover:bg-zinc-900">
            <Package className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium">Ganhadores de Prêmios</span>
          </Link>
          <Link to="/admin/finance" className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/50 p-4 transition-colors hover:bg-zinc-900">
            <TrendingUp className="h-5 w-5 text-zinc-400" />
            <span className="text-sm font-medium">Relatórios Financeiros</span>
          </Link>
        </div>

        {/* Raffles List */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/50 overflow-hidden">
          <div className="border-b border-white/5 p-5 md:p-6">
            <h2 className="text-lg md:text-xl font-bold">Gerenciar Rifas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-[10px] md:text-sm text-zinc-400 uppercase tracking-wider">
                  <th className="px-4 md:px-6 py-4 font-bold">Rifa</th>
                  <th className="px-4 md:px-6 py-4 font-bold hidden sm:table-cell">Progresso</th>
                  <th className="px-4 md:px-6 py-4 font-bold">Preço</th>
                  <th className="px-4 md:px-6 py-4 font-bold hidden md:table-cell">Prêmio Principal</th>
                  <th className="px-4 md:px-6 py-4 font-bold">Status</th>
                  <th className="px-4 md:px-6 py-4 font-bold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {raffles.map((raffle) => (
                  <tr key={raffle.id} className="transition-colors hover:bg-white/5">
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={raffle.image_url}
                          alt=""
                          className="h-8 w-8 md:h-10 md:w-10 rounded object-cover"
                        />
                        <span className="font-bold text-sm md:text-base line-clamp-1">{raffle.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 hidden sm:table-cell">
                      <div className="w-24 md:w-32">
                        <div className="mb-1 flex justify-between text-[10px]">
                          <span>{raffle.sold_count} / {raffle.total_numbers}</span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all"
                            style={{ width: `${(raffle.sold_count / raffle.total_numbers) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-xs md:text-sm font-medium">{formatCurrency(raffle.price)}</td>
                    <td className="px-4 md:px-6 py-4 text-xs md:text-sm text-amber-500 font-bold hidden md:table-cell">{formatCurrency(raffle.main_prize_value)}</td>
                    <td className="px-4 md:px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-tighter ${
                        raffle.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                        raffle.status === 'completed' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {raffle.status === 'active' ? 'Ativa' : raffle.status === 'completed' ? 'Finalizada' : 'Cancelada'}
                      </span>
                    </td>
                        <td className="px-4 md:px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/admin/raffles/edit/${raffle.id}`}
                              className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => deleteRaffle(raffle.id)}
                              disabled={processingId === raffle.id}
                              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-all disabled:opacity-50 ${
                                deleteConfirm === raffle.id 
                                  ? 'bg-red-600 text-white animate-pulse' 
                                  : 'bg-zinc-800 text-zinc-400 hover:bg-red-500/20 hover:text-red-500'
                              }`}
                              title={deleteConfirm === raffle.id ? "Clique novamente para confirmar" : "Excluir Rifa"}
                            >
                              {processingId === raffle.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              {deleteConfirm === raffle.id ? 'Confirmar?' : ''}
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
    </div>
  );
}
