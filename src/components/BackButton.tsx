import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export default function BackButton() {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => navigate(-1)}
      className="mb-6 flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/50 px-4 py-2 text-sm font-medium text-zinc-400 transition-all hover:border-emerald-500/30 hover:bg-zinc-900 hover:text-white"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </motion.button>
  );
}
