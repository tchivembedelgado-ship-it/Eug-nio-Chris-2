import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Camera, Image as ImageIcon, Video, Save, Plus, Trash2, Loader2, Globe, MessageSquare, Send, User, Reply } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminSettings {
  id: string;
  nome_exibicao: string;
  biografia: string;
  avatar_url: string;
  capa_url: string;
  whatsapp_link: string;
  instagram_link: string;
  facebook_link: string;
}

interface Post {
  id: string;
  conteudo: string;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
}

interface Comment {
  id: string;
  comentario: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  parent_id?: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    bi_photo_url: string;
    is_admin?: boolean;
  };
}

function CommentSection({ postId, currentUser }: { postId: string; currentUser: any }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [show, setShow] = useState(false);
  const [commentMedia, setCommentMedia] = useState<File | null>(null);

  useEffect(() => {
    if (show) fetchComments();
  }, [show]);

  async function fetchComments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles:user_id (
            full_name,
            bi_photo_url,
            is_admin
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(file: File) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `comments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('adm-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('adm-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading comment media:', error);
      return null;
    }
  }

  async function handleSendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() && !commentMedia) return;

    try {
      setSending(true);
      let mediaUrl = null;
      let mediaType = null;

      if (commentMedia) {
        mediaUrl = await handleFileUpload(commentMedia);
        mediaType = commentMedia.type.startsWith('video') ? 'video' : 'image';
      }

      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          comentario: newComment,
          parent_id: replyTo,
          media_url: mediaUrl,
          media_type: mediaType
        })
        .select(`
          *,
          profiles:user_id (
            full_name,
            bi_photo_url,
            is_admin
          )
        `)
        .single();

      if (error) throw error;
      setComments([...comments, data]);
      setNewComment('');
      setReplyTo(null);
      setCommentMedia(null);
    } catch (error: any) {
      console.error('Error sending comment:', error);
      alert('Erro ao enviar comentário: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteComment(id: string) {
    if (!confirm('Apagar comentário?')) return;
    try {
      const { error } = await supabase.from('post_comments').delete().eq('id', id);
      if (error) throw error;
      setComments(comments.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Erro ao apagar comentário.');
    }
  }

  if (!show) {
    return (
      <button 
        onClick={() => setShow(true)}
        className="mt-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-primary"
      >
        <MessageSquare className="h-3 w-3" />
        Ver Comentários
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-4 border-t border-white/5 pt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Comentários</h4>
        <button onClick={() => setShow(false)} className="text-[10px] font-bold uppercase text-zinc-600 hover:text-white">Fechar</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
          {comments.filter(c => !c.parent_id).map(comment => (
            <div key={comment.id} className="space-y-2">
              <div className="flex gap-2">
                <div className="h-6 w-6 overflow-hidden rounded-full bg-zinc-800">
                  {comment.profiles?.bi_photo_url ? (
                    <img src={comment.profiles.bi_photo_url} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                      <User className="h-3 w-3 text-zinc-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 rounded-xl bg-zinc-800/50 p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-white">{comment.profiles?.full_name}</span>
                    {comment.profiles?.is_admin && (
                      <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[7px] font-black text-amber-500 border border-amber-500/30">ADM</span>
                    )}
                    <button onClick={() => handleDeleteComment(comment.id)} className="ml-auto text-zinc-600 hover:text-red-500">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400">{comment.comentario}</p>
                  
                  {comment.media_url && (
                    <div className="mt-1 overflow-hidden rounded bg-zinc-900">
                      {comment.media_type === 'image' ? (
                        <img src={comment.media_url} alt="Media" className="max-h-32 w-full object-contain" />
                      ) : (
                        <video src={comment.media_url} controls className="max-h-32 w-full" />
                      )}
                    </div>
                  )}

                  <button onClick={() => setReplyTo(comment.id)} className="mt-1 flex items-center gap-1 text-[8px] font-bold uppercase text-zinc-600 hover:text-primary">
                    <Reply className="h-2 w-2" /> Responder
                  </button>
                </div>
              </div>

              {/* Replies */}
              <div className="ml-6 space-y-2 border-l border-white/5 pl-2">
                {comments.filter(c => c.parent_id === comment.id).map(reply => (
                  <div key={reply.id} className="flex gap-2">
                    <div className="h-5 w-5 overflow-hidden rounded-full bg-zinc-800">
                      {reply.profiles?.bi_photo_url ? (
                        <img src={reply.profiles.bi_photo_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                          <User className="h-2 w-2 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 rounded-xl bg-zinc-800/50 p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white">{reply.profiles?.full_name}</span>
                        {reply.profiles?.is_admin && (
                          <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[7px] font-black text-amber-500 border border-amber-500/30">ADM</span>
                        )}
                        <button onClick={() => handleDeleteComment(reply.id)} className="ml-auto text-zinc-600 hover:text-red-500">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-400">{reply.comentario}</p>
                      {reply.media_url && (
                        <div className="mt-1 overflow-hidden rounded bg-zinc-900">
                          {reply.media_type === 'image' ? (
                            <img src={reply.media_url} alt="Media" className="max-h-32 w-full object-contain" />
                          ) : (
                            <video src={reply.media_url} controls className="max-h-32 w-full" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSendComment} className="mt-2 space-y-2">
        {replyTo && (
          <div className="flex items-center justify-between rounded bg-primary/10 px-2 py-1 text-[8px] text-primary uppercase font-bold">
            <span>Respondendo...</span>
            <button onClick={() => setReplyTo(null)}>Cancelar</button>
          </div>
        )}
        
        {commentMedia && (
          <div className="relative inline-block">
            <div className="h-12 w-12 overflow-hidden rounded bg-zinc-800">
              {commentMedia.type.startsWith('image') ? (
                <img src={URL.createObjectURL(commentMedia)} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center"><Video className="h-4 w-4 text-zinc-500" /></div>
              )}
            </div>
            <button 
              type="button"
              onClick={() => setCommentMedia(null)}
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-zinc-800 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-white">
            <input 
              type="file" 
              accept="image/*,video/*" 
              className="hidden" 
              onChange={(e) => e.target.files?.[0] && setCommentMedia(e.target.files[0])}
            />
            <ImageIcon className="h-4 w-4" />
          </label>
          <input 
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escreva..."
            className="flex-1 rounded-lg border border-white/5 bg-zinc-800 px-3 py-2 text-xs text-white focus:outline-none"
          />
          <button 
            type="submit"
            disabled={sending || (!newComment.trim() && !commentMedia)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-black disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminProfileConfig() {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  // New Post State
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostMedia, setNewPostMedia] = useState<File | null>(null);
  const [newPostMediaType, setNewPostMediaType] = useState<'image' | 'video'>('image');
  const [publishing, setPublishing] = useState(false);

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

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('adm_settings')
        .upsert({
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(file: File, type: 'avatar' | 'capa' | 'post') {
    try {
      setUploading(type);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${type}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('adm-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('adm-assets')
        .getPublicUrl(filePath);

      if (type === 'avatar') {
        setSettings(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      } else if (type === 'capa') {
        setSettings(prev => prev ? { ...prev, capa_url: publicUrl } : null);
      }

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Erro ao carregar arquivo.');
      return null;
    } finally {
      setUploading(null);
    }
  }

  async function handlePublishPost() {
    if (!newPostContent.trim() && !newPostMedia) return;

    try {
      setPublishing(true);
      let mediaUrl = '';

      if (newPostMedia) {
        const uploadedUrl = await handleFileUpload(newPostMedia, 'post');
        if (uploadedUrl) mediaUrl = uploadedUrl;
      }

      const { data, error } = await supabase
        .from('adm_posts')
        .insert({
          conteudo: newPostContent,
          media_url: mediaUrl,
          media_type: newPostMediaType
        })
        .select()
        .single();

      if (error) throw error;

      setPosts([data, ...posts]);
      setNewPostContent('');
      setNewPostMedia(null);
      alert('Post publicado com sucesso!');
    } catch (error) {
      console.error('Error publishing post:', error);
      alert('Erro ao publicar post.');
    } finally {
      setPublishing(false);
    }
  }

  async function handleDeletePost(id: string) {
    try {
      const { error } = await supabase
        .from('adm_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPosts(posts.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Erro ao apagar post.');
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
    <div className="min-h-screen bg-black pb-20 pt-24">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white">Configuração do Perfil</h1>
            <p className="text-zinc-500">Personalize como os usuários veem o administrador.</p>
          </div>
          <button
            onClick={() => window.open('/sobre-adm', '_blank')}
            className="flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-zinc-700"
          >
            <Globe className="h-4 w-4" />
            Ver Página Pública
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Settings Form */}
          <div className="lg:col-span-2 space-y-8">
            <section className="rounded-[2.5rem] border border-white/5 bg-zinc-900/50 p-8">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-white">
                <Camera className="h-5 w-5 text-primary" />
                Identidade Visual
              </h2>

              <div className="space-y-6">
                {/* Cover Upload */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-400">Foto de Capa</label>
                  <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-zinc-800">
                    {settings?.capa_url && (
                      <img src={settings.capa_url} alt="Capa" className="h-full w-full object-cover" />
                    )}
                    <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'capa')}
                      />
                      <div className="flex flex-col items-center gap-2 text-white">
                        {uploading === 'capa' ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-6 w-6" />}
                        <span className="text-xs font-bold uppercase tracking-wider">Alterar Capa</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Avatar Upload */}
                <div className="flex items-end gap-6">
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-zinc-900 bg-zinc-800">
                    {settings?.avatar_url && (
                      <img src={settings.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                    )}
                    <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'avatar')}
                      />
                      {uploading === 'avatar' ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
                    </label>
                  </div>
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-medium text-zinc-400">Nome de Exibição</label>
                    <input
                      type="text"
                      value={settings?.nome_exibicao || ''}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, nome_exibicao: e.target.value } : null)}
                      className="w-full rounded-xl border border-white/5 bg-zinc-800 px-4 py-3 text-white focus:border-primary focus:outline-none"
                      placeholder="Ex: Fábio Revoada"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-400">Biografia</label>
                  <textarea
                    value={settings?.biografia || ''}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, biografia: e.target.value } : null)}
                    className="h-32 w-full resize-none rounded-xl border border-white/5 bg-zinc-800 px-4 py-3 text-white focus:border-primary focus:outline-none"
                    placeholder="Conte um pouco sobre você..."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-400">WhatsApp</label>
                    <input
                      type="text"
                      value={settings?.whatsapp_link || ''}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, whatsapp_link: e.target.value } : null)}
                      className="w-full rounded-xl border border-white/5 bg-zinc-800 px-4 py-3 text-white focus:border-primary focus:outline-none"
                      placeholder="Link ou Número"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-400">Instagram</label>
                    <input
                      type="text"
                      value={settings?.instagram_link || ''}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, instagram_link: e.target.value } : null)}
                      className="w-full rounded-xl border border-white/5 bg-zinc-800 px-4 py-3 text-white focus:border-primary focus:outline-none"
                      placeholder="@usuario"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-400">Facebook</label>
                    <input
                      type="text"
                      value={settings?.facebook_link || ''}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, facebook_link: e.target.value } : null)}
                      className="w-full rounded-xl border border-white/5 bg-zinc-800 px-4 py-3 text-white focus:border-primary focus:outline-none"
                      placeholder="Link do Perfil"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 font-black uppercase tracking-tighter text-black transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  Salvar Configurações
                </button>
              </div>
            </section>

            {/* New Post Section */}
            <section className="rounded-[2.5rem] border border-white/5 bg-zinc-900/50 p-8">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-white">
                <Plus className="h-5 w-5 text-primary" />
                Novo Post
              </h2>

              <div className="space-y-4">
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="h-32 w-full resize-none rounded-xl border border-white/5 bg-zinc-800 px-4 py-3 text-white focus:border-primary focus:outline-none"
                  placeholder="O que você quer compartilhar hoje?"
                />

                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2 text-sm font-bold text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setNewPostMedia(file);
                          setNewPostMediaType(file.type.startsWith('video') ? 'video' : 'image');
                        }
                      }}
                    />
                    <ImageIcon className="h-4 w-4" />
                    {newPostMedia ? 'Mídia Selecionada' : 'Adicionar Mídia'}
                  </label>

                  {newPostMedia && (
                    <button
                      onClick={() => setNewPostMedia(null)}
                      className="text-xs font-bold text-red-500 uppercase hover:underline"
                    >
                      Remover
                    </button>
                  )}
                </div>

                <button
                  onClick={handlePublishPost}
                  disabled={publishing || (!newPostContent.trim() && !newPostMedia)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-4 font-black uppercase tracking-tighter text-black transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {publishing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  Publicar Post
                </button>
              </div>
            </section>
          </div>

          {/* Right Column: Feed Preview */}
          <div className="space-y-6">
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <MessageSquare className="h-5 w-5 text-primary" />
              Seus Posts
            </h2>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {posts.map((post) => (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50 p-4"
                  >
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="absolute right-2 top-2 rounded-lg bg-red-500/10 p-2 text-red-500 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    {post.media_url && (
                      <div className="mb-3 overflow-hidden rounded-xl bg-zinc-800">
                        {post.media_type === 'image' ? (
                          <img src={post.media_url} alt="Post" className="w-full object-cover" />
                        ) : (
                          <video src={post.media_url} controls className="w-full" />
                        )}
                      </div>
                    )}
                    <p className="text-sm text-zinc-300 line-clamp-3">{post.conteudo}</p>
                    <span className="mt-2 block text-[10px] uppercase tracking-wider text-zinc-600">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>

                    <CommentSection postId={post.id} currentUser={profile || user} />
                  </motion.div>
                ))}
              </AnimatePresence>

              {posts.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
                  <p className="text-sm text-zinc-500">Nenhum post publicado ainda.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
