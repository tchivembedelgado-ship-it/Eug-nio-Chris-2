import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Send, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  Gift, 
  X, 
  CheckCircle2, 
  Loader2,
  Play,
  Pause,
  Download,
  MoreVertical,
  Edit2,
  Trash2,
  Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import confetti from 'canvas-confetti';

interface Message {
  id: string;
  user_id: string;
  sender_id: string;
  content: string;
  media_url: string;
  media_type: 'text' | 'image' | 'video' | 'audio' | 'gift';
  gift_data: {
    type: 'cash' | 'physical';
    value: number;
    description: string;
    status: 'pending' | 'claimed';
  } | null;
  is_edited?: boolean;
  deleted_for_everyone?: boolean;
  deleted_by?: string[];
  created_at: string;
}

interface ChatWindowProps {
  chatUserId: string; // The user ID of the chat (for admin, it's the user they are talking to; for user, it's their own ID)
  isAdmin?: boolean;
  userName?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chatUserId, isAdmin = false, userName }) => {
  const { user, refreshProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [showOptionsId, setShowOptionsId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deductForm, setDeductForm] = useState({
    amount: 0,
    reason: 'Tentativa de fraude'
  });
  const [giftForm, setGiftForm] = useState({
    type: 'cash' as 'cash' | 'physical',
    value: 0,
    description: ''
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchMessages();
    const subscription = supabase
      .channel(`chat_${chatUserId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `user_id=eq.${chatUserId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `user_id=eq.${chatUserId}`
      }, (payload) => {
        setMessages(prev => prev.map(msg => msg.id === payload.new.id ? payload.new as Message : msg));
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [chatUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', chatUserId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() && !uploading) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: chatUserId,
          sender_id: user?.id,
          content: newMessage,
          media_type: 'text'
        });

      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `chat/${chatUserId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: chatUserId,
          sender_id: user?.id,
          media_url: publicUrl,
          media_type: type,
          content: ''
        });

      if (msgError) throw msgError;
    } catch (err) {
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSendGift = async () => {
    if (!giftForm.description || (giftForm.type === 'cash' && giftForm.value <= 0)) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: chatUserId,
          sender_id: user?.id,
          media_type: 'gift',
          gift_data: {
            ...giftForm,
            status: 'pending'
          },
          content: `Presente enviado: ${giftForm.description}`
        });

      if (error) throw error;
      setShowGiftModal(false);
      setGiftForm({ type: 'cash', value: 0, description: '' });
    } catch (err) {
      console.error('Error sending gift:', err);
    }
  };

  const handleClaimGift = async (messageId: string, giftDescription: string) => {
    try {
      const { data, error } = await supabase.rpc('claim_chat_gift', {
        p_message_id: messageId
      });

      if (error) throw error;
      
      const result = data as { success: boolean, message: string, new_balance?: number };
      if (result.success) {
        console.log('Chat: Presente resgatado com sucesso. Novo saldo:', result.new_balance);
        // Success animation
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f97316', '#fbbf24', '#ffffff']
        });
        
        // Pequeno delay para garantir que a transação no banco foi concluída
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh profile to update balance in UI
        console.log('Chat: Atualizando perfil após resgate...');
        await refreshProfile();
        
        alert(`🎊 PARABÉNS! 🎊\nVocê resgatou: ${giftDescription}`);
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error('Error claiming gift:', err);
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('O seu navegador não suporta gravação de áudio ou o acesso foi bloqueado.');
        return;
      }

      console.log('Solicitando permissão de microfone...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Permissão concedida, iniciando MediaRecorder...');
      
      // Check supported mime types
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        mimeType = 'audio/aac';
      }
      
      console.log('MimeType selecionado:', mimeType);

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        console.log('Gravação parada, preparando upload...');
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size > 0) {
          await uploadAudio(blob);
        } else {
          console.warn('Blob de áudio vazio');
        }
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.onerror = (event) => {
        console.error('Erro no MediaRecorder:', event);
        alert('Erro na gravação: ' + (event as any).error?.name || 'Erro desconhecido');
      };

      recorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error starting recording:', err);
      alert('Não foi possível acessar o microfone: ' + (err.message || err.name || 'Erro desconhecido'));
    }
  };

  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null; // Prevent upload
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      audioChunksRef.current = [];
    }
  };

  const uploadAudio = async (blob: Blob) => {
    setUploading(true);
    try {
      let extension = 'webm';
      if (blob.type.includes('webm')) extension = 'webm';
      else if (blob.type.includes('ogg')) extension = 'ogg';
      else if (blob.type.includes('mp4')) extension = 'm4a';
      else if (blob.type.includes('aac')) extension = 'aac';
      
      const fileName = `${Math.random()}.${extension}`;
      const filePath = `chat/${chatUserId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: chatUserId,
          sender_id: user?.id,
          media_url: publicUrl,
          media_type: 'audio',
          content: ''
        });

      if (msgError) throw msgError;
    } catch (err) {
      console.error('Error uploading audio:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeductBalance = async () => {
    if (deductForm.amount <= 0) return;

    try {
      const { data, error } = await supabase.rpc('deduct_balance', {
        p_user_id: chatUserId,
        p_amount: deductForm.amount,
        p_reason: deductForm.reason
      });

      if (error) throw error;

      const result = data as { success: boolean, message: string };
      if (result.success) {
        setShowDeductModal(false);
        setDeductForm({ amount: 0, reason: 'Tentativa de fraude' });
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error('Error deducting balance:', err);
    }
  };

  const handleDeleteForMe = async (messageId: string) => {
    try {
      const { error } = await supabase.rpc('delete_message_for_me', {
        p_message_id: messageId
      });
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setShowOptionsId(null);
    } catch (err) {
      console.error('Error deleting for me:', err);
      alert('Erro ao apagar mensagem para mim. Verifique sua conexão.');
    }
  };

  const handleDeleteForEveryone = async (messageId: string, createdAt: string) => {
    const sentTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diffHours = (now - sentTime) / (1000 * 60 * 60);

    if (diffHours > 1 && !isAdmin) {
      alert('Você só pode apagar mensagens para todos dentro de 1 hora após o envio.');
      return;
    }

    if (!confirm('Apagar esta mensagem para todos?')) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ 
          deleted_for_everyone: true,
          content: '🚫 Esta mensagem foi apagada',
          media_url: null,
          media_type: 'text'
        })
        .eq('id', messageId);
      if (error) throw error;
      setShowOptionsId(null);
    } catch (err) {
      console.error('Error deleting for everyone:', err);
      alert('Erro ao apagar para todos. Pode ser um problema de permissão ou tempo expirado.');
    }
  };

  const handleEditMessage = async (messageId: string, createdAt: string) => {
    if (!editContent.trim()) return;

    const sentTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diffHours = (now - sentTime) / (1000 * 60 * 60);

    if (diffHours > 1 && !isAdmin) {
      alert('Você só pode editar mensagens dentro de 1 hora após o envio.');
      setEditingMessageId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ 
          content: editContent,
          is_edited: true
        })
        .eq('id', messageId);
      if (error) throw error;
      setEditingMessageId(null);
      setEditContent('');
      setShowOptionsId(null);
    } catch (err) {
      console.error('Error editing message:', err);
      alert('Erro ao salvar edição. Verifique se o prazo de 1 hora não expirou.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] sm:h-[650px] max-h-[85vh] rounded-2xl bg-zinc-900/50 border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-bottom border-white/5 bg-zinc-900 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
            <span className="text-orange-500 font-bold">
              {isAdmin ? 'U' : 'A'}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-white">
              {isAdmin ? (userName || 'Conversa com Usuário') : 'Suporte Oficial'}
            </h3>
            <p className="text-xs text-zinc-400">Online</p>
          </div>
        </div>

        {isAdmin && (
          <button 
            onClick={() => setShowDeductModal(true)}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded-lg transition-colors border border-red-500/20"
          >
            Remover Saldo
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10"
      >
        {messages.map((msg) => {
          const isOwn = msg.sender_id === user?.id;
          const isDeleted = msg.deleted_for_everyone;
          
          return (
            <div 
              key={msg.id}
              className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
            >
              <div 
                onClick={() => {
                  if (!isDeleted && (isOwn || isAdmin)) {
                    setShowOptionsId(showOptionsId === msg.id ? null : msg.id);
                  }
                }}
                className={`group relative max-w-[85%] rounded-2xl p-3 cursor-pointer transition-all active:scale-[0.98] ${
                isOwn 
                  ? 'bg-orange-500 text-white rounded-tr-none' 
                  : 'bg-zinc-800 text-zinc-100 rounded-tl-none'
              } ${isDeleted ? 'opacity-50 italic' : ''}`}
              >
                
                {/* Message Options Trigger (Always visible on mobile/touch) */}
                {!isDeleted && (isOwn || isAdmin) && (
                  <div className="absolute top-1 right-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOptionsId(showOptionsId === msg.id ? null : msg.id);
                      }}
                      className="p-1 text-white/40 hover:text-white"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {showOptionsId === msg.id && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute z-20 top-full mt-1 ${isOwn ? 'right-0' : 'left-0'} w-40 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden`}
                  >
                    {isOwn && msg.media_type === 'text' && (
                      (() => {
                        const sentTime = new Date(msg.created_at).getTime();
                        const now = new Date().getTime();
                        const diffHours = (now - sentTime) / (1000 * 60 * 60);
                        
                        if (diffHours <= 1 || isAdmin) {
                          return (
                            <button 
                              onClick={() => {
                                setEditingMessageId(msg.id);
                                setEditContent(msg.content);
                                setShowOptionsId(null);
                              }}
                              className="w-full px-3 py-2 text-left text-xs hover:bg-white/5 flex items-center gap-2"
                            >
                              <Edit2 className="h-3 w-3" /> Editar
                            </button>
                          );
                        }
                        return null;
                      })()
                    )}
                    <button 
                      onClick={() => handleDeleteForMe(msg.id)}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-white/5 flex items-center gap-2"
                    >
                      <Trash className="h-3 w-3" /> Apagar para mim
                    </button>
                    {(isOwn || isAdmin) && (
                      <button 
                        onClick={() => handleDeleteForEveryone(msg.id, msg.created_at)}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-red-500/10 text-red-500 flex items-center gap-2"
                      >
                        <Trash2 className="h-3 w-3" /> Apagar para todos
                      </button>
                    )}
                  </div>
                )}

                {editingMessageId === msg.id ? (
                  <div className="flex flex-col gap-2 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
                    <textarea 
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-black/20 border-none rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-white/30 outline-none resize-none"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingMessageId(null)} className="text-[10px] uppercase font-bold opacity-70">Cancelar</button>
                      <button onClick={() => handleEditMessage(msg.id, msg.created_at)} className="text-[10px] uppercase font-bold">Salvar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {msg.media_type === 'text' && (
                      <p className="text-sm">{msg.content}</p>
                    )}

                    {msg.media_type === 'image' && (
                      <img 
                        src={msg.media_url} 
                        alt="Chat" 
                        className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(msg.media_url, '_blank')}
                      />
                    )}

                    {msg.media_type === 'video' && (
                      <video 
                        src={msg.media_url} 
                        controls 
                        className="rounded-lg max-w-full"
                      />
                    )}

                    {msg.media_type === 'audio' && (
                      <audio 
                        src={msg.media_url} 
                        controls 
                        className="max-w-full"
                      />
                    )}

                    {msg.media_type === 'gift' && msg.gift_data && (
                      <div className="flex flex-col gap-3 p-2 bg-white/10 rounded-xl border border-white/20">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                            <Gift className="h-6 w-6 text-yellow-500" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">Presente Especial!</p>
                            <p className="text-xs opacity-80">{msg.gift_data.description}</p>
                          </div>
                        </div>
                        
                        {msg.gift_data.status === 'pending' ? (
                          !isOwn ? (
                            <button 
                              onClick={() => handleClaimGift(msg.id, msg.gift_data!.description)}
                              className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg transition-colors text-sm"
                            >
                              Abrir Presente
                            </button>
                          ) : (
                            <div className="text-center py-2 bg-white/5 rounded-lg text-xs italic">
                              Aguardando resgate...
                            </div>
                          )
                        ) : (
                          <div className="flex items-center justify-center gap-2 py-2 bg-green-500/20 text-green-500 rounded-lg text-xs font-bold">
                            <CheckCircle2 className="h-4 w-4" />
                            RESGATADO
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className={`mt-1 flex items-center gap-1 text-[10px] opacity-50 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  {msg.is_edited && <span>(editada)</span>}
                  {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="p-2 sm:p-4 bg-zinc-900/80 border-t border-white/5 pb-safe">
        <form onSubmit={handleSendMessage} className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 sm:p-3 text-zinc-400 hover:text-white transition-colors"
              title="Enviar Imagem"
            >
              <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isRecording) cancelRecording();
                else startRecording();
              }}
              className={`p-2 sm:p-3 transition-colors ${isRecording ? 'text-red-500' : 'text-zinc-400 hover:text-white'}`}
              title={isRecording ? "Cancelar gravação" : "Gravar áudio"}
            >
              {isRecording ? <X className="h-5 w-5 sm:h-6 sm:w-6 pointer-events-none" /> : <Mic className="h-5 w-5 sm:h-6 sm:w-6 pointer-events-none" />}
            </button>

            {isAdmin && (
              <button 
                type="button"
                onClick={() => setShowGiftModal(true)}
                className="p-2 sm:p-3 text-yellow-500 hover:text-yellow-400 transition-colors"
                title="Enviar Presente"
              >
                <Gift className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}
          </div>

          <input 
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,video/*,audio/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.type.startsWith('image/')) handleFileUpload(e, 'image');
              else if (file.type.startsWith('video/')) handleFileUpload(e, 'video');
              else if (file.type.startsWith('audio/')) handleFileUpload(e, 'audio');
            }}
          />

          <input 
            type="text"
            value={isRecording ? `Gravando... ${recordingTime}s` : newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isRecording}
            placeholder={isRecording ? "Enviar áudio" : "Mensagem..."}
            className="flex-1 bg-zinc-800 border-none rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-white focus:ring-1 focus:ring-orange-500 outline-none disabled:opacity-50 min-w-0"
          />

          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isRecording) stopAndSendRecording();
              else handleSendMessage();
            }}
            disabled={(!isRecording && !newMessage.trim()) || uploading}
            className="p-2 sm:p-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-white rounded-xl sm:rounded-2xl transition-colors shrink-0"
          >
            {uploading ? <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" /> : <Send className={`h-5 w-5 sm:h-6 sm:w-6 pointer-events-none ${isRecording ? 'animate-pulse' : ''}`} />}
          </button>
        </form>
      </div>

      {/* Gift Modal (Admin Only) */}
      <AnimatePresence>
        {showGiftModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-zinc-900 rounded-3xl border border-white/10 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Gift className="text-yellow-500" />
                  Enviar Presente
                </h3>
                <button onClick={() => setShowGiftModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Tipo de Presente</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setGiftForm(prev => ({ ...prev, type: 'cash' }))}
                      className={`py-2 rounded-xl border transition-all ${
                        giftForm.type === 'cash' 
                          ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' 
                          : 'bg-zinc-800 border-white/5 text-zinc-400'
                      }`}
                    >
                      Dinheiro
                    </button>
                    <button 
                      onClick={() => setGiftForm(prev => ({ ...prev, type: 'physical' }))}
                      className={`py-2 rounded-xl border transition-all ${
                        giftForm.type === 'physical' 
                          ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' 
                          : 'bg-zinc-800 border-white/5 text-zinc-400'
                      }`}
                    >
                      Material
                    </button>
                  </div>
                </div>

                {giftForm.type === 'cash' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Valor (Kz)</label>
                    <input 
                      type="number"
                      value={giftForm.value}
                      onChange={(e) => setGiftForm(prev => ({ ...prev, value: Number(e.target.value) }))}
                      className="w-full bg-zinc-800 border-white/5 rounded-xl px-4 py-2 text-white outline-none focus:ring-1 focus:ring-yellow-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Descrição</label>
                  <textarea 
                    value={giftForm.description}
                    onChange={(e) => setGiftForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Ex: Bónus de fidelidade ou iPhone 15 Pro Max"
                    className="w-full bg-zinc-800 border-white/5 rounded-xl px-4 py-2 text-white outline-none focus:ring-1 focus:ring-yellow-500 h-24 resize-none"
                  />
                </div>

                <button 
                  onClick={handleSendGift}
                  className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl transition-all shadow-lg shadow-yellow-500/20"
                >
                  Confirmar Envio
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Deduct Balance Modal (Admin Only) */}
      <AnimatePresence>
        {showDeductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-zinc-900 rounded-3xl border border-white/10 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <X className="text-red-500" />
                  Remover Saldo
                </h3>
                <button onClick={() => setShowDeductModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                  <p className="text-xs text-red-500 leading-relaxed">
                    Atenção: Esta ação irá subtrair o valor do saldo do usuário e registrar uma mensagem de fraude no chat.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Valor a Remover (Kz)</label>
                  <input 
                    type="number"
                    value={deductForm.amount}
                    onChange={(e) => setDeductForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="w-full bg-zinc-800 border-white/5 rounded-xl px-4 py-2 text-white outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Motivo</label>
                  <textarea 
                    value={deductForm.reason}
                    onChange={(e) => setDeductForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full bg-zinc-800 border-white/5 rounded-xl px-4 py-2 text-white outline-none focus:ring-1 focus:ring-red-500 h-24 resize-none"
                  />
                </div>

                <button 
                  onClick={handleDeductBalance}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20"
                >
                  Confirmar Dedução
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
