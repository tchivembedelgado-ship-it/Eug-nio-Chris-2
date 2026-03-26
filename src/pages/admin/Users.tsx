import React, { useEffect, useState } from 'react';
import { supabase, type Profile } from '@/src/lib/supabase';
import { formatCurrency } from '@/src/lib/utils';
import { Users, Search, Mail, Shield, User as UserIcon, Loader2, X, Phone, MapPin, CreditCard, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BackButton from '@/src/components/BackButton';

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('email', { ascending: true });
      setUsers(data || []);
      setLoading(false);
    }
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <BackButton />
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Gestão de Utilizadores</h1>
          <p className="text-zinc-500">Visualize e gira todos os utilizadores registados.</p>
        </div>
        
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Procurar por email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-zinc-900 p-4 pl-12 text-white outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-white/5 bg-zinc-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/5 text-xs font-bold uppercase tracking-widest text-zinc-500">
                <th className="px-6 py-4">Utilizador</th>
                <th className="px-6 py-4">Saldo</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                        <UserIcon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{user.email}</span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">{user.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-black text-emerald-500">{formatCurrency(user.balance)}</td>
                  <td className="px-6 py-4">
                    {user.is_admin ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-yellow-500">
                        <Shield className="h-3 w-3" />
                        ADMIN
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-zinc-500">CLIENTE</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedUser(user)}
                      className="rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-2xl rounded-[2.5rem] border border-white/10 bg-zinc-900 p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-3xl font-black tracking-tighter">Detalhes do Utilizador</h2>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="rounded-full bg-white/5 p-2 hover:bg-white/10"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Email</label>
                    <div className="flex items-center gap-2 text-white font-bold">
                      <Mail className="h-4 w-4 text-emerald-500" />
                      {selectedUser.email}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nome Completo</label>
                    <div className="flex items-center gap-2 text-white font-bold">
                      <UserIcon className="h-4 w-4 text-emerald-500" />
                      {selectedUser.full_name || 'Não preenchido'}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Telefone</label>
                    <div className="flex items-center gap-2 text-white font-bold">
                      <Phone className="h-4 w-4 text-emerald-500" />
                      {selectedUser.phone || 'Não preenchido'}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">NIF</label>
                    <div className="flex items-center gap-2 text-white font-bold">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      {selectedUser.nif || 'Não preenchido'}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Saldo Atual</label>
                    <div className="text-2xl font-black text-emerald-500">
                      {formatCurrency(selectedUser.balance)}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Morada</label>
                    <div className="flex items-start gap-2 text-white font-medium">
                      <MapPin className="h-4 w-4 mt-1 text-emerald-500 shrink-0" />
                      {selectedUser.address || 'Não preenchido'}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Dados Bancários</label>
                    <div className="flex items-start gap-2 text-white font-medium">
                      <CreditCard className="h-4 w-4 mt-1 text-emerald-500 shrink-0" />
                      <span className="break-all">{selectedUser.bank_details || 'Não preenchido'}</span>
                    </div>
                  </div>

                  {selectedUser.avatar_url && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Foto de Perfil</label>
                      <div className="mt-2 h-24 w-24 overflow-hidden rounded-full border-2 border-white/10 bg-black/40">
                        <img 
                          src={selectedUser.avatar_url} 
                          alt="Avatar" 
                          className="h-full w-full object-cover cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => window.open(selectedUser.avatar_url, '_blank')}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  )}

                  {selectedUser.bi_photo_url && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Foto do BI</label>
                      <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                        <img 
                          src={selectedUser.bi_photo_url} 
                          alt="BI" 
                          className="w-full object-contain max-h-48 cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => window.open(selectedUser.bi_photo_url, '_blank')}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="rounded-xl bg-white px-8 py-3 font-bold text-black hover:bg-zinc-200"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
