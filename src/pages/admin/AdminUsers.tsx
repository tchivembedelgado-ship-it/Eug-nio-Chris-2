import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Search, 
  User, 
  Wallet, 
  X, 
  AlertTriangle,
  Loader2,
  ArrowLeft,
  History
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import BackButton from '../../components/BackButton';
import { motion, AnimatePresence } from 'framer-motion';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  balance: number;
  created_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [deductForm, setDeductForm] = useState({
    amount: 0,
    reason: 'Tentativa de fraude'
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeductBalance = async () => {
    if (!selectedUser || deductForm.amount <= 0) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('deduct_balance', {
        p_user_id: selectedUser.id,
        p_amount: deductForm.amount,
        p_reason: deductForm.reason
      });

      if (error) throw error;

      const result = data as { success: boolean, message: string };
      if (result.success) {
        // Update local state
        setUsers(prev => prev.map(u => 
          u.id === selectedUser.id 
            ? { ...u, balance: u.balance - deductForm.amount } 
            : u
        ));
        setShowDeductModal(false);
        setDeductForm({ amount: 0, reason: 'Tentativa de fraude' });
        alert('Saldo removido com sucesso!');
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error('Error deducting balance:', err);
      alert('Erro ao processar dedução.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-12 text-white">
      <div className="mx-auto max-w-7xl">
        <BackButton />
        
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Gerenciar Usuários</h1>
          <p className="text-zinc-400">Pesquise usuários e gerencie saldos.</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <input 
            type="text"
            placeholder="Pesquisar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user) => (
              <div 
                key={user.id}
                className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 hover:bg-zinc-900 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg line-clamp-1">{user.full_name || 'Sem Nome'}</h3>
                      <p className="text-xs text-zinc-500 line-clamp-1">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl mb-6">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-zinc-400">Saldo Atual</span>
                  </div>
                  <span className="font-bold text-emerald-500">{formatCurrency(user.balance)}</span>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setSelectedUser(user);
                      setShowDeductModal(true);
                    }}
                    className="flex-1 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-sm font-bold rounded-xl transition-all border border-red-500/20"
                  >
                    Remover Saldo
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredUsers.length === 0 && !loading && (
          <div className="text-center py-12 text-zinc-500">
            Nenhum usuário encontrado com "{searchTerm}"
          </div>
        )}
      </div>

      {/* Deduct Balance Modal */}
      <AnimatePresence>
        {showDeductModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-zinc-900 rounded-3xl border border-white/10 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="text-red-500" />
                  Remover Saldo
                </h3>
                <button onClick={() => setShowDeductModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                  <p className="text-sm text-white font-bold mb-1">Usuário: {selectedUser.full_name}</p>
                  <p className="text-xs text-red-500 leading-relaxed">
                    Atenção: Esta ação irá subtrair o valor do saldo do usuário e registrar uma mensagem de fraude no chat.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Valor a Remover (Kz)</label>
                  <input 
                    type="number"
                    value={deductForm.amount}
                    onChange={(e) => setDeductForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="w-full bg-zinc-800 border-white/5 rounded-xl px-4 py-2 text-white outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <p className="mt-1 text-[10px] text-zinc-500">Saldo atual: {formatCurrency(selectedUser.balance)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Motivo</label>
                  <textarea 
                    value={deductForm.reason}
                    onChange={(e) => setDeductForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full bg-zinc-800 border-white/5 rounded-xl px-4 py-2 text-white outline-none focus:ring-1 focus:ring-red-500 h-24 resize-none"
                  />
                </div>

                <button 
                  onClick={handleDeductBalance}
                  disabled={processing || deductForm.amount <= 0}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                  {processing ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Confirmar Dedução'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
