import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export default function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('lida', false);

      if (!error) {
        setUnreadCount(count || 0);
      }
    };

    fetchUnreadCount();

    // Realtime subscription
    const channel = supabase
      .channel('notifications-changes')
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
            setUnreadCount((prev) => prev + 1);
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 1000);
          } else if (payload.eventType === 'UPDATE') {
            // Re-fetch count to be safe when multiple updates happen
            fetchUnreadCount();
          } else if (payload.eventType === 'DELETE') {
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) return null;

  return (
    <Link
      to="/notificacoes"
      className="relative flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/50 text-zinc-400 transition-all hover:bg-zinc-700 hover:text-white active:scale-90"
    >
      <motion.div
        animate={isAnimating ? { rotate: [0, -20, 20, -20, 20, 0] } : {}}
        transition={{ duration: 0.5 }}
      >
        <Bell className="h-5 w-5" />
      </motion.div>
      
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-lg shadow-red-500/40 ring-2 ring-black"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
