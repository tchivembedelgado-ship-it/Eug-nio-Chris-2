import React, { useState, useRef } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { User, Mail, Phone, MapPin, CreditCard, ShieldCheck, Save, Loader2, Camera, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import BackButton from '@/src/components/BackButton';

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    nif: profile?.nif || '',
    bank_details: profile?.bank_details || '',
    bi_photo_url: profile?.bi_photo_url || '',
    avatar_url: profile?.avatar_url || '',
  });

  const isProfileComplete = 
    formData.full_name && 
    formData.phone && 
    formData.address && 
    formData.nif && 
    formData.bank_details && 
    formData.bi_photo_url;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'bi' | 'avatar') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setMessage(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const bucket = 'bi-photos';
      const filePath = `${type === 'bi' ? 'bi-photos' : 'avatars'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (type === 'bi') {
        setFormData(prev => ({ ...prev, bi_photo_url: publicUrl }));
        setMessage({ type: 'success', text: 'Foto do BI carregada com sucesso!' });
      } else {
        setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
        setMessage({ type: 'success', text: 'Foto de perfil carregada com sucesso!' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Erro ao carregar foto: ' + err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!isProfileComplete) {
      setMessage({ type: 'error', text: 'Por favor, preencha todos os campos obrigatórios, incluindo a foto do BI.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          address: formData.address,
          nif: formData.nif,
          bank_details: formData.bank_details,
          bi_photo_url: formData.bi_photo_url,
          avatar_url: formData.avatar_url,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <BackButton />
      
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black tracking-tighter sm:text-6xl">O Meu Perfil</h1>
        <p className="mt-4 text-zinc-500">Mantenha as suas informações atualizadas para uma experiência profissional.</p>
        
        {!isProfileComplete && !profile?.is_admin && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-500 border border-amber-500/20"
          >
            <AlertCircle className="h-4 w-4" />
            Perfil Incompleto: Preencha todos os dados para operar na plataforma.
          </motion.div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-zinc-900/50 shadow-2xl backdrop-blur-sm"
      >
        <form onSubmit={handleSubmit} className="p-8 sm:p-12">
          {/* Avatar Section */}
          <div className="mb-12 flex flex-col items-center justify-center space-y-4">
            <div className="relative group">
              <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-emerald-500/30 bg-zinc-800 shadow-xl transition-transform group-hover:scale-105">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                    <User className="h-12 w-12 text-zinc-600" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-all hover:bg-emerald-500 hover:scale-110 active:scale-95"
              >
                <Camera className="h-5 w-5" />
              </button>
              <input
                type="file"
                ref={avatarInputRef}
                onChange={(e) => handleFileUpload(e, 'avatar')}
                accept="image/*"
                className="hidden"
              />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Foto de Perfil</h3>
              <p className="text-xs text-zinc-500">Esta foto será visível nos seus comentários.</p>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Personal Info */}
            <div className="space-y-6">
              <h3 className="flex items-center gap-2 text-xl font-bold text-white">
                <User className="h-5 w-5 text-emerald-500" />
                Informações Pessoais
              </h3>
              
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full rounded-2xl border border-white/5 bg-black/20 p-4 pl-12 text-zinc-500 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">Nome Completo *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Seu nome completo"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 pl-12 text-white outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">Telefone *</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+244 9XX XXX XXX"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 pl-12 text-white outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">NIF *</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={formData.nif}
                    onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                    placeholder="Número de Identificação Fiscal"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 pl-12 text-white outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Address & Bank */}
            <div className="space-y-6">
              <h3 className="flex items-center gap-2 text-xl font-bold text-white">
                <CreditCard className="h-5 w-5 text-emerald-500" />
                Dados de Pagamento & Morada
              </h3>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">Morada *</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 h-5 w-5 text-zinc-500" />
                  <textarea
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Sua morada completa"
                    rows={3}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 pl-12 text-white outline-none focus:border-emerald-500 transition-colors resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">Coordenadas Bancárias (IBAN) *</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-4 h-5 w-5 text-zinc-500" />
                  <textarea
                    required
                    value={formData.bank_details}
                    onChange={(e) => setFormData({ ...formData, bank_details: e.target.value })}
                    placeholder="Indique o seu IBAN para recebimento de prémios"
                    rows={3}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 pl-12 text-white outline-none focus:border-emerald-500 transition-colors resize-none"
                  />
                </div>
              </div>

              {/* BI Photo Upload */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">Foto do BI *</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e, 'bi')}
                  accept="image/*"
                  className="hidden"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all ${
                    formData.bi_photo_url ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-black/20 hover:border-emerald-500/50 hover:bg-black/40'
                  }`}
                >
                  {formData.bi_photo_url ? (
                    <>
                      <img src={formData.bi_photo_url} alt="BI" className="h-full w-full object-cover opacity-50 transition-opacity group-hover:opacity-30" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Camera className="mb-2 h-8 w-8 text-emerald-500" />
                        <span className="text-xs font-bold text-white">Alterar Foto do BI</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {uploading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                      ) : (
                        <>
                          <Camera className="mb-2 h-8 w-8 text-zinc-500 transition-colors group-hover:text-emerald-500" />
                          <span className="text-xs font-bold text-zinc-500 transition-colors group-hover:text-white">Carregar Foto do BI</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div className={`mt-8 rounded-2xl p-4 text-center text-sm font-bold ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
            }`}>
              {message.text}
            </div>
          )}

          <div className="mt-12 flex justify-center">
            <button
              type="submit"
              disabled={loading || uploading}
              className="group flex items-center gap-3 rounded-2xl bg-emerald-600 px-12 py-4 text-lg font-black transition-all hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  Guardar Alterações
                  <Save className="h-6 w-6" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
