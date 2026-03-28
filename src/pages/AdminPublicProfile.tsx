import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Share2, Instagram, Facebook, Send, Loader2, Trash2, User, Image as ImageIcon, Video, Reply } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PostCard, Post, AdminSettings } from '../components/AdminPosts';

export default function AdminPublicProfile() {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      
      // Fetch Settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('adm_settings')
        .select('*')
        .limit(1)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      if (settingsData) setSettings(settingsData);

      // Fetch Posts
      const { data: postsData, error: postsError } = await supabase
        .from('adm_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 pt-16">
      {/* Header / Cover */}
      <div className="relative h-64 w-full overflow-hidden bg-zinc-900 sm:h-80">
        {settings?.capa_url ? (
          <img src={settings.capa_url} alt="Capa" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-800 to-zinc-900" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </div>

      {/* Profile Info */}
      <div className="mx-auto max-w-4xl px-4">
        <div className="relative -mt-16 flex flex-col items-center sm:-mt-20 sm:flex-row sm:items-end sm:gap-6">
          <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-black bg-zinc-800 sm:h-40 sm:w-40">
            {settings?.avatar_url ? (
              <img src={settings.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                <User className="h-12 w-12 text-zinc-600" />
              </div>
            )}
          </div>
          <div className="mt-4 flex-1 text-center sm:mt-0 sm:pb-4 sm:text-left">
            <h1 className="text-3xl font-black tracking-tighter text-white sm:text-4xl">
              {settings?.nome_exibicao || 'Administrador'}
            </h1>
            <p className="mt-1 text-zinc-400">{settings?.biografia || 'Bem-vindo ao meu perfil oficial.'}</p>
          </div>
          
          {/* Social Links */}
          <div className="mt-6 flex items-center gap-3 sm:mt-0 sm:pb-4">
            {settings?.whatsapp_link && (
              <a
                href={settings.whatsapp_link.startsWith('http') ? settings.whatsapp_link : `https://wa.me/${settings.whatsapp_link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white transition-transform hover:scale-110"
              >
                <MessageSquare className="h-5 w-5" />
              </a>
            )}
            {settings?.instagram_link && (
              <a
                href={settings.instagram_link.startsWith('http') ? settings.instagram_link : `https://instagram.com/${settings.instagram_link.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white transition-transform hover:scale-110"
              >
                <Instagram className="h-5 w-5" />
              </a>
            )}
            {settings?.facebook_link && (
              <a
                href={settings.facebook_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition-transform hover:scale-110"
              >
                <Facebook className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>

        {/* Feed */}
        <div className="mt-12 space-y-8">
          <h2 className="text-xl font-bold text-white">Publicações</h2>
          
          <div className="space-y-8">
            {posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                currentUser={user} 
                isAdmin={profile?.is_admin} 
                adminSettings={settings}
              />
            ))}

            {posts.length === 0 && (
              <div className="rounded-[2.5rem] border border-dashed border-white/10 py-20 text-center">
                <p className="text-zinc-500">Nenhuma publicação ainda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
