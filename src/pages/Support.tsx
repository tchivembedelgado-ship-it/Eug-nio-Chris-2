import React, { useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import BackButton from '@/src/components/BackButton';

export default function Support() {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await supabase
        .from('support')
        .insert({
          user_id: user.id,
          subject,
          message,
          status: 'open'
        });

      if (submitError) throw submitError;

      setSuccess(true);
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-3xl border border-white/5 bg-zinc-900/50 p-12"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="mb-4 text-3xl font-black tracking-tighter">Mensagem Enviada!</h2>
          <p className="mb-8 text-zinc-400">
            A sua mensagem foi enviada com sucesso. A nossa equipa de suporte irá responder o mais breve possível.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="rounded-full bg-emerald-600 px-8 py-3 font-bold transition-all hover:bg-emerald-700"
          >
            Enviar outra mensagem
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <BackButton />
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
          <MessageSquare className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-black tracking-tighter">Suporte ao Cliente</h1>
        <p className="text-zinc-500">Como podemos ajudar hoje?</p>
      </div>

      <div className="rounded-3xl border border-white/5 bg-zinc-900/50 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-400">Assunto</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
              placeholder="Ex: Dúvida sobre depósito"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-400">Mensagem</label>
            <textarea
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
              placeholder="Descreva o seu problema detalhadamente..."
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 p-4 text-sm font-medium text-red-500">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 font-bold transition-all hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? (
              'A enviar...'
            ) : (
              <>
                <Send className="h-5 w-5" />
                Enviar Mensagem
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
