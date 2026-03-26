import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileGuardProps {
  children: React.ReactNode;
}

export default function ProfileGuard({ children }: ProfileGuardProps) {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const isProfileComplete = 
    profile?.full_name?.trim() && 
    profile?.phone?.trim() && 
    profile?.address?.trim() && 
    profile?.nif?.trim() && 
    profile?.bank_details?.trim() && 
    profile?.bi_photo_url?.trim();

  if (!profile || !isProfileComplete) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md rounded-[2.5rem] border border-white/10 bg-zinc-900/50 p-10 backdrop-blur-sm"
        >
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <AlertCircle className="h-10 w-10" />
            </div>
          </div>
          
          <h2 className="mb-4 text-3xl font-black tracking-tighter text-white">Perfil Incompleto</h2>
          <p className="mb-8 text-zinc-400">
            Para garantir a segurança das transações e o envio de prémios, é obrigatório completar o seu perfil com todos os dados e a foto do BI.
          </p>
          
          <Link 
            to="/perfil"
            className="inline-block w-full rounded-2xl bg-emerald-600 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-500 text-center"
          >
            Completar Perfil Agora
          </Link>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
