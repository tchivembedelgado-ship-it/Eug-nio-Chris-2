import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Share2, Instagram, Facebook, Send, Loader2, Trash2, User, Image as ImageIcon, Video, Reply } from 'lucide-react';
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
    avatar_url?: string;
    is_admin?: boolean;
  };
}

interface CommentItemProps {
  comment: Comment;
  isAdmin: boolean;
  currentUser: any;
  onDelete: (id: string) => void | Promise<void>;
  onReply?: (id: string) => void;
  isReply?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  isAdmin, 
  currentUser, 
  onDelete, 
  onReply,
  isReply = false 
}) => {
  const avatarUrl = comment.profiles?.avatar_url || comment.profiles?.bi_photo_url;

  return (
    <div className="group flex gap-3">
      <div className={`${isReply ? 'h-6 w-6' : 'h-8 w-8'} overflow-hidden rounded-full bg-zinc-800 flex-shrink-0`}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-800">
            <User className={`${isReply ? 'h-3 w-3' : 'h-4 w-4'} text-zinc-600`} />
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="rounded-2xl bg-zinc-800/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">{comment.profiles?.full_name || 'Usuário'}</span>
              {comment.profiles?.is_admin && (
                <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-500 border border-amber-500/30">
                  ADM
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">{new Date(comment.created_at).toLocaleDateString()}</span>
              {(isAdmin || currentUser?.id === comment.user_id) && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <p className="mt-1 text-sm text-zinc-300">{comment.comentario}</p>
          
          {comment.media_url && (
            <div className="mt-2 overflow-hidden rounded-lg bg-zinc-900">
              {comment.media_type === 'image' ? (
                <img src={comment.media_url} alt="Comentário" className="max-h-60 w-full object-contain" />
              ) : (
                <video src={comment.media_url} controls className="max-h-60 w-full" />
              )}
            </div>
          )}
        </div>
        
        {!isReply && onReply && (
          <button 
            onClick={() => onReply(comment.id)}
            className="ml-2 mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-primary"
          >
            <Reply className="h-3 w-3" />
            Responder
          </button>
        )}
      </div>
    </div>
  );
}

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
              <PostCard key={post.id} post={post} currentUser={user} isAdmin={profile?.is_admin} />
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

interface PostCardProps {
  post: Post;
  currentUser: any;
  isAdmin?: boolean;
  key?: string;
}

function PostCard({ post, currentUser, isAdmin }: PostCardProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentMedia, setCommentMedia] = useState<File | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments]);

  async function fetchComments() {
    try {
      setLoadingComments(true);
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles:user_id (
            full_name,
            bi_photo_url,
            avatar_url,
            is_admin
          )
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
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
    if (!currentUser || (!newComment.trim() && !commentMedia)) return;

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
          post_id: post.id,
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
            avatar_url,
            is_admin
          )
        `)
        .single();

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw error;
      }

      setComments([...comments, data]);
      setNewComment('');
      setCommentMedia(null);
      setReplyTo(null);
    } catch (error: any) {
      console.error('Error sending comment:', error);
      alert(`Erro ao enviar: ${error.message || 'Verifique sua conexão ou o banco de dados.'}`);
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteComment(id: string) {
    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setComments(comments.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-[2.5rem] border border-white/5 bg-zinc-900/50"
    >
      <div className="p-6 sm:p-8">
        {post.conteudo && (
          <p className="mb-6 whitespace-pre-wrap text-lg text-zinc-200">{post.conteudo}</p>
        )}

        {post.media_url && (
          <div className="mb-6 overflow-hidden rounded-2xl bg-zinc-800">
            {post.media_type === 'image' ? (
              <img src={post.media_url} alt="Post" className="w-full object-cover" />
            ) : (
              <video src={post.media_url} controls className="w-full" />
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/5 pt-6">
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-sm font-bold text-zinc-400 transition-colors hover:text-primary"
          >
            <MessageSquare className="h-5 w-5" />
            {comments.length > 0 ? `${comments.length} Comentários` : 'Comentar'}
          </button>
          
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">
            {new Date(post.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6 overflow-hidden"
            >
              <div className="space-y-4 border-t border-white/5 pt-6">
                {loadingComments ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {comments.filter(c => !c.parent_id).map((comment) => (
                      <div key={comment.id} className="space-y-4">
                        <CommentItem 
                          comment={comment} 
                          isAdmin={isAdmin} 
                          currentUser={currentUser} 
                          onDelete={handleDeleteComment}
                          onReply={(id) => {
                            setReplyTo(id);
                            const input = document.getElementById(`comment-input-${post.id}`);
                            input?.focus();
                          }}
                        />
                        
                        {/* Replies */}
                        <div className="ml-10 space-y-4 border-l-2 border-white/5 pl-4">
                          {comments.filter(c => c.parent_id === comment.id).map((reply) => (
                            <CommentItem 
                              key={reply.id}
                              comment={reply} 
                              isAdmin={isAdmin} 
                              currentUser={currentUser} 
                              onDelete={handleDeleteComment}
                              isReply
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {currentUser ? (
                  <form onSubmit={handleSendComment} className="mt-6 space-y-3">
                    {replyTo && (
                      <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                        <span>Respondendo a um comentário...</span>
                        <button onClick={() => setReplyTo(null)} className="font-bold uppercase">Cancelar</button>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <input
                          id={`comment-input-${post.id}`}
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder={replyTo ? "Escreva sua resposta..." : "Escreva um comentário..."}
                          className="w-full rounded-xl border border-white/5 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
                        />
                        
                        {commentMedia && (
                          <div className="relative inline-block overflow-hidden rounded-lg border border-white/10 bg-zinc-800 p-1">
                            {commentMedia.type.startsWith('image') ? (
                              <img src={URL.createObjectURL(commentMedia)} className="h-20 w-20 object-cover" />
                            ) : (
                              <div className="flex h-20 w-20 items-center justify-center bg-zinc-700">
                                <Video className="h-6 w-6 text-white" />
                              </div>
                            )}
                            <button 
                              onClick={() => setCommentMedia(null)}
                              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white">
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*,video/*"
                            onChange={(e) => e.target.files?.[0] && setCommentMedia(e.target.files[0])}
                          />
                          <ImageIcon className="h-4 w-4" />
                        </label>
                        <button
                          type="submit"
                          disabled={sending || (!newComment.trim() && !commentMedia)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <p className="text-center text-xs text-zinc-600">
                    Faça login para comentar nesta publicação.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
