import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  ArrowLeft,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import BackButton from '@/src/components/BackButton';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { 
  format, 
  startOfDay, 
  subDays, 
  isWithinInterval, 
  startOfWeek, 
  startOfMonth, 
  startOfYear,
  eachDayOfInterval,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinancialData {
  date: string;
  revenue: number;
  payouts: number;
  profit: number;
}

interface Stats {
  totalRevenue: number;
  totalPayouts: number;
  netProfit: number;
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
}

export default function AdminFinance() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [chartData, setChartData] = useState<FinancialData[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    totalPayouts: 0,
    netProfit: 0,
    dailyRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0
  });

  useEffect(() => {
    fetchFinancialData();
  }, [timeRange]);

  async function fetchFinancialData() {
    setLoading(true);
    try {
      // Fetch all purchases with raffle info
      const { data: purchases, error } = await supabase
        .from('purchases')
        .select('*, rifas(price)')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!purchases) return;

      const now = new Date();
      const today = startOfDay(now);
      const lastWeek = startOfWeek(now);
      const lastMonth = startOfMonth(now);
      const lastYear = startOfYear(now);

      let totalRevenue = 0;
      let totalPayouts = 0;
      let dailyRevenue = 0;
      let weeklyRevenue = 0;
      let monthlyRevenue = 0;
      let yearlyRevenue = 0;

      // Group data by day for chart
      const dailyData: Record<string, { revenue: number; payouts: number }> = {};

      purchases.forEach((p: any) => {
        const date = parseISO(p.created_at);
        const dateStr = format(date, 'yyyy-MM-dd');
        const revenue = Number(p.rifas?.price || 0);
        const payout = Number(p.prize_won_amount || 0);

        totalRevenue += revenue;
        totalPayouts += payout;

        // Stats by period
        if (isWithinInterval(date, { start: today, end: now })) dailyRevenue += revenue;
        if (isWithinInterval(date, { start: lastWeek, end: now })) weeklyRevenue += revenue;
        if (isWithinInterval(date, { start: lastMonth, end: now })) monthlyRevenue += revenue;
        if (isWithinInterval(date, { start: lastYear, end: now })) yearlyRevenue += revenue;

        // Chart data
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = { revenue: 0, payouts: 0 };
        }
        dailyData[dateStr].revenue += revenue;
        dailyData[dateStr].payouts += payout;
      });

      // Prepare chart data based on timeRange
      const daysToFetch = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const startDate = subDays(now, daysToFetch);
      
      const interval = eachDayOfInterval({
        start: startDate,
        end: now
      });

      const formattedChartData = interval.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const data = dailyData[dateStr] || { revenue: 0, payouts: 0 };
        return {
          date: format(day, 'dd/MM', { locale: ptBR }),
          revenue: data.revenue,
          payouts: data.payouts,
          profit: data.revenue - data.payouts
        };
      });

      setChartData(formattedChartData);
      setStats({
        totalRevenue,
        totalPayouts,
        netProfit: totalRevenue - totalPayouts,
        dailyRevenue,
        weeklyRevenue,
        monthlyRevenue,
        yearlyRevenue
      });

    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading && chartData.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <BackButton />
        
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Histórico Financeiro</h1>
            <p className="text-zinc-400">Acompanhe os ganhos e perdas da plataforma.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchFinancialData}
              className="rounded-lg border border-white/5 bg-zinc-900/50 p-2 transition-colors hover:bg-zinc-900"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex rounded-lg border border-white/5 bg-zinc-900/50 p-1">
              {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    timeRange === range 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {range === '7d' ? '7 Dias' : range === '30d' ? '30 Dias' : range === '90d' ? '90 Dias' : 'Tudo'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="h-6 w-6" />
            </div>
            <p className="text-sm text-zinc-400">Receita Total</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
            <p className="mt-1 text-xs text-emerald-500">Vendas de bilhetes</p>
          </div>
          
          <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
              <TrendingDown className="h-6 w-6" />
            </div>
            <p className="text-sm text-zinc-400">Total Pago (Prêmios)</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalPayouts)}</p>
            <p className="mt-1 text-xs text-red-500">Prêmios instantâneos e finais</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <DollarSign className="h-6 w-6" />
            </div>
            <p className="text-sm text-zinc-400">Lucro Líquido</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.netProfit)}</p>
            <p className="mt-1 text-xs text-indigo-500">Saldo da plataforma</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Calendar className="h-6 w-6" />
            </div>
            <p className="text-sm text-zinc-400">Receita Hoje</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.dailyRevenue)}</p>
            <p className="mt-1 text-xs text-amber-500">Últimas 24 horas</p>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Esta Semana</p>
            <p className="text-xl font-bold">{formatCurrency(stats.weeklyRevenue)}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Este Mês</p>
            <p className="text-xl font-bold">{formatCurrency(stats.monthlyRevenue)}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Este Ano</p>
            <p className="text-xl font-bold">{formatCurrency(stats.yearlyRevenue)}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue & Payouts Area Chart */}
          <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-6">
            <h2 className="mb-6 text-lg font-bold">Receita vs Prêmios</h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPayouts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#71717a" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#71717a" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `Kz${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Receita"
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="payouts" 
                    name="Prêmios"
                    stroke="#ef4444" 
                    fillOpacity={1} 
                    fill="url(#colorPayouts)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Profit Bar Chart */}
          <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-6">
            <h2 className="mb-6 text-lg font-bold">Lucro Líquido Diário</h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#71717a" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#71717a" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `Kz${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px' }}
                    formatter={(value: number) => [formatCurrency(value), 'Lucro']}
                  />
                  <Bar 
                    dataKey="profit" 
                    name="Lucro"
                    fill="#6366f1" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Transactions Table (Optional but good) */}
        <div className="mt-8 rounded-xl border border-white/5 bg-zinc-900/50 overflow-hidden">
          <div className="border-b border-white/5 p-6 flex items-center justify-between">
            <h2 className="text-xl font-bold">Resumo por Período</h2>
            <button className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-sm text-zinc-400">
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Receita</th>
                  <th className="px-6 py-4 font-medium">Prêmios Pagos</th>
                  <th className="px-6 py-4 font-medium">Lucro</th>
                  <th className="px-6 py-4 font-medium">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {chartData.slice().reverse().slice(0, 10).map((day, i) => (
                  <tr key={i} className="transition-colors hover:bg-white/5">
                    <td className="px-6 py-4 text-sm">{day.date}</td>
                    <td className="px-6 py-4 text-sm text-emerald-500 font-medium">{formatCurrency(day.revenue)}</td>
                    <td className="px-6 py-4 text-sm text-red-500 font-medium">{formatCurrency(day.payouts)}</td>
                    <td className="px-6 py-4 text-sm font-bold">{formatCurrency(day.profit)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium ${day.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {day.revenue > 0 ? `${((day.profit / day.revenue) * 100).toFixed(1)}%` : '0%'}
                      </span>
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
