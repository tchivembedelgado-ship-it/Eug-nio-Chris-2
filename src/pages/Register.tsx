import React, { useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Loader2, Mail, Lock, UserPlus, AlertCircle, Phone } from 'lucide-react';
import BackButton from '@/src/components/BackButton';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [registerType, setRegisterType] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const fullPhone = `+244${phone.replace(/\D/g, '')}`;
      const signUpParams = registerType === 'email' 
        ? { email, password } 
        : { phone: fullPhone, password };

      const { data, error } = await supabase.auth.signUp(signUpParams);

      if (error) throw error;

      // Create profile (usually handled by trigger, but manually for safety)
      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email || '',
          phone: data.user.phone || null,
          balance: 0,
          is_admin: false
        });
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-md mb-4">
        <BackButton />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-[2.5rem] border border-white/10 bg-zinc-900 p-10 shadow-2xl"
      >
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-4xl font-black tracking-tighter">Criar Conta</h1>
          <p className="text-zinc-500">Junte-se à maior comunidade de rifas.</p>
        </div>

        {/* Register Type Toggle */}
        <div className="mb-8 flex rounded-2xl bg-black/50 p-1">
          <button
            onClick={() => setRegisterType('email')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold uppercase tracking-widest transition-all ${
              registerType === 'email' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'
            }`}
          >
            Email
          </button>
          <button
            onClick={() => setRegisterType('phone')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold uppercase tracking-widest transition-all ${
              registerType === 'phone' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'
            }`}
          >
            Telefone
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-500"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          {registerType === 'email' ? (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 p-4 pl-12 text-white outline-none focus:border-emerald-500"
                  placeholder="exemplo@email.com"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Número de Telefone (AO)</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-2 border-r border-white/10 pr-3 text-zinc-400">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm font-bold">+244</span>
                </div>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 p-4 pl-24 text-white outline-none focus:border-emerald-500"
                  placeholder="9XX XXX XXX"
                  maxLength={9}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Palavra-passe</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/50 p-4 pl-12 text-white outline-none focus:border-emerald-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 py-4 text-lg font-black transition-all hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
              <>
                <UserPlus className="h-5 w-5" />
                Registar
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-500">
          Já tem uma conta?{' '}
          <Link to="/login" className="font-bold text-emerald-500 hover:underline">
            Entrar
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
