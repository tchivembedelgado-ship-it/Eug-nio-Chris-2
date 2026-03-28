import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, ArrowLeft, Loader2, Trash2, ExternalLink, Calendar, MessageSquare, Ticket, Wallet, HelpCircle, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import BackButton from '../components/BackButton';

interface Notification {
  id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  link: string;
  lida: boolean;
  created_at: string;
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error) {
        setNotifications(data || []);
      }
      setLoading(false);
    };

    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel('notifications-page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications((prev) =>
              prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n))
            );
          } else if (payload.eventType === 'DELETE') {
            setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (notification: Notification) => {
    if (notification.lida) {
      if (notification.link) navigate(notification.link);
      return;
    }

    const { error } = await supabase
      .from('notifications')
      .update({ lida: true })
      .eq('id', notification.id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, lida: true } : n))
      );
      if (notification.link) navigate(notification.link);
    }
  };

  const markAllAsRead = async () => {
    if (!user || notifications.every(n => n.lida)) return;
    
    setMarkingAllAsRead(true);
    const { error } = await supabase
      .from('notifications')
      .update({ lida: true })
      .eq('user_id', user.id)
      .eq('lida', false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
    }
    setMarkingAllAsRead(false);
  };

  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'rifa': return <Ticket className="h-5 w-5 text-indigo-400" />;
      case 'deposito':
      case 'deposito_confirmado': return <Wallet className="h-5 w-5 text-emerald-400" />;
      case 'comentario':
      case 'resposta': return <MessageSquare className="h-5 w-5 text-amber-400" />;
      case 'suporte': return <HelpCircle className="h-5 w-5 text-blue-400" />;
      case 'post': return <Info className="h-5 w-5 text-primary" />;
      default: return <Bell className="h-5 w-5 text-zinc-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-black pb-20 pt-4">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white">Notificações</h1>
              <p className="text-xs font-medium text-zinc-500">Fique por dentro de tudo</p>
            </div>
          </div>
          
          {notifications.some(n => !n.lida) && (
            <button
              onClick={markAllAsRead}
              disabled={markingAllAsRead}
              className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-bold text-zinc-400 transition-all hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-50"
            >
              {markingAllAsRead ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              Ler todas
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-[2.5rem] border border-dashed border-white/10 bg-zinc-900/30 p-10 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800/50 text-zinc-600">
              <Bell className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Nenhuma notificação</h3>
            <p className="mt-2 text-sm text-zinc-500">Você está em dia com todas as novidades!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => markAsRead(notification)}
                  className={`group relative cursor-pointer overflow-hidden rounded-[2rem] border transition-all active:scale-[0.98] ${
                    notification.lida 
                      ? 'border-white/5 bg-zinc-900/30 grayscale-[0.5]' 
                      : 'border-primary/20 bg-zinc-900 shadow-[0_0_20px_rgba(0,255,0,0.05)]'
                  }`}
                >
                  {!notification.lida && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
                  )}
                  
                  <div className="flex items-start gap-4 p-5">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      notification.lida ? 'bg-zinc-800/50' : 'bg-primary/10'
                    }`}>
                      {getIcon(notification.tipo)}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-black tracking-tight ${
                          notification.lida ? 'text-zinc-400' : 'text-white'
                        }`}>
                          {notification.titulo}
                        </h3>
                        <span className="text-[10px] font-medium text-zinc-600">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={`text-xs leading-relaxed ${
                        notification.lida ? 'text-zinc-500' : 'text-zinc-400'
                      }`}>
                        {notification.mensagem}
                      </p>
                      
                      <div className="mt-3 flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary">
                          <ExternalLink className="h-3 w-3" />
                          VER DETALHES
                        </div>
                        <button
                          onClick={(e) => deleteNotification(e, notification.id)}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-600 transition-colors hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                          EXCLUIR
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
