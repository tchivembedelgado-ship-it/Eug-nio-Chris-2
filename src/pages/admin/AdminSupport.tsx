import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send, Loader2, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BackButton from '@/src/components/BackButton';

type SupportTicket = {
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
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [response, setResponse] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    try {
      const { data, error } = await supabase
        .from('support')
        .select('*, profiles(email)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setTickets(data as any);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleResponse(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket || !response.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('support')
        .update({
          response,
          status: 'closed'
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;
      
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, response, status: 'closed' } : t));
      setSelectedTicket(null);
      setResponse('');
    } catch (error: any) {
      alert('Erro ao enviar resposta: ' + error.message);
    } finally {
      setSending(false);
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
      <div className="mx-auto max-w-6xl">
        <BackButton />

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Suporte ao Cliente</h1>
          <p className="text-zinc-400">Responda às dúvidas e problemas dos usuários.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Tickets List */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-white/5 bg-zinc-900/50 overflow-hidden">
              <div className="divide-y divide-white/5">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setResponse(ticket.response || '');
                    }}
                    className={`w-full p-4 text-left transition-colors hover:bg-white/5 ${
                      selectedTicket?.id === ticket.id ? 'bg-white/5' : ''
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-zinc-500">
                        {new Date(ticket.created_at).toLocaleDateString('pt-AO')}
                      </span>
                      {ticket.status === 'open' ? (
                        <Clock className="h-3 w-3 text-amber-500" />
                      ) : (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      )}
                    </div>
                    <p className="mb-1 font-bold truncate">{ticket.subject}</p>
                    <p className="text-sm text-zinc-400 truncate">{ticket.profiles?.email || 'Utilizador Desconhecido'}</p>
                  </button>
                ))}
                {tickets.length === 0 && (
                  <div className="p-8 text-center text-zinc-500">Nenhum ticket encontrado.</div>
                )}
              </div>
            </div>
          </div>

          {/* Ticket Details */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="rounded-xl border border-white/5 bg-zinc-900 p-8">
                <div className="mb-8 flex items-center justify-between border-b border-white/5 pb-6">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedTicket.subject}</h2>
                    <p className="text-zinc-400">De: {selectedTicket.profiles?.email || 'Utilizador Desconhecido'}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    selectedTicket.status === 'open' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {selectedTicket.status === 'open' ? 'Aberto' : 'Fechado'}
                  </span>
                </div>

                <div className="mb-8 space-y-6">
                  <div className="rounded-xl bg-zinc-800/50 p-6">
                    <p className="mb-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">Mensagem do Usuário</p>
                    <p className="whitespace-pre-wrap text-zinc-200">{selectedTicket.message}</p>
                  </div>

                  {selectedTicket.response && (
                    <div className="rounded-xl bg-indigo-500/5 p-6 border border-indigo-500/10">
                      <p className="mb-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">Sua Resposta</p>
                      <p className="whitespace-pre-wrap text-zinc-200">{selectedTicket.response}</p>
                    </div>
                  )}
                </div>

                {selectedTicket.status === 'open' && (
                  <form onSubmit={handleResponse} className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-400">Sua Resposta</label>
                      <textarea
                        required
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        className="h-32 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 focus:border-indigo-500 focus:outline-none"
                        placeholder="Escreva sua resposta aqui..."
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={sending}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-bold transition-colors hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                        <>
                          <Send className="h-5 w-5" />
                          Enviar Resposta e Fechar Ticket
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-white/10 p-12 text-center text-zinc-500">
                <MessageSquare className="mb-4 h-12 w-12 opacity-20" />
                <p>Selecione um ticket para visualizar os detalhes e responder.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
