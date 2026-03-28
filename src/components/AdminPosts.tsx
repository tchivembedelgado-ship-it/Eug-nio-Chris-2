import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Share2, Send, Loader2, Trash2, User, Image as ImageIcon, Video, Reply } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface Post {
  id: string;
  conteudo: string;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
}

export interface AdminSettings {
  nome_exibicao: string;
  avatar_url: string;
}

export interface Comment {
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
  onDelete: (id: string) => void;
  onReply?: (id: string) => void;
  isReply?: boolean;
}

export const CommentItem: React.FC<CommentItemProps> = ({ 
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
};

interface PostCardProps {
  post: Post;
  currentUser: any;
  isAdmin?: boolean;
  adminSettings?: AdminSettings | null;
  showAdminHeader?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  currentUser, 
  isAdmin, 
  adminSettings,
  showAdminHeader = false
}) => {
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

      if (error) throw error;

      setComments([...comments, data]);
      setNewComment('');
      setCommentMedia(null);
      setReplyTo(null);
    } catch (error: any) {
      console.error('Error sending comment:', error);
      alert(`Erro ao enviar: ${error.message}`);
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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Publicação do Administrador',
          text: post.conteudo,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copiado para a área de transferência!');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="overflow-hidden rounded-[2.5rem] border border-white/5 bg-zinc-900/50"
    >
      <div className="p-6 sm:p-8">
        {/* Post Header */}
        {showAdminHeader && (
          <div className="mb-6 flex items-center gap-4">
            <div className="h-12 w-12 overflow-hidden rounded-full bg-zinc-800 border-2 border-primary/20">
              {adminSettings?.avatar_url ? (
                <img src={adminSettings.avatar_url} alt="ADM" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-6 w-6 text-zinc-600" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-white">{adminSettings?.nome_exibicao || 'Administrador'}</span>
                <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-500 border border-amber-500/30">
                  ADM
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                {new Date(post.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {post.conteudo && (
          <p className="mb-6 whitespace-pre-wrap text-lg text-zinc-200 leading-relaxed">{post.conteudo}</p>
        )}

        {post.media_url && (
          <div className="mb-6 overflow-hidden rounded-2xl bg-zinc-800 border border-white/5">
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
          
          <div className="flex items-center gap-4">
            {!showAdminHeader && (
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                {new Date(post.created_at).toLocaleDateString()}
              </span>
            )}
            <button 
              onClick={handleShare}
              className="text-zinc-600 hover:text-white transition-colors"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
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
                          isAdmin={!!isAdmin} 
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
                              isAdmin={!!isAdmin} 
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
};
