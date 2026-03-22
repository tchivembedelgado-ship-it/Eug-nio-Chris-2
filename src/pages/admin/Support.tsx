import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { MessageSquare, Send, CheckCircle2, Loader2, User, Clock } from 'lucide-react';
import { motion } from 'motion/react';

type SupportMessage = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  response: string | null;
  status: 'open' | 'closed';
  created_at: string;
  profiles: {
    email: string;
  };
};

export default function AdminSupport() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function fetchMessages() {
      const { data } = await supabase
        .from('support')
        .select('*, profiles(email)')
        .order('created_at', { ascending: false });
      setMessages(data || []);
      setLoading(false);
    }
    fetchMessages();
  }, []);

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from('support')
        .update({
          response: replyText,
          status: 'closed'
        })
        .eq('id', id);

      if (error) throw error;

      setMessages(prev => prev.map(m => m.id === id ? { ...m, response: replyText, status: 'closed' } : m));
      setReplyingTo(null);
      setReplyText('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tighter">Suporte ao Cliente</h1>
        <p className="text-zinc-500">Responda às dúvidas e problemas dos utilizadores.</p>
      </div>

      <div className="grid gap-6">
        {messages.length === 0 ? (
          <div className="rounded-3xl border border-white/5 bg-zinc-900/50 p-12 text-center text-zinc-500">
            Nenhuma mensagem de suporte encontrada.
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div
              key={msg.id}
              layout
              className={`rounded-3xl border border-white/10 p-8 transition-all ${
                msg.status === 'open' ? 'bg-zinc-900 shadow-xl' : 'bg-zinc-900/40 opacity-80'
              }`}
            >
              <div className="mb-6 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold text-white">{msg.profiles.email}</div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      {new Date(msg.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <span className={`rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-widest ${
                  msg.status === 'open' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-500/20 text-zinc-500'
                }`}>
                  {msg.status === 'open' ? 'Pendente' : 'Resolvido'}
                </span>
              </div>

              <div className="mb-6">
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Assunto</div>
                <div className="text-xl font-bold text-white">{msg.subject}</div>
              </div>

              <div className="mb-8">
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Mensagem</div>
                <div className="rounded-2xl bg-black/30 p-6 text-zinc-300">
                  {msg.message}
                </div>
              </div>

              {msg.response ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                    Resposta Enviada
                  </div>
                  <div className="text-zinc-300">{msg.response}</div>
                </div>
              ) : (
                replyingTo === msg.id ? (
                  <div className="space-y-4">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Escreva a sua resposta aqui..."
                      className="h-32 w-full rounded-2xl border border-white/10 bg-black/50 p-6 text-white outline-none focus:border-emerald-500"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleReply(msg.id)}
                        disabled={sending}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        Enviar Resposta
                      </button>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="rounded-xl bg-white/5 px-8 py-4 font-bold text-white hover:bg-white/10"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setReplyingTo(msg.id)}
                    className="flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-black transition-all hover:bg-zinc-200"
                  >
                    <MessageSquare className="h-5 w-5" />
                    Responder
                  </button>
                )
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
