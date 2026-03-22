import React, { useState, useRef } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { DollarSign, Upload, CheckCircle2, Loader2, AlertCircle, Info, Landmark, Smartphone, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import BackButton from '@/src/components/BackButton';

export default function Deposit() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Garantir identificação do usuário e perfil completo
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
      }

      const isProfileComplete = 
        profile?.full_name && 
        profile?.phone && 
        profile?.address && 
        profile?.nif && 
        profile?.bank_details && 
        profile?.bi_photo_url;

      if (!isProfileComplete) {
        navigate('/perfil');
        return;
      }

      if (!file) {
        throw new Error('Por favor, selecione uma foto do comprovativo.');
      }

      // 2. Upload da foto para o Bucket 'comprovativos'
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('comprovativos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Gerar URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('comprovativos')
        .getPublicUrl(filePath);

      // 4. Salvar registro na tabela depositos
      const { error: depositError } = await supabase
        .from('depositos')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          receipt_url: publicUrl,
          status: 'pending'
        });

      if (depositError) throw depositError;
      setSuccess(true);
    } catch (err: any) {
      console.error('Erro no depósito:', err);
      setError(err.message || 'Ocorreu um erro ao processar o depósito.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-[2.5rem] border border-white/10 bg-zinc-900 p-10 text-center shadow-2xl"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h2 className="mb-4 text-3xl font-black text-white">Depósito Enviado!</h2>
          <p className="mb-8 text-zinc-400">
            O seu comprovativo foi enviado com sucesso. O saldo será creditado assim que um administrador aprovar o depósito.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white hover:bg-emerald-500 transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <BackButton />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2.5rem] border border-white/10 bg-zinc-900 p-10 shadow-2xl"
      >
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <DollarSign className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-4xl font-black tracking-tighter text-white">Efetuar Depósito</h1>
          <p className="text-zinc-500">Carregue o seu saldo de forma rápida e segura.</p>
        </div>

        {/* Informações Bancárias */}
        <div className="mb-10 rounded-[2rem] bg-white p-8 shadow-xl">
          <div className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-600">
            <Info className="h-4 w-4" />
            Dados para Transferência
          </div>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Landmark className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-zinc-400">Banco Sol</p>
                <p className="text-lg font-black text-zinc-900">IBAN 004400009104522410153</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-zinc-400">Multicaixa Express</p>
                <p className="text-lg font-black text-zinc-900">+244 935 213 792</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-500">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Valor do Depósito (Kz)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-zinc-500">Kz</span>
              <input
                required
                type="number"
                min="100"
                step="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/50 p-5 pl-12 text-2xl font-black text-white outline-none focus:border-emerald-500 transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Comprovativo de Pagamento</label>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`group relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all ${
                previewUrl ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-black/50 hover:border-emerald-500/50 hover:bg-emerald-500/5'
              }`}
            >
              {previewUrl ? (
                <div className="relative h-full w-full p-4">
                  <img src={previewUrl} alt="Preview" className="mx-auto max-h-[200px] rounded-xl object-contain shadow-lg" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Upload className="h-8 w-8 text-white" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-500 transition-colors">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Clique para enviar a foto</p>
                    <p className="text-xs text-zinc-500">PNG, JPG ou JPEG (Máx. 5MB)</p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 py-5 text-xl font-black text-white transition-all hover:bg-emerald-500 disabled:opacity-50 shadow-lg shadow-emerald-600/20"
          >
            {loading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6" />
                <span>Enviar Comprovativo</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
