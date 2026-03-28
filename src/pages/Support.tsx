import React from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { MessageSquare } from 'lucide-react';
import BackButton from '@/src/components/BackButton';
import { ChatWindow } from '@/src/components/Chat/ChatWindow';

export default function Support() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <BackButton />
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
          <MessageSquare className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-black tracking-tighter">Suporte ao Cliente</h1>
        <p className="text-zinc-500">Fale diretamente com a nossa equipa em tempo real.</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <ChatWindow chatUserId={user.id} />
      </div>
    </div>
  );
}
