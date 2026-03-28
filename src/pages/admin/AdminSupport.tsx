import React, { useEffect, useState } from 'react';
import { MessageSquare, Loader2, User, Search, Gift, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BackButton from '@/src/components/BackButton';
import { ChatWindow } from '@/src/components/Chat/ChatWindow';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatUser {
  user_id: string;
  email: string;
  full_name: string;
  last_message_at: string;
}

export default function AdminSupport() {
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string, email: string, full_name: string }[]>([]);

  useEffect(() => {
    fetchChatUsers();
    fetchAllUsers();
    
    // Subscribe to new messages to update the list
    const subscription = supabase
      .channel('admin_chat_list')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages' 
      }, () => {
        fetchChatUsers();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchChatUsers() {
    try {
      // Get unique users from chat_messages
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          user_id,
          created_at,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by user_id and get the latest message date
      const uniqueUsers: Record<string, ChatUser> = {};
      data?.forEach((item: any) => {
        if (!uniqueUsers[item.user_id]) {
          uniqueUsers[item.user_id] = {
            user_id: item.user_id,
            email: item.profiles?.email || 'Sem email',
            full_name: item.profiles?.full_name || 'Usuário',
            last_message_at: item.created_at
          };
        }
      });

      setChatUsers(Object.values(uniqueUsers));
    } catch (error) {
      console.error('Error fetching chat users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .limit(100);
      if (error) throw error;
      setAllUsers(data || []);
    } catch (err) {
      console.error('Error fetching all users:', err);
    }
  }

  const filteredUsers = chatUsers.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAllUsers = allUsers.filter(u => 
    (u.email?.toLowerCase() || '').includes(userSearchTerm.toLowerCase()) || 
    (u.full_name?.toLowerCase() || '').includes(userSearchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <BackButton />

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Suporte ao Cliente</h1>
            <p className="text-zinc-400">Gerencie as conversas e envie presentes aos usuários.</p>
          </div>
          <button 
            onClick={() => {
              setUserSearchTerm('');
              setShowUserSelector(true);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-bold transition-all"
          >
            Nova Conversa
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-12 h-[700px]">
          {/* Users List - Hidden on mobile if a chat is selected */}
          <div className={`lg:col-span-4 flex flex-col gap-4 ${selectedUserId ? 'hidden lg:flex' : 'flex'}`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input 
                type="text"
                placeholder="Buscar usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto rounded-2xl border border-white/5 bg-zinc-900/50 scrollbar-thin scrollbar-thumb-white/10">
              <div className="divide-y divide-white/5">
                {filteredUsers.map((chatUser) => (
                  <button
                    key={chatUser.user_id}
                    onClick={() => {
                      setSelectedUserId(chatUser.user_id);
                      setSelectedUserName(chatUser.full_name);
                    }}
                    className={`w-full p-4 text-left transition-colors hover:bg-white/5 flex items-center gap-3 ${
                      selectedUserId === chatUser.user_id ? 'bg-white/5' : ''
                    }`}
                  >
                    <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      <User className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{chatUser.full_name}</p>
                      <p className="text-xs text-zinc-500 truncate">{chatUser.email}</p>
                    </div>
                    <div className="text-[10px] text-zinc-600">
                      {new Date(chatUser.last_message_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="p-8 text-center text-zinc-500">Nenhuma conversa encontrada.</div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Window - Full screen on mobile if selected */}
          <div className={`lg:col-span-8 ${!selectedUserId ? 'hidden lg:block' : 'block'}`}>
            {selectedUserId ? (
              <div className="flex flex-col h-full">
                {/* Mobile Back Button */}
                <button 
                  onClick={() => setSelectedUserId(null)}
                  className="mb-4 flex items-center gap-2 text-zinc-400 hover:text-white lg:hidden"
                >
                  <Search className="h-4 w-4 rotate-180" />
                  Voltar para lista
                </button>
                <ChatWindow 
                  chatUserId={selectedUserId} 
                  isAdmin={true} 
                  userName={selectedUserName} 
                />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-900/20 p-12 text-center text-zinc-500">
                <MessageSquare className="mb-4 h-12 w-12 opacity-20" />
                <p>Selecione um usuário para iniciar o bate-papo.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* User Selector Modal */}
      <AnimatePresence>
        {showUserSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-zinc-900 rounded-3xl border border-white/10 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Iniciar Nova Conversa</h3>
                <button onClick={() => setShowUserSelector(false)} className="text-zinc-400 hover:text-white">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input 
                  type="text"
                  placeholder="Pesquisar por nome ou email..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full bg-zinc-800 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                {filteredAllUsers.map(u => (
                  <button 
                    key={u.id}
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setSelectedUserName(u.full_name);
                      setShowUserSelector(false);
                    }}
                    className="w-full p-3 text-left bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors flex items-center gap-3"
                  >
                    <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold text-xs">
                      {u.full_name?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{u.full_name || 'Usuário'}</p>
                      <p className="text-xs text-zinc-500">{u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
