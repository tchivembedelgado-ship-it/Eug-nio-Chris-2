import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { MessageSquare, Clock, CheckCircle2, Loader2, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import BackButton from '@/src/components/BackButton';

type SupportMessage = {
  id: string;
  subject: string;
  message: string;
  response: string | null;
  status: 'open' | 'closed';
  created_at: string;
};

export default function MySupport() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchMessages() {
      const { data } = await supabase
        .from('support')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setMessages(data || []);
      setLoading(false);
    }
    fetchMessages();
  }, [user]);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <BackButton />
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">O Meu Suporte</h1>
          <p className="text-zinc-500">Histórico de mensagens e respostas da equipa.</p>
        </div>
        <Link
          to="/suporte"
          className="rounded-full bg-emerald-600 px-6 py-3 font-bold transition-all hover:bg-emerald-700"
        >
          Nova Mensagem
        </Link>
      </div>

      <div className="grid gap-6">
        {messages.length === 0 ? (
          <div className="rounded-3xl border border-white/5 bg-zinc-900/50 p-12 text-center text-zinc-500">
            Ainda não enviou nenhuma mensagem de suporte.
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/10 bg-zinc-900/50 p-8"
            >
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                    <Clock className="h-3 w-3" />
                    {new Date(msg.created_at).toLocaleString()}
                  </div>
                  <h3 className="text-xl font-bold text-white">{msg.subject}</h3>
                </div>
                <span className={`rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-widest ${
                  msg.status === 'open' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-500/20 text-zinc-500'
                }`}>
                  {msg.status === 'open' ? 'Pendente' : 'Resolvido'}
                </span>
              </div>

              <div className="mb-6 rounded-2xl bg-black/30 p-6 text-zinc-300">
                {msg.message}
              </div>

              {msg.response && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                    Resposta da Equipa
                  </div>
                  <div className="text-zinc-300">{msg.response}</div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
